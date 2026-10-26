#!/usr/bin/env node
// Headless checks for the first-person HUD (web_static/js/simulator/fp-hud.js).
//
// Pointer lock is unavailable headless, so walk mode is entered the way a
// lock-free caller would: FP.startWalk() when the movement module provides it,
// otherwise by setting walkMode and emitting FP 'enter' (what controls.js does
// on pointerlockchange).
//
//   npm run test:fp-hud
//   PYTHON=.venv/bin/python npm run test:fp-hud
//   SMOKE_URL=http://127.0.0.1:5000/ npm run test:fp-hud
//   FP_HUD_SHOTS=/tmp/shots npm run test:fp-hud   # save desktop/menu/mobile screenshots
//
// Needs the same setup as `npm run smoke` (Python deps, `npx playwright install chromium`).
/* global FP, renderer, camera, playerPosition:writable, EYE_HEIGHT, axe -- page globals used inside page.evaluate callbacks */
/* global document, getComputedStyle, localStorage, PointerEvent, innerWidth -- browser globals, same reason */
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(here, "..");
const require = createRequire(import.meta.url);
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 90000);
const SHOTS = process.env.FP_HUD_SHOTS || "";
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
    failures.push(`${name}${detail !== undefined ? ` (${JSON.stringify(detail)})` : ""}`);
    console.log(`  FAIL ${name}${detail !== undefined ? `: ${JSON.stringify(detail)}` : ""}`);
  }
}

async function shot(page, name) {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
}

async function openPage(browser, url, contextOptions, problems) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  page.on("console", (m) => m.type() === "error" && problems.push(`console.error: ${m.text()}`));
  page.on("pageerror", (e) => problems.push(`uncaught: ${e.message}`));
  await page.goto(url, { waitUntil: "load", timeout: TIMEOUT_MS });
  await page.waitForFunction(() => typeof renderer !== "undefined" && renderer && renderer.info.render.frame > 3, null, {
    timeout: TIMEOUT_MS,
    polling: 250,
  });
  return { context, page };
}

// Enter walk mode without pointer lock
async function enterWalk(page) {
  await page.evaluate(() => {
    if (FP.startWalk) {
      FP.startWalk();
      return;
    }
    if (!playerPosition) playerPosition = camera.position.clone();
    playerPosition.copy(camera.position);
    walkMode = true; // eslint-disable-line no-undef -- let-global in globals.js
    FP.emit("enter");
  });
  await page.waitForFunction(() => FP.isActive(), null, { timeout: 5000 });
}

// Teleport the player (feet position)
async function moveTo(page, x, feetY, z) {
  await page.evaluate(
    ([x, y, z]) => {
      if (FP.player && FP.player.position) FP.player.position.set(x, y, z);
      else playerPosition.set(x, y + EYE_HEIGHT, z);
    },
    [x, feetY, z],
  );
}

// Poll until `sel` is visible (CSS transitions run slowly under software GL)
const shown = (page, sel, timeout = 4000) =>
  page
    .waitForFunction((s) => {
      const n = document.querySelector(s);
      if (!n) return false;
      const cs = getComputedStyle(n);
      const r = n.getBoundingClientRect();
      return cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity) > 0.9 && r.width > 0 && r.height > 0;
    }, sel, { timeout, polling: 100 })
    .then(() => true, () => false);

const visible = (page, sel) =>
  page.evaluate((s) => {
    const n = document.querySelector(s);
    if (!n) return false;
    const cs = getComputedStyle(n);
    const r = n.getBoundingClientRect();
    return cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity) > 0.05 && r.width > 0 && r.height > 0;
  }, sel);

