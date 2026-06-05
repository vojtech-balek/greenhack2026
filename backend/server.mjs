import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const frontendDir = join(rootDir, "frontend");
const port = Number.parseInt(process.env.PORT || "3000", 10);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function json(response, statusCode, body) {
  response.writeHead(statusCode, { "content-type": mimeTypes[".json"] });
  response.end(JSON.stringify(body));
}

function resolveStaticPath(urlPath) {
  const cleanPath = urlPath === "/" ? "/index.html" : urlPath;
  const resolvedPath = normalize(join(frontendDir, cleanPath));

  if (!resolvedPath.startsWith(frontendDir)) {
    return null;
  }

  return resolvedPath;
}

async function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const filePath = resolveStaticPath(url.pathname);

  if (!filePath) {
    json(response, 403, { error: "Forbidden" });
    return;
  }

  try {
    const file = await readFile(filePath);
    response.writeHead(200, {
      "content-type": mimeTypes[extname(filePath)] || "application/octet-stream",
    });
    response.end(file);
  } catch {
    json(response, 404, { error: "Not found" });
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === "/api/health") {
    json(response, 200, { ok: true, service: "renovuj.me" });
    return;
  }

  if (url.pathname === "/api/site-status") {
    json(response, 200, { label: "Ready", updatedAt: new Date().toISOString() });
    return;
  }

  await serveStatic(request, response);
});

server.listen(port, () => {
  console.log(`renovuj.me running at http://localhost:${port}`);
});
