import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// GitHub Pages project site: https://<user>.github.io/<repo>/
const repo = "sub-converter";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base:
    process.env.VITE_BASE ??
    (process.env.NODE_ENV === "production" ? `/${repo}/` : "/"),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