async function desktopChecks(browser, url, problems) {
  console.log("desktop (1280x720)");
  const { context, page } = await openPage(browser, url, { viewport: { width: 1280, height: 720 } }, problems);
  await page.evaluate(() => localStorage.clear());

  check("FP.hud is defined", await page.evaluate(() => !!(FP.hud && FP.hud.toast && FP.hud.setPrompt && FP.hud.showMenu)));
  check("entry button visible", await page.locator("#btn-walk").isVisible());
  await shot(page, "desktop-orbit-entry");
  check("entry button says Explore the house", /Explore the house/.test(await page.locator("#btn-walk").innerText()));

  await enterWalk(page);
  await page.waitForTimeout(400);
  check("crosshair visible in walk mode", await visible(page, ".fp-crosshair"));
  check("orbit status panel hidden", !(await page.locator("#ui-overlay").isVisible()));
  check("smart-home panel hidden", !(await page.locator("#smart-home-panel").isVisible()));
  check("view buttons hidden", !(await page.locator("#btn-zoom-tv").isVisible()));
  check("first-entry controls card shown", await shown(page, ".fp-onboard.fp-on"));
  await shot(page, "desktop-onboarding");
  await page.evaluate(() => FP.hud.dismissOnboarding());

  await page.evaluate(() => FP.emit("focus", { entry: null, prompt: "Open door" }));
  await page.waitForTimeout(250);
  check("focus shows prompt", await shown(page, ".fp-prompt.fp-on"));
  check("prompt text", (await page.locator(".fp-prompt-text").innerText()) === "Open door");
  check("crosshair expands on focus", await page.evaluate(() => document.querySelector(".fp-crosshair").classList.contains("fp-focus")));

  await moveTo(page, 0, 0, 5);
  await page.waitForFunction(() => FP.hud.zone === "Living room", null, { timeout: 3000 }).catch(() => {});
  check("zone: living room", (await page.evaluate(() => FP.hud.zone)) === "Living room", await page.evaluate(() => FP.hud.zone));
  await moveTo(page, 16, 0, -12);
  await page.waitForFunction(() => FP.hud.zone === "Kitchen", null, { timeout: 3000 }).catch(() => {});
  check("zone: kitchen after moving there", (await page.evaluate(() => FP.hud.zone)) === "Kitchen", await page.evaluate(() => FP.hud.zone));
  check("zone label shows Kitchen", (await page.locator(".fp-zone-name").innerText()).toLowerCase() === "kitchen");
  check(
    "zoneAt covers other areas",
    await page.evaluate(() =>
      [
        [0, 0, 18, "Foyer"],
        [-10, 0, 18, "Garage"],
        [-14, 6.6, -16, "Upstairs"],
        [0, 0, -28, "Backyard"],
        [0, 0, 26, "Front yard"],
        [0, 0, 40, "Street"],
      ].every(([x, y, z, name]) => FP.hud.zoneAt(x, y, z) === name),
    ),
  );

  await page.evaluate(() => {
    FP.hud.toast("Kitchen lights on");
    FP.settings.set("showFps", true);
    FP.emit("focus", { entry: null, prompt: "Open fridge" });
  });
  await page.waitForTimeout(700);
  check("toast shown", await shown(page, ".fp-toast.fp-in"));
  const fpsOk = await page
    .waitForFunction(() => /\d+ FPS/.test(document.querySelector(".fp-fps").textContent), null, { timeout: 5000 })
    .then(() => true, () => false);
  check("FPS counter shown", fpsOk && (await visible(page, ".fp-fps")));
  await shot(page, "desktop-hud");
  await page.evaluate(() => {
    FP.emit("focus", { entry: null, prompt: null });
    FP.settings.set("showFps", false);
  });

  // Pause menu: Esc (no pointer lock) opens it
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  check("Esc opens pause menu", (await page.evaluate(() => FP.hud.isMenuOpen)) && (await page.locator("#fp-menu").isVisible()));
  check("menu has focus", await page.evaluate(() => document.querySelector("#fp-menu").contains(document.activeElement)));
  for (let i = 0; i < 6; i++) await page.keyboard.press("Tab");
  check("Tab stays inside menu", await page.evaluate(() => document.querySelector("#fp-menu").contains(document.activeElement)));
  const keysBefore = await page.evaluate(() => (FP.player ? FP.player.position.z : playerPosition.z));
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(300);
  await page.keyboard.up("KeyW");
  const keysAfter = await page.evaluate(() => (FP.player ? FP.player.position.z : playerPosition.z));
  check("walking keys are ignored while paused", Math.abs(keysAfter - keysBefore) < 1e-6, [keysBefore, keysAfter]);

  await page.getByRole("button", { name: "Settings" }).click();
  const fov = page.locator("#fp-set-fov");
  check("settings view open", await fov.isVisible());
  const fov0 = await page.evaluate(() => FP.settings.get("fov"));
  await fov.focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
  const fov1 = await page.evaluate(() => FP.settings.get("fov"));
  check("FOV slider updates FP.settings", fov1 === fov0 + 5, { fov0, fov1 });
  check("FOV output label updates", (await page.locator('output[for="fp-set-fov"]').innerText()).startsWith(String(fov1)));
  if (!(await page.evaluate(() => !!FP.player))) {
    check("FOV applied to camera (fallback)", (await page.evaluate(() => camera.fov)) === fov1);
  }
  await page.getByRole("switch", { name: "Invert mouse Y" }).check();
  check("Invert Y switch updates FP.settings", await page.evaluate(() => FP.settings.get("invertY") === true));
  await shot(page, "menu-settings");

  // Accessibility audit of the open menu
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const axeMenu = await page.evaluate(async () => {
    const r = await axe.run("#fp-menu", { resultTypes: ["violations"] });
    return r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s)`);
  });
  check("axe-core: no violations in settings menu", axeMenu.length === 0, axeMenu);
  await page.keyboard.press("Escape"); // back to main view
  check("Esc in sub-view goes back", await page.getByRole("button", { name: "Resume", exact: true }).isVisible());
  await page.getByRole("button", { name: "Controls" }).click();
  const axe2 = await page.evaluate(async () => {
    const r = await axe.run("#fp-menu", { resultTypes: ["violations"] });
    return r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s)`);
  });
  check("axe-core: no violations in controls view", axe2.length === 0, axe2);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  check("Esc on main view resumes", !(await page.evaluate(() => FP.hud.isMenuOpen)));
  check("still walking after resume", await page.evaluate(() => FP.isActive()));

  // Exit to overview restores the orbit UI
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Exit to overview" }).click();
  await page.waitForTimeout(300);
  check("exit leaves walk mode", !(await page.evaluate(() => FP.isActive())));
  check("orbit UI restored", (await page.locator("#ui-overlay").isVisible()) && (await page.locator("#btn-walk").isVisible()));
  check("crosshair hidden after exit", !(await visible(page, ".fp-crosshair")));

  // Settings persist across reload
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => typeof FP !== "undefined" && FP.hud, null, { timeout: TIMEOUT_MS });
  check("FOV persisted across reload", (await page.evaluate(() => FP.settings.get("fov"))) === fov1);
  await page.evaluate(() => FP.settings.reset());
  await context.close();
}

