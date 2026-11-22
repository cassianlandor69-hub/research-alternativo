import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  compressHTML: true,
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  devToolbar: { enabled: false },
  build: { inlineStylesheets: "auto" },
});
