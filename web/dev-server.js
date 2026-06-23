import { spawn } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const appDirectory = fileURLToPath(new URL(".", import.meta.url));
const distDirectory = join(appDirectory, "dist");
const port = Number(process.env.WEB_PORT ?? 5173);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

function resolveFile(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, "http://localhost").pathname);
  const requestedPath = normalize(join(distDirectory, pathname));

  if (!requestedPath.startsWith(distDirectory)) {
    return null;
  }

  if (existsSync(requestedPath) && statSync(requestedPath).isFile()) {
    return requestedPath;
  }

  return join(distDirectory, "index.html");
}

const localViteCommand = join(
  appDirectory,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "vite.cmd" : "vite"
);
const workspaceViteCommand = join(
  appDirectory,
  "..",
  "..",
  "node_modules",
  ".bin",
  process.platform === "win32" ? "vite.cmd" : "vite"
);
const viteCommand = existsSync(localViteCommand) ? localViteCommand : workspaceViteCommand;

const builder = spawn(
  viteCommand,
  ["build", "--watch", "--configLoader", "runner"],
  {
    cwd: appDirectory,
    shell: process.platform === "win32",
    stdio: "inherit"
  }
);

const server = createServer((request, response) => {
  const filePath = resolveFile(request.url ?? "/");

  if (!filePath || !existsSync(filePath)) {
    response.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("CycloFest is still building. Refresh in a moment.");
    return;
  }

  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": mimeTypes[extname(filePath)] ?? "application/octet-stream"
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`CycloFest web running at http://localhost:${port}`);
  console.log("Frontend changes rebuild automatically; refresh the browser to view them.");
});

function shutdown() {
  builder.kill();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
