// Checks on the built CSS that don't need a browser.
const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");

const dist = path.join(__dirname, "..", "dist");
const read = (file) => fs.readFileSync(path.join(dist, file), "utf8");

function selectors(css) {
  return [...css.matchAll(/(?:^|[{};])([^{};@]+)\{/g)]
    .map((match) => match[1].trim())
    .filter((selector) => !/^(from|to|\d+%)$/.test(selector));
}

test("11.css has a version banner and no unresolved svg-load()", () => {
  const css = read("11.css");
  expect(css.startsWith("/*! 11.css v")).toBe(true);
  expect(css).not.toContain("svg-load(");
  expect(css).toContain("data:image/svg+xml");
});

test("11.scoped.css scopes every rule to .win11", () => {
  const unscoped = selectors(read("11.scoped.css")).filter((selector) =>
    selector.split(",").some((part) => !part.includes(".win11")),
  );
  expect(unscoped).toEqual([]);
});

test("every component is published on its own", () => {
  const sources = fs
    .readdirSync(path.join(__dirname, "..", "gui"))
    .filter((file) => file.endsWith(".css") && file !== "index.css")
    .map((file) => file.replace(/^_/, ""));

  for (const file of sources) {
    expect(fs.existsSync(path.join(dist, "gui", file)), file).toBe(true);
  }
});

test("components use tokens, not raw colours", () => {
  // Raw colours are allowed in the token file and in the SVG fill arguments
  // that can't take custom properties.
  const gui = path.join(__dirname, "..", "gui");
  const offenders = [];

  for (const file of fs.readdirSync(gui)) {
    if (!file.endsWith(".css") || file === "_tokens.css") continue;

    const lines = fs.readFileSync(path.join(gui, file), "utf8").split("\n");
    lines.forEach((line, index) => {
      // svg-load() calls (and their wrapped `fill=` argument lines) and comments.
      if (/svg-load\(|^\s*fill=|^\s*(\*|\/\*)/.test(line)) return;
      if (/#[0-9a-f]{3,8}\b|rgba?\(/i.test(line)) {
        offenders.push(`${file}:${index + 1}: ${line.trim()}`);
      }
    });
  }

  expect(offenders).toEqual([]);
});
