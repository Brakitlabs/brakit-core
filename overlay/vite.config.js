// Vite configuration for building the Lit-based overlay bundle
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    lib: {
      entry: "src/overlay.ts",
      name: "BrakitOverlay",
      fileName: "overlay",
      formats: ["iife"],
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    minify: "terser",
    sourcemap: false,
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});
