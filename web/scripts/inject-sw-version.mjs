import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));
const version = pkg.version;

const templates = [
  {
    src: join(root, "public", "sw.template.js"),
    dest: join(root, "public", "sw.js"),
  },
  {
    src: join(root, "src", "components", "pwa", "cache-version-manager.template.tsx"),
    dest: join(root, "src", "components", "pwa", "cache-version-manager.tsx"),
  },
];

for (const { src, dest } of templates) {
  const content = readFileSync(src, "utf-8");
  writeFileSync(dest, content.replaceAll("__APP_VERSION__", version));
}

console.log(`Injected version ${version} into generated files`);
