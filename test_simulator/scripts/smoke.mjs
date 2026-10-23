#!/usr/bin/env node
// Headless smoke test for the browser simulator.
//
// Starts web_server.py (unless SMOKE_URL points at a running server), loads the page in
// headless Chromium (software WebGL), waits for the Three.js scene to render and the
// Socket.IO connection to come up, presses P (power) and fails on any console error,
// uncaught exception, failed request or HTTP >= 400.
//
//   npm run smoke                       # spawns `python3 web_server.py` on a free port
//   SMOKE_URL=http://127.0.0.1:5000/ npm run smoke
//   PYTHON=.venv/bin/python npm run smoke
//   TV_REMOTE_API_KEY=... npm run smoke   # key is passed to the server and the page
//
// Needs: Python deps from requirements.txt (flask, flask-socketio) and
// `npx playwright install chromium`. three.js and socket.io load from cdnjs.
/* global renderer, socket, tvState -- page globals used inside page.evaluate/waitForFunction callbacks */
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(here, "..");
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 90000);

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function waitForHttp(url, deadline, server) {
  while (Date.now() < deadline) {
    if (server && server.exitCode !== null) throw new Error(`web_server.py exited early (code ${server.exitCode})`);
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`server did not answer at ${url}`);
}

async function main() {
  let url = process.env.SMOKE_URL;
  let server = null;
  let serverLog = "";
  if (!url) {
    const port = await freePort();
    const python = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
    server = spawn(python, ["web_server.py"], {
      cwd: appDir,
      env: { ...process.env, TV_REMOTE_HOST: "127.0.0.1", TV_REMOTE_PORT: String(port), TV_REMOTE_DEBUG: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout.on("data", (d) => (serverLog += d));
    server.stderr.on("data", (d) => (serverLog += d));
    url = `http://127.0.0.1:${port}/`;
  }

  const problems = [];
  let collecting = true;
  let browser = null;
  try {
    browser = await chromium.launch({
      args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
    });
    await waitForHttp(url, Date.now() + 30000, server);
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on("console", (m) => {
      if (collecting && m.type() === "error") problems.push(`console.error: ${m.text()}`);
    });
    page.on("pageerror", (e) => collecting && problems.push(`uncaught: ${e.message}`));
    page.on("requestfailed", (r) => {
      if (collecting) problems.push(`request failed: ${r.url()} (${r.failure()?.errorText})`);
    });
    page.on("response", (r) => {
      if (collecting && r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`);
    });

    // If the server requires an API key, hand it to the page the same way a user would
    const pageUrl = new URL(url);
    if (process.env.TV_REMOTE_API_KEY) pageUrl.searchParams.set("api_key", process.env.TV_REMOTE_API_KEY);
    await page.goto(pageUrl.href, { waitUntil: "load", timeout: TIMEOUT_MS });
    await page.waitForFunction(
      () => typeof renderer !== "undefined" && renderer && renderer.info.render.frame > 3,
      null,
      { timeout: TIMEOUT_MS, polling: 250 },
    );
    await page.waitForFunction(() => typeof socket !== "undefined" && socket && socket.connected, null, {
      timeout: 20000,
      polling: 250,
    });

    // Exercise the TV-on path (screen canvas, IR beam, state update round trip)
    await page.keyboard.press("KeyP");
    await page.waitForFunction(() => typeof tvState !== "undefined" && tvState.last_button, null, {
      timeout: 10000,
      polling: 250,
    });
    await page.waitForTimeout(2000);

    const stats = await page.evaluate(() => ({
      frames: renderer.info.render.frame,
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
      pixelRatio: renderer.getPixelRatio(),
      tvPowered: !!tvState.powered_on,
    }));
    collecting = false;
    await page.close();
    console.log("smoke stats:", JSON.stringify(stats));
  } catch (err) {
    collecting = false;
    problems.push(`smoke step failed: ${err.message}`);
  } finally {
    if (browser) await browser.close();
    if (server) server.kill("SIGTERM");
  }

  if (problems.length) {
    console.error(`smoke FAILED (${problems.length} problem(s)):`);
    for (const p of problems) console.error("  - " + p);
    if (serverLog) console.error("--- server log (tail) ---\n" + serverLog.split("\n").slice(-30).join("\n"));
    process.exit(1);
  }
  console.log("smoke OK: page loaded with no console errors, exceptions or failed requests");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
