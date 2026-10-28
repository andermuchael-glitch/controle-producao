import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages publica este repositório em /controle-producao/.
export default defineConfig({
  plugins: [react()],
  base: "/controle-producao/",
});
