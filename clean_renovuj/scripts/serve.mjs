import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { Readable } from "node:stream";

import serverEntry from "../dist/server/server.js";

const port = Number(process.env.PORT || 3000);
const publicDir = resolve("dist/client");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function getStaticFile(url) {
  const pathname = new URL(url, "http://localhost").pathname;
  const decodedPath = decodeURIComponent(pathname);
  const normalizedPath = normalize(decodedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = resolve(join(publicDir, normalizedPath));

  if (filePath !== publicDir && !filePath.startsWith(publicDir + sep)) {
    return null;
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    return null;
  }

  return filePath;
}

function sendWebResponse(res, response) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));

  if (!response.body) {
    res.end();
    return;
  }

  Readable.fromWeb(response.body).pipe(res);
}

createServer(async (req, res) => {
  try {
    const filePath = req.method === "GET" || req.method === "HEAD" ? getStaticFile(req.url ?? "/") : null;
    if (filePath) {
      res.statusCode = 200;
      res.setHeader("content-type", mimeTypes[extname(filePath)] ?? "application/octet-stream");
      res.setHeader("cache-control", filePath.includes(`${sep}assets${sep}`) ? "public, max-age=31536000, immutable" : "public, max-age=0");
      if (req.method === "HEAD") {
        res.end();
      } else {
        createReadStream(filePath).pipe(res);
      }
      return;
    }

    const requestUrl = `http://${req.headers.host ?? `localhost:${port}`}${req.url ?? "/"}`;
    const request = new Request(requestUrl, {
      method: req.method,
      headers: req.headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : Readable.toWeb(req),
      duplex: req.method === "GET" || req.method === "HEAD" ? undefined : "half",
    });

    const response = await serverEntry.fetch(request, process.env, {});
    sendWebResponse(res, response);
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Internal Server Error");
  }
}).listen(port, "0.0.0.0", () => {
  console.log(`Server listening on ${port}`);
});
