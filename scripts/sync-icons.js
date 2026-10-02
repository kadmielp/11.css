#!/usr/bin/env node
// Copies the Fluent UI System Icons listed in icon/manifest.json from
// node_modules/@fluentui/svg-icons into icon/. The copied SVGs are committed,
// so building 11.css never needs the icon package at runtime.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const iconDir = path.join(root, "icon");
const sourceDir = path.join(
  path.dirname(require.resolve("@fluentui/svg-icons/package.json")),
  "icons",
);
const { icons } = JSON.parse(
  fs.readFileSync(path.join(iconDir, "manifest.json"), "utf8"),
);

const wanted = new Set();
let missing = 0;

for (const [name, size, style] of icons) {
  const file = `${name}_${size}_${style}.svg`;
  const source = path.join(sourceDir, file);

  if (!fs.existsSync(source)) {
    console.error(`missing: ${file}`);
    missing++;
    continue;
  }

  fs.copyFileSync(source, path.join(iconDir, file));
  wanted.add(file);
}

// Remove SVGs that are no longer in the manifest.
for (const file of fs.readdirSync(iconDir)) {
  if (file.endsWith(".svg") && !wanted.has(file)) {
    fs.unlinkSync(path.join(iconDir, file));
    console.log(`removed: ${file}`);
  }
}

console.log(`copied ${wanted.size} icon(s) into icon/`);

if (missing) {
  process.exit(1);
}
