import { getDeployStore, getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";
import {
  STORE_NAME,
  handleAgendaRequest,
  type AgendaStateStoreFactory,
} from "../../shared/agenda-api.mts";
import { createMysqlAgendaPool } from "../../server/mysql-agenda-store.mts";

declare const Netlify:
  | undefined
  | {
      env: { get: (name: string) => string | undefined };
      context?: { deploy?: { context?: string } };
    };

const MYSQL_ENV_NAMES = [
  "MYSQL_URL",
  "DATABASE_URL",
  "MYSQL_HOST",
  "MYSQL_PORT",
  "MYSQL_DATABASE",
  "MYSQL_USER",
  "MYSQL_PASSWORD",
  "MYSQL_CONNECTION_LIMIT",
] as const;

let mysqlPool: ReturnType<typeof createMysqlAgendaPool> | null = null;

export default async function agenda(req: Request, context: Context) {
  const deployContext = getDeployContext(context);
  const storeFactory = getAgendaStoreFactory(deployContext);

  return handleAgendaRequest(
    req,
    {
      cookies: context.cookies,
      deployContext,
      loginCode: getConfiguredLoginCode(),
    },
    storeFactory,
  );
}

export const config: Config = {
  path: "/api/agenda",
  method: ["GET", "POST"],
};

function getAgendaStoreFactory(deployContext: string | undefined): AgendaStateStoreFactory {
  if (isMysqlConfigured()) {
    syncMysqlEnv();
    mysqlPool ??= createMysqlAgendaPool();

    return (rowKey) => mysqlPool!.createStore(rowKey);
  }

  const blobStore =
    deployContext === "production"
      ? getStore(STORE_NAME, { consistency: "strong" })
      : getDeployStore(STORE_NAME, { consistency: "strong" });

  return (rowKey) => ({
    get: () => blobStore.get(rowKey, { type: "json" }),
    set: async (state) => {
      await blobStore.setJSON(rowKey, state);
    },
  });
}

function isMysqlConfigured() {
  return Boolean(getConfiguredEnv("MYSQL_URL") || getConfiguredEnv("DATABASE_URL") || getConfiguredEnv("MYSQL_HOST"));
}

function syncMysqlEnv() {
  for (const name of MYSQL_ENV_NAMES) {
    const value = getConfiguredEnv(name);

    if (value && process.env[name] === undefined) {
      process.env[name] = value;
    }
  }
}

function getDeployContext(context: Context) {
  return typeof Netlify !== "undefined" && Netlify.context?.deploy?.context
    ? Netlify.context.deploy.context
    : context.deploy?.context;
}

function getConfiguredLoginCode() {
  return getConfiguredEnv("LOGIN_CODE");
}

function getConfiguredEnv(name: string) {
  return typeof Netlify !== "undefined" ? Netlify.env.get(name) || process.env[name] : process.env[name];
}
