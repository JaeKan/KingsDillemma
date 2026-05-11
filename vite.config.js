import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

const devApiTarget = process.env.DEV_SERVER_ORIGIN || "http://127.0.0.1:3001";

export default defineConfig(({ command }) => ({
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