async function mobileChecks(browser, url, problems) {
  console.log("mobile (390x844, touch)");
  const { context, page } = await openPage(
    browser,
    url,
    { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 },
    problems,
  );
  await page.evaluate(() => localStorage.clear());
  check("touch device detected", await page.evaluate(() => document.body.classList.contains("fp-touch-mode")));
  check("entry button visible on phone", await page.locator("#btn-walk").isVisible());

  // Until fp-player.js lands, stand in for its virtual input and lock-free walk
  const stubbed = await page.evaluate(() => {
    if (FP.input && FP.startWalk) return false;
    FP.input = { moveX: 0, moveY: 0, looked: [0, 0], lookDelta(dx, dy) { this.looked[0] += dx; this.looked[1] += dy; }, jump() { this.jumped = true; }, setSprint(v) { this.sprint = v; }, setCrouch(v) { this.crouch = v; } };
    FP.startWalk = () => {
      if (!playerPosition) playerPosition = camera.position.clone();
      playerPosition.copy(camera.position);
      walkMode = true; // eslint-disable-line no-undef -- let-global in globals.js
      FP.emit("enter");
    };
    return true;
  });
  if (stubbed) console.log("  (FP.input / FP.startWalk stubbed: movement module not loaded)");

  await page.locator("#btn-walk").tap();
  await page.waitForFunction(() => FP.isActive(), null, { timeout: 5000 });
  await page.waitForTimeout(400);
  check("joystick visible", await shown(page, ".fp-stick", 2000).then((ok) => ok || visible(page, ".fp-stick")));
  check("jump button visible", await page.locator('[data-act="jump"]').isVisible());
  check("pause button visible", await page.locator('[data-act="pause"]').isVisible());

  // Drag the stick up: forward
  const zone = await page.locator(".fp-stick-zone").boundingBox();
  const sx = zone.x + 90;
  const sy = zone.y + zone.height - 100;
  await page.evaluate(
    ([x, y]) => {
      const z = document.querySelector(".fp-stick-zone");
      const ev = (type, cx, cy) => z.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: "touch", clientX: cx, clientY: cy, bubbles: true, cancelable: true }));
      ev("pointerdown", x, y);
      ev("pointermove", x, y - 80);
    },
    [sx, sy],
  );
  const mv = await page.evaluate(() => [FP.input.moveX, FP.input.moveY]);
  check("stick up => moveY forward", mv[1] > 0.9 && Math.abs(mv[0]) < 0.1, mv);
  await shot(page, "mobile-hud");
  await page.evaluate(
    ([x, y]) => document.querySelector(".fp-stick-zone").dispatchEvent(new PointerEvent("pointerup", { pointerId: 7, pointerType: "touch", clientX: x, clientY: y, bubbles: true })),
    [sx, sy],
  );
  check("release => stick centered", (await page.evaluate(() => FP.input.moveY)) === 0);

  if (stubbed) {
    await page.evaluate(() => {
      const z = document.querySelector(".fp-look-zone");
      const ev = (type, cx, cy) => z.dispatchEvent(new PointerEvent(type, { pointerId: 9, pointerType: "touch", clientX: cx, clientY: cy, bubbles: true, cancelable: true }));
      ev("pointerdown", 300, 400);
      ev("pointermove", 330, 390);
      ev("pointerup", 330, 390);
    });
    check("right-side drag => lookDelta", (await page.evaluate(() => FP.input.looked.join(","))) === "30,-10");
    await page.locator('[data-act="sprint"]').tap();
    check("sprint toggle => setSprint(true)", await page.evaluate(() => FP.input.sprint === true));
    await page.locator('[data-act="jump"]').tap();
    check("jump button => jump()", await page.evaluate(() => FP.input.jumped === true));
  }

  await page.locator('[data-act="pause"]').tap();
  await page.waitForTimeout(300);
  check("pause button opens menu", await page.evaluate(() => FP.hud.isMenuOpen));
  check("menu fits phone width", await page.evaluate(() => document.querySelector(".fp-menu-card").getBoundingClientRect().right <= innerWidth));
  await shot(page, "mobile-menu");
  await context.close();
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
    await desktopChecks(browser, url, problems);
    await mobileChecks(browser, url, problems);
  } catch (err) {
    failures.push(`step failed: ${err.message}`);
  } finally {
    if (browser) await browser.close();
    if (server) server.kill("SIGTERM");
  }

  for (const p of problems) failures.push(p);
  if (failures.length) {
    console.error(`fp-hud FAILED (${failures.length} problem(s), ${passed} passed):`);
    for (const f of failures) console.error("  - " + f);
    if (serverLog) console.error("--- server log (tail) ---\n" + serverLog.split("\n").slice(-20).join("\n"));
    process.exit(1);
  }
  console.log(`fp-hud OK: ${passed} checks passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
