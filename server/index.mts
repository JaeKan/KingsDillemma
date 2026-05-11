// 로컬 개발: `npm run dev` → 루트 `.env`(run-with-env)만 주입. `MYSQL_USE_DEV_DB=1` + `MYSQL_DEV_*` 일 때 아젠다 스토어는 항상 개발 DB(`MYSQL_URL`/`DATABASE_URL` 미적용). Docker `web`는 `MYSQL_*`·호스트 `mysql`.
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getAuthenticatedHouse,
  handleAgendaRequest,
  resolveAgendaStateRowKey,
  type AgendaStateStore,
} from "../shared/agenda-api.mts";
import { normalizeState } from "../netlify/functions/_shared/agenda-state.mts";
import type { GameState } from "../netlify/functions/_shared/agenda-state.mts";
import { createMysqlAgendaPool } from "./mysql-agenda-store.mts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const assetsDir = path.join(distDir, "assets");
const indexHtmlPath = path.join(distDir, "index.html");
const port = parsePositiveInteger(process.env.PORT, 3000);
const host = process.env.HOST || "0.0.0.0";
const bodyLimitBytes = parsePositiveInteger(process.env.REQUEST_BODY_LIMIT_BYTES, 5 * 1024 * 1024);

const app = express();
const mysqlPool = createMysqlAgendaPool();
const agendaEvents = createAgendaEventHub();

const mysqlAgendaStoreFactory = (rowKey: string): AgendaStateStore => {
  const inner = mysqlPool.createStore(rowKey);

  return {
    get: () => inner.get(),
    set: async (state) => {
      await inner.set(state);
      agendaEvents.broadcast(state, rowKey);
    },
  };
};

app.disable("x-powered-by");
app.set("trust proxy", true);

app.get("/api/agenda/events", async (req: express.Request, res: express.Response) => {
  try {
    const webRequest = await toWebRequest(req);
    const rowKey = resolveAgendaStateRowKey(webRequest.url);
    const store = mysqlAgendaStoreFactory(rowKey);
    const state = normalizeState(await store.get());
    const houseId = getAuthenticatedHouse(webRequest, {}, state);

    if (!houseId) {
      res.status(401).json({ ok: false, error: "Login required." });
      return;
    }

    agendaEvents.connect(req, res, rowKey);
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: "Unexpected server error." });
  }
});

app.all("/api/agenda", async (req: express.Request, res: express.Response) => {
  try {
    const webRequest = await toWebRequest(req);
    const response = await handleAgendaRequest(
      webRequest,
      {
        deployContext: process.env.APP_ENV || process.env.NODE_ENV,
        loginCode: process.env.LOGIN_CODE,
        realtimeUpdatesEnabled: true,
      },
      mysqlAgendaStoreFactory,
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
    setHeaders(res: express.Response, filePath: string) {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      }
    },
  }),
);

app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ ok: false, error: "Not found." });
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    next();
    return;
  }

  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  res.sendFile(indexHtmlPath, (error: any) => {
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
    agendaEvents.closeAll();
    await mysqlPool.close();
    process.exit(0);
  });
}

function createAgendaEventHub() {
  type SseClient = {
    id: number;
    res: express.Response;
    heartbeat: ReturnType<typeof setInterval>;
    rowKey: string;
  };

  const clients = new Set<SseClient>();
  let nextClientId = 1;

  const sendEvent = (client: SseClient, event: string, data: unknown) => {
    try {
      client.res.write(`event: ${event}\n`);
      client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
      removeClient(client);
    }
  };

  const removeClient = (client: SseClient) => {
    clearInterval(client.heartbeat);
    clients.delete(client);
  };

  return {
    connect(req: express.Request, res: express.Response, rowKey: string) {
      res.status(200);
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-store, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();

      const client: SseClient = {
        id: nextClientId,
        res,
        rowKey,
        heartbeat: setInterval(() => {
          res.write(`: heartbeat ${Date.now()}\n\n`);
        }, 25_000),
      };
      nextClientId += 1;
      clients.add(client);
      sendEvent(client, "connected", { ok: true });

      req.on("close", () => {
        removeClient(client);
      });
    },
    broadcast(state: GameState, rowKey: string) {
      const payload = { version: state.version, updatedAt: state.updatedAt };

      for (const client of Array.from(clients)) {
        if (client.rowKey !== rowKey) {
          continue;
        }

        sendEvent(client, "state", payload);
      }
    },
    closeAll() {
      for (const client of Array.from(clients)) {
        removeClient(client);
        client.res.end();
      }
    },
  };
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
    init.body = (await readBody(req)) as any;
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
