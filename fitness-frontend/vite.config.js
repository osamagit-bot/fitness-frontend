import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  publicDir: "public",          // ✅ Good, Vite default (optional)
  base: "./",                   // ✅ Good, required for Netlify to resolve assets
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),  // ✅ Good, for cleaner imports
    },
  },
});
