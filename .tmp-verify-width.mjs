import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9338;
const APP = "http://localhost:8081/can";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "w-"))}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

async function target() {
  for (let i = 0; i < 80; i++) {
    try {
      const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const p = l.find((t) => t.type === "page");
      if (p?.webSocketDebuggerUrl) return p.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error("no target");
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

const M = `(() => {
  const R = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return {
    top: Math.round(b.top), left: Math.round(b.left), right: Math.round(b.right),
    bottom: Math.round(b.bottom), width: Math.round(b.width), height: Math.round(b.height) }; };
  const sticky = document.querySelector('div.sticky');
  const frame = sticky ? sticky.firstElementChild : null;
  const panel = document.querySelector('[aria-live="polite"]');
  const shown = panel ? panel.getClientRects().length > 0 : false;
  return {
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    frame: R(frame),
    panel: shown ? R(panel) : null,
    panelCentred: shown && frame ? Math.abs((R(panel).left - R(frame).left) - (R(frame).right - R(panel).right)) <= 2 : null,
  };
})()`;

const out = { runs: [], problems: [] };

try {
  const c = new CDP(await target());
  await c.connect();
  await c.send("Page.enable");
  await c.send("Runtime.enable");
  await c.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await c.send("Page.navigate", { url: APP });
  await sleep(8000);

  for (const v of [
    { label: "390x844 (mobile)", width: 390, height: 844, want: 327 },
    { label: "768x1024 (tablet)", width: 768, height: 1024, want: 448 },
    { label: "1010x768 (tablet)", width: 1010, height: 768, want: 448 },
    { label: "1440x900 (desktop)", width: 1440, height: 900, want: 413 },
  ]) {
    await c.send("Emulation.setDeviceMetricsOverride", {
      width: v.width,
      height: v.height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await c.send("Page.navigate", { url: APP });
    for (let i = 0; i < 60; i++) {
      if (
        await c.ev(
          `!!document.querySelector('div.sticky') && !!document.querySelector('img[alt^="CAD-10"]')`,
        )
      )
        break;
      await sleep(250);
    }
    await sleep(5000);

    const t = await c.ev(`(() => {
      const t2 = document.querySelector('div.sticky').parentElement;
      const r = t2.getBoundingClientRect();
      window.scrollTo(0, Math.round(r.top + window.scrollY + 0.5 * (r.height - window.innerHeight)));
      return 1;
    })()`);
    await sleep(500);
    await c.ev(
      `(() => { const b = document.querySelector('button[aria-label^="Inspect "]'); b && b.click(); })()`,
    );
    await sleep(900);
    const m = await c.ev(M);

    out.runs.push({
      viewport: v.label,
      ...m,
      widthDeltaFromExpected: m.panel ? m.panel.width - v.want : null,
    });
    if (m.overflow > 1) out.problems.push(`${v.label}: horizontal overflow ${m.overflow}px`);
    if (!m.panel) out.problems.push(`${v.label}: no panel after inspecting`);
    else if (Math.abs(m.panel.width - v.want) > 3)
      out.problems.push(`${v.label}: panel width ${m.panel.width}, expected ~${v.want}`);
    if (v.width < 1024 && m.panelCentred === false)
      out.problems.push(`${v.label}: sheet not centred`);
  }
} finally {
  const payload = JSON.stringify(out, null, 2);
  writeFileSync(".tmp-verify-width.json", payload);
  console.log(payload);
  try {
    chrome.kill();
  } catch {}
  process.exit(0);
}
