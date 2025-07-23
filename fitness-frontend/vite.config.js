import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    publicDir: "public",
    base: "./",
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            ui: ['@mantine/core', '@mantine/hooks'],
            utils: ['axios', 'date-fns'],
          }
        }
      },
      chunkSizeWarningLimit: 1000,
      sourcemap: !isProduction, // Only in development
      minify: isProduction ? 'terser' : false,
      terserOptions: isProduction ? {
        compress: {
          drop_console: true, // Remove console.logs in production
          drop_debugger: true,
        }
      } : undefined,
    },
    server: {
      port: 3000,
      host: 'localhost',  
      open: true,
    },
    preview: {
      port: 4173,
      host: true,
    },
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    }
  };
});
