#!/usr/bin/env node
// Dev server: rebuilds dist/ when sources change and live-reloads the docs.
const chokidar = require("chokidar");
const http = require("http");
const fs = require("fs");
const path = require("path");

const build = require("./build");

const root = path.join(__dirname, "dist");
const port = Number(process.env.PORT) || 3011;

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".map": "application/json",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const reloadScript =
  '<script>new EventSource("/__reload").onmessage=()=>location.reload()</script>';

const clients = new Set();

function serve(req, res) {
  const { pathname } = new URL(req.url, "http://localhost");

  if (pathname === "/__reload") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(":\n\n");
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }

  let file = path.join(root, decodeURIComponent(pathname));
  if (file !== root && !file.startsWith(root + path.sep)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  fs.stat(file, (err, stat) => {
    if (!err && stat.isDirectory()) file = path.join(file, "index.html");

    fs.readFile(file, (readError, data) => {
      if (readError) {
        res.writeHead(404).end("Not found");
        return;
      }

      const ext = path.extname(file);
      res.writeHead(200, {
        "Content-Type": types[ext] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(ext === ".html" ? data + reloadScript : data);
    });
  });
}

let building = false;
let queued = false;

async function rebuild() {
  if (building) {
    queued = true;
    return;
  }

  building = true;

  try {
    await build();
    for (const client of clients) client.write("data: reload\n\n");
  } catch (error) {
    console.error(error);
  } finally {
    building = false;

    if (queued) {
      queued = false;
      rebuild();
    }
  }
}

rebuild().then(() => {
  chokidar
    .watch(
      ["gui", "icon", "docs"].map((dir) => path.join(__dirname, dir)),
      {
        ignoreInitial: true,
      },
    )
    .on("all", rebuild);

  http.createServer(serve).listen(port, "127.0.0.1", () => {
    console.log(`Serving dist/ on http://localhost:${port}`);
  });
});
