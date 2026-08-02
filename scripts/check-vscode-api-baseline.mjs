import { readFile } from "node:fs/promises";
import { stdout } from "node:process";
import { URL } from "node:url";

const root = new URL("../", import.meta.url);
const [packageJson, packageLock] = await Promise.all([
  readFile(new URL("package.json", root), "utf8").then(JSON.parse),
  readFile(new URL("package-lock.json", root), "utf8").then(JSON.parse),
]);

const engineVersion = packageJson.engines?.vscode;
const typesVersion = packageJson.devDependencies?.["@types/vscode"];
const lockRoot = packageLock.packages?.[""];
const problems = [];

if (engineVersion !== `^${typesVersion}`) {
  problems.push(
    `package.json engines.vscode (${engineVersion}) must equal ^${typesVersion}`,
  );
}

if (lockRoot?.engines?.vscode !== engineVersion) {
  problems.push(
    `package-lock.json engines.vscode (${lockRoot?.engines?.vscode}) must equal ${engineVersion}`,
  );
}

if (lockRoot?.devDependencies?.["@types/vscode"] !== typesVersion) {
  problems.push(
    `package-lock.json @types/vscode (${lockRoot?.devDependencies?.["@types/vscode"]}) must equal ${typesVersion}`,
  );
}

if (problems.length > 0) {
  throw new Error(`VS Code API baseline mismatch:\n- ${problems.join("\n- ")}`);
}

stdout.write(`VS Code API baseline is aligned at ${typesVersion}.\n`);
