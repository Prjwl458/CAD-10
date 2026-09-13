import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9375;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const vite = spawn("bun", ["run", "dev", "--port", "3020"], {
  cwd: "D:/Projects/CAD-10",
  shell: true,
  stdio: "ignore",
});

for (let i = 0; i < 40; i++) {
  try {
    const res = await fetch("http://localhost:3020/can");
    if (res.status === 200) break;
  } catch {}
  await sleep(250);
}

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "qa-shots-"))}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

let wsUrl = null;
for (let i = 0; i < 80; i++) {
  try {
    const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    const p = l.find((t) => t.type === "page");
    if (p?.webSocketDebuggerUrl) {
      wsUrl = p.webSocketDebuggerUrl;
      break;
    }
  } catch {}
  await sleep(250);
}

class CDP {
  constructor(u) {
    this.u = u;
    this.id = 0;
    this.p = new Map();
  }
  async connect() {
    this.ws = new WebSocket(this.u);
    await new Promise((res, rej) => {
      this.ws.addEventListener("open", res, { once: true });
      this.ws.addEventListener("error", rej, { once: true });
    });
    this.ws.addEventListener("message", (e) => {
      const m = JSON.parse(typeof e.data === "string" ? e.data : e.data.toString());
      const h = this.p.get(m.id);
      if (h) {
        this.p.delete(m.id);
        m.error ? h.rej(new Error(JSON.stringify(m.error))) : h.res(m.result);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.p.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async ev(expression) {
    const r = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails)
      throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  }
}

async function run() {
  try {
    const c = new CDP(wsUrl);
    await c.connect();
    await c.send("Page.enable");
    await c.send("Runtime.enable");

    await c.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false,
    });

    await c.send("Page.navigate", { url: "http://localhost:3020/can" });
    await sleep(2500);

    // Capture visual clip of the stage
    const pcts = [0.0, 0.10, 0.20, 0.25, 0.26, 0.28, 0.30, 0.32, 0.35, 0.38, 0.40, 0.45, 0.50, 0.60, 0.70, 0.80, 0.90, 1.0];

    for (const pct of pcts) {
      await c.ev(`(() => {
        const divs = Array.from(document.querySelectorAll("div"));
        const track = divs.find(d => typeof d.className === "string" && d.className.includes("420vh"));
        if (track) {
          const rect = track.getBoundingClientRect();
          const currentScrollY = window.scrollY || window.pageYOffset;
          const trackTop = rect.top + currentScrollY;
          const totalScrollable = rect.height - window.innerHeight;
          const targetY = trackTop + ${pct} * totalScrollable;
          window.scrollTo({ top: targetY, behavior: "instant" });
          document.documentElement.scrollTop = targetY;
          window.dispatchEvent(new Event("scroll"));
        }
      })()`);
      await sleep(300);

      // Get clip rect of the aspect-square canvas
      const clip = await c.ev(`(() => {
        const canvas = document.querySelector(".aspect-square");
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        return {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          scale: 2
        };
      })()`);

      if (clip) {
        const shot = await c.send("Page.captureScreenshot", {
          format: "png",
          clip: {
            x: clip.x,
            y: clip.y,
            width: clip.width,
            height: clip.height,
            scale: clip.scale
          }
        });
        const pctStr = String(Math.round(pct * 100)).padStart(3, "0");
        writeFileSync(`scratch-shot-${pctStr}.png`, Buffer.from(shot.data, "base64"));
        console.log(`Captured scratch-shot-${pctStr}.png`);
      }
    }

    console.log("All screenshots captured successfully.");
  } catch (err) {
    console.error("Capture Error:", err);
  } finally {
    chrome.kill();
    vite.kill();
    process.exit(0);
  }
}

run();
