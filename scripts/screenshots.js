#!/usr/bin/env node
// Renders the README images (docs/*.png) from the built dist/11.css, so they
// always match the current styles. Run `npm run build` first.
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");

const root = path.join(__dirname, "..");
const css = fs.readFileSync(path.join(root, "dist", "11.css"), "utf8");

const windowMarkup = `
<div class="window" style="width: 320px">
  <div class="title-bar">
    <div class="title-bar-text">My First Program</div>
    <div class="title-bar-controls">
      <button aria-label="Minimize"></button>
      <button aria-label="Maximize"></button>
      <button aria-label="Close"></button>
    </div>
  </div>
  <div class="window-body">
    <p>Hello, world!</p>
    <section class="field-row" style="justify-content: flex-end">
      <button class="default">OK</button>
      <button>Cancel</button>
    </section>
  </div>
</div>`;

const controlsMarkup = `
<div class="window" style="width: 420px">
  <div class="title-bar">
    <div class="title-bar-text">Settings</div>
    <div class="title-bar-controls">
      <button aria-label="Minimize"></button>
      <button aria-label="Maximize"></button>
      <button aria-label="Close"></button>
    </div>
  </div>
  <div class="window-body">
    <menu role="tablist">
      <button role="tab" aria-selected="true">General</button>
      <button role="tab">Display</button>
      <button role="tab">Sound</button>
    </menu>
    <fieldset>
      <legend>Preferences</legend>
      <div class="field-row">
        <input type="checkbox" role="switch" id="s1" checked>
        <label for="s1">Dark mode</label>
      </div>
      <div class="field-row">
        <input type="checkbox" id="c1" checked>
        <label for="c1">Show notifications</label>
      </div>
      <div class="field-row">
        <input type="radio" id="r1" name="r" checked>
        <label for="r1">Small</label>
        <input type="radio" id="r2" name="r">
        <label for="r2">Large</label>
      </div>
      <div class="field-row">
        <label for="t1">Name</label>
        <input type="text" id="t1" value="Clippy">
        <select><option>English</option></select>
      </div>
      <div class="field-row">
        <label for="v1">Volume</label>
        <input type="range" id="v1" value="60">
      </div>
      <progress value="65" max="100" style="width: 100%"></progress>
    </fieldset>
    <section class="field-row" style="justify-content: flex-end">
      <button class="default">Apply</button>
      <button>Cancel</button>
    </section>
  </div>
</div>`;

const shots = [
  { file: "window.png", markup: windowMarkup, theme: "light" },
  { file: "window-dark.png", markup: windowMarkup, theme: "dark" },
  { file: "controls.png", markup: controlsMarkup, theme: "light" },
];

async function main() {
  const browser = await chromium.launch({
    channel: process.env.PW_CHANNEL || "chrome",
  });
  const page = await browser.newPage({ deviceScaleFactor: 2 });

  for (const shot of shots) {
    await page.setContent(
      `<!doctype html><html data-theme="${shot.theme}"><head><style>${css}</style>
       <style>body{margin:0;padding:24px;background:transparent}</style></head>
       <body>${shot.markup}</body></html>`,
    );
    // Room for the window shadow around the element.
    const box = await page.locator(".window").boundingBox();
    await page.screenshot({
      path: path.join(root, "docs", shot.file),
      omitBackground: true,
      clip: {
        x: box.x - 16,
        y: box.y - 12,
        width: box.width + 32,
        height: box.height + 32,
      },
    });
    console.log(`docs/${shot.file}`);
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
