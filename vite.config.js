import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

const devApiTarget = process.env.DEV_SERVER_ORIGIN || "http://127.0.0.1:3001";
const defaultAppBasePath = "/kings-dilemma";

function normalizeAppBasePath(value, fallback = defaultAppBasePath) {
  const raw = typeof value === "string" && value.trim() ? value.trim() : fallback;
  let pathname = raw;

  try {
    pathname = new URL(raw).pathname;
  } catch {
    // Plain path input is expected for local builds.
  }

  pathname = pathname.replace(/\\/g, "/").replace(/\/{2,}/g, "/");

  if (!pathname || pathname === "/" || pathname === "." || pathname === "./") {
    return "";
  }

  if (pathname.startsWith("./")) {
    pathname = pathname.slice(1);
  }

  if (!pathname.startsWith("/")) {
    pathname = `/${pathname}`;
  }

  while (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }

  return pathname === "/" ? "" : pathname;
}

function formatViteBasePath(value) {
  const normalizedBase = normalizeAppBasePath(value);

  return normalizedBase ? `${normalizedBase}/` : "/";
}

const configuredAppBasePath = process.env.VITE_APP_BASE_PATH || process.env.APP_BASE_PATH || defaultAppBasePath;

export default defineConfig(({ command }) => ({
  base: command === "build" ? formatViteBasePath(configuredAppBasePath) : "/",
  plugins: [react()],
  ...(command === "serve"
    ? {
        server: {
          proxy: {
            "/api": {
              target: devApiTarget,
              changeOrigin: true,
            },
          },
        },
      }
    : {}),
}));
