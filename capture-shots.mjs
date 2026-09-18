import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9380;
const DEV_PORT = 3025;
const OUT_DIR = ".tmp-mobile-qa";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ROUTES = ["/", "/dashboard", "/pcm", "/can", "/maintenance", "/help", "/login", "/team"];
const WIDTHS = [320, 360, 390, 430, 1024, 1280, 1440];

const vite = spawn("bun", ["run", "dev", "--port", String(DEV_PORT)], {
  cwd: "D:/Projects/CAD-10",
  shell: true,
  stdio: "ignore",
});

for (let i = 0; i < 60; i++) {
  try {
    const res = await fetch(`http://localhost:${DEV_PORT}/`);
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
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "mobile-qa-"))}`,
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
    mkdirSync(OUT_DIR, { recursive: true });
    const c = new CDP(wsUrl);
    await c.connect();
    await c.send("Page.enable");
    await c.send("Runtime.enable");

    const report = [];
    const isMobile = (w) => w < 1024;

    for (const width of WIDTHS) {
      for (const route of ROUTES) {
        await c.send("Emulation.setDeviceMetricsOverride", {
          width,
          height: 844,
          deviceScaleFactor: 1,
          mobile: isMobile(width),
        });
        await c.send("Page.navigate", { url: `http://localhost:${DEV_PORT}${route}` });
        await sleep(2200);

        const metrics = await c.ev(`(() => {
          const doc = document.documentElement;
          const scrollWidth = doc.scrollWidth;
          const innerWidth = window.innerWidth;
          const offenders = [];
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
          let node = walker.currentNode;
          let count = 0;
          while (node && count < 4000) {
            node = walker.nextNode();
            count += 1;
            if (!node || !(node instanceof HTMLElement)) continue;
            const r = node.getBoundingClientRect();
            if (r.width > innerWidth + 1 && r.left < innerWidth && r.right > innerWidth) {
              const label = node.tagName.toLowerCase()
                + (node.id ? '#' + node.id : '')
                + (typeof node.className === 'string' && node.className ? '.' + node.className.split(/\\s+/).slice(0, 2).join('.') : '');
              offenders.push({ label: label.slice(0, 140), width: Math.round(r.width), right: Math.round(r.right) });
              if (offenders.length >= 8) break;
            }
          }
          return {
            route: window.location.pathname,
            scrollWidth,
            innerWidth,
            overflow: scrollWidth - innerWidth,
            bodyHeight: document.body ? document.body.scrollHeight : 0,
            offenders,
          };
        })()`);

        const slug = route === "/" ? "home" : route.replace("/", "");
        const shot = await c.send("Page.captureScreenshot", { format: "png" });
        writeFileSync(join(OUT_DIR, `${slug}-${width}.png`), Buffer.from(shot.data, "base64"));

        // Bottom-of-page screenshot for long pages.
        await c.ev("window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })");
        await sleep(500);
        const bottom = await c.send("Page.captureScreenshot", { format: "png" });
        writeFileSync(
          join(OUT_DIR, `${slug}-${width}-bottom.png`),
          Buffer.from(bottom.data, "base64"),
        );

        report.push({ width, ...metrics });
        console.log(
          `${route} @ ${width}px overflow=${metrics.overflow}px height=${metrics.bodyHeight}px`,
        );
      }
    }

    writeFileSync(join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));
    console.log("Mobile QA complete. See .tmp-mobile-qa/report.json");
  } catch (err) {
    console.error("QA Error:", err);
    process.exitCode = 1;
  } finally {
    chrome.kill();
    vite.kill();
    process.exit();
  }
}

run();
