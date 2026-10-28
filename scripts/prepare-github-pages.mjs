import { copyFile, access } from "node:fs/promises";
import { constants } from "node:fs";

const indexPath = new URL("../dist/index.html", import.meta.url);
const fallbackPath = new URL("../dist/404.html", import.meta.url);
await access(indexPath, constants.R_OK);
await copyFile(indexPath, fallbackPath);
console.log("GitHub Pages SPA fallback preparado: dist/404.html");
