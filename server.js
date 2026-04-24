#!/usr/bin/env node
// Minimal dependency-free static server for local development.
//
// Run:  node server.js  [port]   (default 5173)
// Then: open http://localhost:5173/

const http = require("http");
const fs   = require("fs");
const path = require("path");
const url  = require("url");

const ROOT = __dirname;
const PORT = parseInt(process.argv[2] || "5173", 10);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".mjs":  "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".ico":  "image/x-icon",
};

function send(res, code, body, headers = {}) {
  res.writeHead(code, {
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  let pathname = decodeURIComponent(url.parse(req.url).pathname);
  if (pathname === "/") pathname = "/index.html";

  const filePath = path.join(ROOT, pathname);
  if (!filePath.startsWith(ROOT)) return send(res, 403, "Forbidden");

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) return send(res, 404, "Not found");
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    fs.readFile(filePath, (e, data) => {
      if (e) return send(res, 500, "Read error");
      send(res, 200, data, { "Content-Type": type });
    });
  });
});

server.listen(PORT, () => {
  console.log(`[BERGSTIEG] serving ${ROOT}`);
  console.log(`[BERGSTIEG] http://localhost:${PORT}/`);
});
