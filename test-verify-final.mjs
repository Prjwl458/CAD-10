import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9340;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Start vite dev server
const vite = spawn("bun", ["run", "dev", "--port", "3001"], {
  stdio: "pipe",
  cwd: "D:/Projects/CAD-10",
  shell: true,
});

// Wait for vite to start
for (let i = 0; i < 40; i++) {
  try {
    const res = await fetch("http://localhost:3001/dashboard");
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
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "qa-final-"))}`,
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

const VIEWPORTS = [
  { w: 320, h: 568, name: "320px (iPhone SE 1st)" },
  { w: 360, h: 800, name: "360px (Android compact)" },
  { w: 375, h: 812, name: "375px (iPhone mini/X)" },
  { w: 390, h: 844, name: "390px (iPhone 12/13/14)" },
  { w: 412, h: 915, name: "412px (Pixel 7)" },
  { w: 430, h: 932, name: "430px (iPhone Pro Max)" },
  { w: 1440, h: 900, name: "1440px (Desktop)" },
];

const ROUTES = [
  "/",
  "/dashboard",
  "/pcm",
  "/can",
  "/maintenance",
  "/help",
  "/team",
  "/login",
];

async function run() {
  let failures = 0;
  try {
    const c = new CDP(await target());
    await c.connect();
    await c.send("Page.enable");
    await c.send("Runtime.enable");

    console.log("=== CHECKING RESPONSIVE LAYOUTS & OVERFLOW ===");
    for (const vp of VIEWPORTS) {
      await c.send("Emulation.setDeviceMetricsOverride", {
        width: vp.w,
        height: vp.h,
        deviceScaleFactor: 2,
        mobile: vp.w < 1024,
      });

      for (const route of ROUTES) {
        await c.send("Page.navigate", { url: `http://localhost:3001${route}` });
        await sleep(600);

        const check = await c.ev(`(() => {
          const docEl = document.documentElement;
          const body = document.body;
          const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
          const clientWidth = docEl.clientWidth;
          const hasHScroll = scrollWidth > clientWidth;

          return {
            scrollWidth,
            clientWidth,
            hasHScroll,
            overflowPixels: scrollWidth - clientWidth,
          };
        })()`);

        const status = check.hasHScroll ? "FAIL" : "PASS";
        if (check.hasHScroll) failures++;

        console.log(
          `[${vp.name}] ${route.padEnd(14)}: ${status} (scrollWidth: ${check.scrollWidth}, clientWidth: ${check.clientWidth}${check.hasHScroll ? `, OVERFLOW: ${check.overflowPixels}px` : ""})`
        );
      }
    }

    console.log("\n=== CHECKING DIRECT MOBILE NAVIGATION (375px) ===");
    await c.send("Emulation.setDeviceMetricsOverride", {
      width: 375,
      height: 812,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await c.send("Page.navigate", { url: `http://localhost:3001/dashboard` });
    await sleep(800);

    const directNav = await c.ev(`(() => {
      const bottomNav = document.querySelector('nav[aria-label="Mobile bottom navigation"]');
      if (!bottomNav) return null;
      const links = Array.from(bottomNav.querySelectorAll('a')).map(a => ({
        text: a.querySelector('span')?.textContent?.trim(),
        href: a.getAttribute('href')
      }));
      const moreBtn = bottomNav.querySelector('button');
      return {
        links,
        moreText: moreBtn?.querySelector('span')?.textContent?.trim()
      };
    })()`);

    console.log("Direct bottom links:", JSON.stringify(directNav.links));
    console.log("More button text:", directNav.moreText);

    // Verify direct links: Dashboard, PCM, Can, Maintenance
    const expectedDirect = [
      { text: "Dashboard", href: "/dashboard" },
      { text: "PCM", href: "/pcm" },
      { text: "Can", href: "/can" },
      { text: "Maint.", href: "/maintenance" },
    ];
    const directMatches = expectedDirect.every((exp, i) => 
      directNav.links[i]?.text === exp.text && directNav.links[i]?.href === exp.href
    );
    console.log("Direct navigation structure:", directMatches ? "PASS" : "FAIL");
    if (!directMatches) failures++;

    console.log("\n=== CHECKING MORE MENU (375px) ===");
    // Tap More button
    await c.ev(`document.querySelector('nav[aria-label="Mobile bottom navigation"] button').click()`);
    await sleep(400);

    const moreMenu = await c.ev(`(() => {
      const menu = document.querySelector('#mobile-more-menu');
      if (!menu) return null;
      const links = Array.from(menu.querySelectorAll('a')).map(a => ({
        text: a.querySelector('span')?.textContent?.trim(),
        href: a.getAttribute('href')
      }));
      const hasDemoToggle = menu.textContent.includes("Demo sensor feed");
      const backdrop = document.querySelector('.bg-black\\\/40');
      return {
        visible: true,
        links,
        hasDemoToggle,
        hasBackdrop: !!backdrop
      };
    })()`);

    console.log("More menu visible:", moreMenu?.visible ? "PASS" : "FAIL");
    console.log("More menu links:", JSON.stringify(moreMenu?.links));
    console.log("More menu has demo feed toggle:", moreMenu?.hasDemoToggle ? "PASS" : "FAIL");
    console.log("More menu has backdrop overlay:", moreMenu?.hasBackdrop ? "PASS" : "FAIL");

    const expectedMore = [
      { text: "Our Team", href: "/team" },
      { text: "Help", href: "/help" },
      { text: "Sign In", href: "/login" },
    ];
    const moreMatches = expectedMore.every((exp, i) => 
      moreMenu?.links[i]?.text === exp.text && moreMenu?.links[i]?.href === exp.href
    );
    console.log("More menu structure:", moreMatches ? "PASS" : "FAIL");
    if (!moreMatches) failures++;

    // Test backdrop click closes More menu
    await c.ev(`document.querySelector('.bg-black\\\/40').click()`);
    await sleep(300);
    const closed = await c.ev(`!document.querySelector('#mobile-more-menu')`);
    console.log("Backdrop click closes More menu:", closed ? "PASS" : "FAIL");
    if (!closed) failures++;

    console.log("\n=== CHECKING REMOVAL OF COOLING, HISTORY, CALCULATORS ===");
    const appShellText = await c.ev(`document.body.innerText`);
    const hasCoolingRef = appShellText.includes("Start chilling") || appShellText.includes("Cooling history");
    console.log("Removed section links absent from Dashboard:", !hasCoolingRef ? "PASS" : "FAIL");
    if (hasCoolingRef) failures++;

    // Check homepage feature cards
    await c.send("Page.navigate", { url: `http://localhost:3001/` });
    await sleep(600);
    const homeText = await c.ev(`document.body.innerText`);
    const hasCalcCard = homeText.includes("Engineering calculators");
    console.log("Calculators card absent from homepage:", !hasCalcCard ? "PASS" : "FAIL");
    if (hasCalcCard) failures++;

    console.log(`\n=== FINAL SUMMARY: ${failures === 0 ? "ALL VERIFICATIONS PASSED SUCCESSFULLY!" : `${failures} FAILURES`} ===`);
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    chrome.kill();
    vite.kill();
    process.exit(failures > 0 ? 1 : 0);
  }
}

run();
