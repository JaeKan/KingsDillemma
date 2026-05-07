import { getDeployStore, getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";
import {
  STORE_KEY,
  STORE_NAME,
  handleAgendaRequest,
  type AgendaStateStore,
} from "../../shared/agenda-api.mts";

declare const Netlify:
  | undefined
  | {
      env: { get: (name: string) => string | undefined };
      context?: { deploy?: { context?: string } };
    };

export default async function agenda(req: Request, context: Context) {
  const deployContext = getDeployContext(context);
  const blobStore =
    deployContext === "production"
      ? getStore(STORE_NAME, { consistency: "strong" })
      : getDeployStore(STORE_NAME, { consistency: "strong" });
  const store: AgendaStateStore = {
    get: () => blobStore.get(STORE_KEY, { type: "json" }),
    set: (state) => blobStore.setJSON(STORE_KEY, state),
  };

  return handleAgendaRequest(
    req,
    {
      cookies: context.cookies,
      deployContext,
      loginCode: getConfiguredLoginCode(),
    },
    store,
  );
}

export const config: Config = {
  path: "/api/agenda",
  method: ["GET", "POST"],
};

function getDeployContext(context: Context) {
  return typeof Netlify !== "undefined" && Netlify.context?.deploy?.context
    ? Netlify.context.deploy.context
    : context.deploy?.context;
}

function getConfiguredLoginCode() {
  return typeof Netlify !== "undefined" ? Netlify.env.get("LOGIN_CODE") : undefined;
}
