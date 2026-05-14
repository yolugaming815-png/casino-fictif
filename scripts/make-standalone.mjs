import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "dist");
const index = await readFile(join(dist, "index.html"), "utf8");
const cssPath = index.match(/href="\.\/assets\/([^"]+\.css)"/)?.[1];
const jsPath = index.match(/src="\.\/assets\/([^"]+\.js)"/)?.[1];

if (!cssPath || !jsPath) {
  throw new Error("Impossible de trouver les assets Vite dans dist/index.html");
}

const css = await readFile(join(dist, "assets", cssPath), "utf8");
const js = await readFile(join(dist, "assets", jsPath), "utf8");

const standalone = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Casino fictif</title>
    <style>${css}</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">${js}</script>
  </body>
</html>
`;

await writeFile(join(dist, "standalone.html"), standalone, "utf8");
console.log("dist/standalone.html genere");
