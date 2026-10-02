// Screenshot every live example on the docs page.
const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");

const html = fs.readFileSync(
  path.join(__dirname, "..", "..", "dist", "index.html"),
  "utf8",
);

// Name each example after its section: window-1, button-1, …
const examples = [];
const counts = {};
const sectionPattern = /<section[^>]*\bid="([^"]+)"|class="example"/g;
let section = "intro";

for (const match of html.matchAll(sectionPattern)) {
  if (match[1]) {
    section = match[1];
  } else {
    counts[section] = (counts[section] || 0) + 1;
    examples.push(`${section}-${counts[section]}`);
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto("/index.html");
  // Hide the "Show code" toggles; they are not part of the component.
  await page.addStyleTag({ content: ".example > details { display: none }" });
});

examples.forEach((name, index) => {
  test(name, async ({ page }) => {
    const example = page.locator(".example").nth(index);
    await example.scrollIntoViewIfNeeded();
    await expect(example).toHaveScreenshot(`${name}.png`);
  });
});
