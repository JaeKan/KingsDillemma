import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleAgendaRequest } from "../shared/agenda-api.mts";
import { createMysqlAgendaStore } from "./mysql-agenda-store.mts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const assetsDir = path.join(distDir, "assets");
const indexHtmlPath = path.join(distDir, "index.html");
const port = parsePositiveInteger(process.env.PORT, 3000);
const host = process.env.HOST || "0.0.0.0";
const bodyLimitBytes = parsePositiveInteger(process.env.REQUEST_BODY_LIMIT_BYTES, 1_048_576);

const app = express();
const store = createMysqlAgendaStore();

app.disable("x-powered-by");
app.set("trust proxy", true);

app.all("/api/agenda", async (req, res) => {
  try {
    const response = await handleAgendaRequest(
      await toWebRequest(req),
      {
        deployContext: process.env.APP_ENV || process.env.NODE_ENV,
        loginCode: process.env.LOGIN_CODE,
      },
      store,
    );

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    const status = message === "Request body too large." ? 413 : 500;
    console.error(error);
    res.status(status).json({ ok: false, error: status === 413 ? message : "Unexpected server error." });
  }
});

app.use(
  "/assets",
  express.static(assetsDir, {
    immutable: true,
    maxAge: "1y",
  }),
);

app.use(
  express.static(distDir, {
    index: false,
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      }
    },
  }),
);

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ ok: false, error: "Not found." });
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    next();
    return;
  }

  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  res.sendFile(indexHtmlPath, (error) => {
    if (error) {
      next(error);
    }
  });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);

  if (!res.headersSent) {
    res.status(500).json({ ok: false, error: "Unexpected server error." });
  }
});

const server = app.listen(port, host, () => {
  console.log(`Kings Dilemma server listening on http://${host}:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    server.close();
    await store.close();
    process.exit(0);
  });
}

async function toWebRequest(req: express.Request) {
  const protocol = getRequestProtocol(req);
  const requestHost = req.get("host") || `127.0.0.1:${port}`;
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
    } else if (typeof value === "string") {
      headers.set(key, value);
    }
  }

  const init: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await readBody(req);
  }

  return new Request(`${protocol}://${requestHost}${req.originalUrl}`, init);
}

function getRequestProtocol(req: express.Request) {
  const forwardedProto = req.headers["x-forwarded-proto"];

  if (typeof forwardedProto === "string" && forwardedProto.trim()) {
    return forwardedProto.split(",")[0].trim();
  }

  if (Array.isArray(forwardedProto) && forwardedProto[0]) {
    return forwardedProto[0].split(",")[0].trim();
  }

  return req.protocol || "http";
}

function readBody(req: express.Request) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;

    req.on("data", (chunk: Buffer) => {
      size += chunk.length;

      if (size > bodyLimitBytes) {
        reject(new Error("Request body too large."));
        req.destroy();
        return;
      }

      chunks.push(chunk);
    });
    req.on("error", reject);
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
