#!/usr/bin/env node
// Headless checks for first-person movement, collision, doors and atmosphere.
//
//   npm run test:fp
//   PYTHON=.venv/bin/python npm run test:fp
//   SMOKE_URL=http://127.0.0.1:5000/ npm run test:fp
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(here, "..");
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 90000);
const GL_ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];

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
      if ((await fetch(url)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`server did not answer at ${url}`);
}

let passed = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(`${name}${detail !== undefined ? `: ${JSON.stringify(detail)}` : ""}`);
    console.log(`  FAIL ${name}${detail !== undefined ? `: ${JSON.stringify(detail)}` : ""}`);
  }
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
  let browser = null;
  try {
    browser = await chromium.launch({ args: GL_ARGS });
    await waitForHttp(url, Date.now() + 30000, server);
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on("console", (m) => {
      if (m.type() === "error") problems.push(`console.error: ${m.text()}`);
    });
    page.on("pageerror", (e) => problems.push(`uncaught: ${e.message}`));
    await page.goto(url, { waitUntil: "load", timeout: TIMEOUT_MS });
    await page.waitForFunction(() => typeof renderer !== "undefined" && renderer && renderer.info.render.frame > 3, null, {
      timeout: TIMEOUT_MS,
      polling: 250,
    });

    const boot = await page.evaluate(() => ({
      stats: FP.collide && FP.collide.stats,
      doors: (FP.world && FP.world.doors || []).map((d) => d.name),
      interactables: FP.interactables.list.length,
      player: !!FP.player,
      input: !!(FP.input && FP.input.jump && FP.input.lookDelta && FP.input.setSprint && FP.input.setCrouch),
      atmo: FP.atmo && FP.atmo.sun && typeof FP.atmo.sun.alt === "number",
    }));
    console.log("  boot", JSON.stringify(boot));
    check("collision baked", boot.stats && boot.stats.floors > 15 && boot.stats.blockers > 30, boot.stats);
    check("front and garage doors", boot.doors.includes("Front door") && boot.doors.includes("Garage door"), boot.doors);
    check("interactables registered", boot.interactables >= 6, boot.interactables);
    check("player and input", boot.player && boot.input);
    check("day/night clock", boot.atmo === true);

    await page.evaluate(() => FP.startWalk());
    await page.waitForFunction(() => FP.isActive());

    const wall = await page.evaluate(() => {
      FP.player.position.set(18, 0, 2);
      playerYaw = Math.PI / 2;
      FP.input.moveX = 0;
      FP.input.moveY = 1;
      let x = 18;
      for (let i = 0; i < 50; i++) {
        FP.update(0.05);
        x = FP.player.position.x;
      }
      FP.input.moveY = 0;
      return { x, z: FP.player.position.z, blockedPast: FP.collide.blocked(21.95, 2, 0, 1.6, 0.28) };
    });
    check("wall stops forward movement", wall.x > 18.4 && wall.x < 21.9, wall);

    const jump = await page.evaluate(() => {
      FP.player.position.set(0, 0, 6);
      playerYaw = 0;
      FP.input.moveY = 0;
      let peak = FP.player.position.y;
      FP.input.jump();
      for (let i = 0; i < 25; i++) {
        FP.update(0.05);
        if (FP.player.position.y > peak) peak = FP.player.position.y;
      }
      const landed = FP.player.grounded && FP.player.position.y < 0.35;
      return { peak, y: FP.player.position.y, landed };
    });
    check("jump leaves the floor and lands", jump.peak > 0.35 && jump.landed, jump);

    const crouch = await page.evaluate(() => {
      FP.input.setCrouch(true);
      for (let i = 0; i < 20; i++) FP.update(0.05);
      const low = camera.position.y;
      FP.input.setCrouch(false);
      for (let i = 0; i < 20; i++) FP.update(0.05);
      return { low, stand: camera.position.y };
    });
    check("crouch lowers the camera", crouch.low < 1.35 && crouch.stand > 1.45, crouch);

    const stairs = await page.evaluate(() => {
      FP.player.position.set(-20.9, 0, 2.6);
      playerYaw = Math.PI;
      FP.input.setSprint(true);
      FP.input.moveY = 1;
      let peak = 0;
      let last = null;
      for (let i = 0; i < 90; i++) {
        FP.update(0.05);
        last = { x: FP.player.position.x, y: FP.player.position.y, z: FP.player.position.z };
        if (last.y > peak) peak = last.y;
      }
      FP.input.moveY = 0;
      FP.input.setSprint(false);
      return { peak, last };
    });
    check("stairs can be climbed", stairs.peak > 0.5, stairs);

    const door = await page.evaluate(() => {
      const front = FP.world.doors.find((d) => d.name === "Front door");
      if (front.open) front.toggle();
      for (let i = 0; i < 40; i++) FP.update(0.05);
      FP.player.position.set(0, 0, 22.4);
      playerYaw = 0;
      FP.input.moveY = 1;
      for (let i = 0; i < 40; i++) FP.update(0.05);
      const closedZ = FP.player.position.z;
      front.toggle();
      FP.input.moveY = 0;
      for (let i = 0; i < 30; i++) FP.update(0.05);
      FP.player.position.set(0, 0, 22.4);
      FP.input.moveY = 1;
      for (let i = 0; i < 50; i++) FP.update(0.05);
      const openZ = FP.player.position.z;
      FP.input.moveY = 0;
      return { closedZ, openZ, open: front.open, angle: front.angle };
    });
    check("closed front door blocks the way out", door.closedZ < 24.05, door);
    check("open front door lets you through", door.openZ > 25, door);

    const used = await page.evaluate(() => {
      const seen = [];
      const fn = (d) => seen.push(d && d.kind);
      FP.on("use", fn);
      const front = FP.world.doors.find((d) => d.name === "Front door");
      front.toggle();
      window._fanSpeed = 1;
      const fan = FP.interactables.list.find((e) => e.object === window._fanBlades);
      if (fan) fan.onUse(fan);
      FP.off("use", fn);
      return { seen, fan: window._fanSpeed };
    });
    check("using a door and the fan emits events", used.seen.includes("door") && used.seen.includes("fan") && used.fan === 0, used);
  } catch (err) {
    failures.push(`step failed: ${err.message}`);
  } finally {
    if (browser) await browser.close();
    if (server) server.kill("SIGTERM");
  }

  for (const p of problems) failures.push(p);
  if (failures.length) {
    console.error(`fp-immersive FAILED (${failures.length} problem(s), ${passed} passed):`);
    for (const f of failures) console.error("  - " + f);
    if (serverLog) console.error("--- server log (tail) ---\n" + serverLog.split("\n").slice(-30).join("\n"));
    process.exit(1);
  }
  console.log(`fp-immersive OK: ${passed} checks passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
