import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workspaceDir = path.resolve(__dirname, "..");
const sourceDir = path.resolve(workspaceDir, "..", "carrier-app");
const targetDir = path.resolve(workspaceDir, "www");

const ignoredNames = new Set([".vercel", "README.md", "ENTERPRISE_DISTRIBUTION.md", "vercel.json", ".gitignore"]);

function resetTarget(directory) {
  fs.rmSync(directory, { recursive: true, force: true });
  fs.mkdirSync(directory, { recursive: true });
}

function copyRecursive(source, target) {
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    fs.mkdirSync(target, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      if (ignoredNames.has(entry)) {
        continue;
      }
      copyRecursive(path.join(source, entry), path.join(target, entry));
    }
    return;
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

resetTarget(targetDir);
copyRecursive(sourceDir, targetDir);

const bootstrapPath = path.join(targetDir, "native-bootstrap.js");
fs.writeFileSync(
  bootstrapPath,
  `window.NAAVAL_NATIVE_SHELL = true;
window.NAAVAL_ENTERPRISE_MOBILE = true;
`
);

const indexPath = path.join(targetDir, "index.html");
const indexHtml = fs.readFileSync(indexPath, "utf8");
const patchedHtml = indexHtml.includes("native-bootstrap.js")
  ? indexHtml
  : indexHtml.replace('<script src="./ops-config.js"></script>', '<script src="./native-bootstrap.js"></script>\\n    <script src="./ops-config.js"></script>');
fs.writeFileSync(indexPath, patchedHtml);

console.log(`Prepared Naaval Carrier App web bundle in ${targetDir}`);
