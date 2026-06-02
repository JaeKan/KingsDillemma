export const DEFAULT_APP_BASE_PATH = "/kings-dilemma";

export function normalizeAppBasePath(value: unknown, fallback: string = DEFAULT_APP_BASE_PATH): string {
  const raw = typeof value === "string" && value.trim() ? value.trim() : fallback;
  let pathname = raw;

  try {
    pathname = new URL(raw).pathname;
  } catch {
    // Plain path input is expected for most callers.
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

export function joinAppBasePath(basePath: string, routePath: string): string {
  const normalizedBase = normalizeAppBasePath(basePath, "");
  let normalizedRoute = routePath.trim();

  if (!normalizedRoute) {
    normalizedRoute = "/";
  }

  if (!normalizedRoute.startsWith("/")) {
    normalizedRoute = `/${normalizedRoute}`;
  }

  return normalizedBase ? `${normalizedBase}${normalizedRoute}` : normalizedRoute;
}

export function formatViteBasePath(basePath: string): string {
  const normalizedBase = normalizeAppBasePath(basePath);

  return normalizedBase ? `${normalizedBase}/` : "/";
}

export function isPathInsideAppBase(basePath: string, pathname: string): boolean {
  const normalizedBase = normalizeAppBasePath(basePath, "");

  if (!normalizedBase) {
    return true;
  }

  return pathname === normalizedBase || pathname.startsWith(`${normalizedBase}/`);
}
