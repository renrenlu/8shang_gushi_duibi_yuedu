import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] || "8shang_gushi_duibi_yuedu";
const projectRoot = process.cwd();

export default defineConfig({
  root: resolve(projectRoot, "github-pages"),
  base: `/${repositoryName}/`,
  publicDir: resolve(projectRoot, "public"),
  plugins: [react()],
  build: {
    outDir: resolve(projectRoot, "docs"),
    emptyOutDir: true,
  },
});
