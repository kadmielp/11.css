#!/usr/bin/env node
const dedent = require("dedent");
const ejs = require("ejs");
const fs = require("fs");
const hljs = require("highlight.js");
const path = require("path");
const postcss = require("postcss");

const { homepage, version } = require("./package.json");

const ROOT = __dirname;
const GUI = path.join(ROOT, "gui");
const DIST = path.join(ROOT, "dist");
const BANNER = `/*! 11.css v${version} - ${homepage} */\n`;

// Selectors that mean "the whole page" become the scope root in 11.scoped.css.
const PAGE_SELECTOR = /^(:root|html|body)\b/;

function plugins({ scoped = false, minify = true } = {}) {
  return [
    require("postcss-import")({ path: [GUI] }),
    (require("postcss-nested").default || require("postcss-nested"))(),
    require("postcss-inline-svg")({ paths: [ROOT] }),
    scoped &&
      require("postcss-prefix-selector")({
        prefix: ".win11",
        transform(prefix, selector, prefixedSelector) {
          if (PAGE_SELECTOR.test(selector)) {
            return selector.replace(PAGE_SELECTOR, prefix);
          }

          // Theme switches (`[data-theme=…]`, `.win11-dark`, `.win11-light`)
          // may sit on the scope root itself or on any ancestor of it.
          const themeSwitch = selector.match(
            /^(\[data-theme[^\]]*\]|\.win11-(?:dark|light))(.*)$/,
          );

          if (themeSwitch) {
            const [, toggle, rest] = themeSwitch;
            return `${toggle} ${prefix}${rest}, ${prefix}${toggle}${rest}, ${prefix} ${toggle}${rest}`;
          }

          return prefixedSelector;
        },
      }),
    require("autoprefixer"),
    minify && require("cssnano")({ preset: "default" }),
  ].filter(Boolean);
}

async function compile(file, outFile, options) {
  const input = BANNER + fs.readFileSync(file, "utf8");
  const result = await postcss(plugins(options)).process(input, {
    from: file,
    to: outFile,
    map: { inline: false },
  });

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, result.css);
  fs.writeFileSync(`${outFile}.map`, result.map.toString());

  for (const warning of result.warnings()) {
    console.warn(`${path.relative(ROOT, file)}: ${warning.toString()}`);
  }
}

async function buildCSS() {
  fs.rmSync(DIST, { recursive: true, force: true });

  const index = path.join(GUI, "index.css");

  await compile(index, path.join(DIST, "11.css"));
  await compile(index, path.join(DIST, "11.scoped.css"), { scoped: true });

  // One file per component. Shared tokens and base styles are published as
  // gui/tokens.css and gui/base.css; per-component users import those first.
  for (const file of fs.readdirSync(GUI)) {
    if (!file.endsWith(".css") || file === "index.css") {
      continue;
    }

    const name = file.replace(/^_/, "");
    await compile(path.join(GUI, file), path.join(DIST, "gui", name));
  }
}

function buildDocs() {
  let id = 0;
  const getNewId = () => ++id;
  const getCurrentId = () => id;

  function example(code) {
    const magicBrackets = /\[\[(.*)\]\]/g;
    const dedented = dedent(code);
    const inline = dedented.replace(magicBrackets, "$1");
    const escaped = hljs.highlight(dedented.replace(magicBrackets, ""), {
      language: "html",
    }).value;

    return `<div class="example">
      ${inline}
      <details>
        <summary>Show code</summary>
        <pre><code>${escaped}</code></pre>
      </details>
    </div>`;
  }

  const docsDir = path.join(ROOT, "docs");

  for (const file of fs.readdirSync(docsDir)) {
    const source = path.join(docsDir, file);

    if (file.endsWith(".ejs")) {
      id = 0;
      const html = ejs.render(fs.readFileSync(source, "utf8"), {
        getNewId,
        getCurrentId,
        example,
        version,
        homepage,
      });
      fs.writeFileSync(path.join(DIST, file.replace(/\.ejs$/, "")), html);
    } else {
      fs.copyFileSync(source, path.join(DIST, file));
    }
  }
}

async function build() {
  const started = Date.now();
  await buildCSS();
  buildDocs();
  console.log(`built dist/ in ${Date.now() - started}ms`);
}

module.exports = build;

if (require.main === module) {
  build().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
