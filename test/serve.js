#!/usr/bin/env node
// Minimal static server for dist/ used by the Playwright tests.
const fs = require("fs");
const http = require("http");
const path = require("path");

const root = path.join(__dirname, "..", "dist");
const port = Number(process.argv[2]) || 3012;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".map": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

http
  .createServer((request, response) => {
    const urlPath = decodeURIComponent(
      new URL(request.url, "http://x").pathname,
    );
    const file = path.join(root, urlPath === "/" ? "index.html" : urlPath);

    if (
      !file.startsWith(root) ||
      !fs.existsSync(file) ||
      fs.statSync(file).isDirectory()
    ) {
      response.writeHead(404).end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
    });
    fs.createReadStream(file).pipe(response);
  })
  .listen(port, () => console.log(`serving dist/ on http://localhost:${port}`));
