import { joinAppBasePath, normalizeAppBasePath } from "../../shared/app-base-path.mts";

type ViteImportMeta = ImportMeta & {
  env?: {
    BASE_URL?: string;
  };
};

function getClientAppBasePath(): string {
  return normalizeAppBasePath((import.meta as ViteImportMeta).env?.BASE_URL);
}

export function resolvePublicAssetPath(publicPath: string): string {
  if (!publicPath.startsWith("/")) {
    return publicPath;
  }

  return joinAppBasePath(getClientAppBasePath(), publicPath);
}
