import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import tailwindcss from "tailwindcss";
import tailwindcss_nesting from "tailwindcss/nesting";
import autoprefixer from "autoprefixer";

export default defineConfig({
  plugins: [solid()],
  css: {
    postcss: {
      plugins: [tailwindcss_nesting(), tailwindcss(), autoprefixer()],
    },
  },
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
