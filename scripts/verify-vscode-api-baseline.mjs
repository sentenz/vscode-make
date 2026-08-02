// SPDX-License-Identifier: Apache-2.0

import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const packageLock = JSON.parse(await readFile("package-lock.json", "utf8"));

const typingsVersion = packageJson.devDependencies?.["@types/vscode"];
const engineRange = packageJson.engines?.vscode;

if (!/^\d+\.\d+\.\d+$/.test(typingsVersion ?? "")) {
  throw new Error(
    `@types/vscode must be pinned to an exact version; received ${JSON.stringify(typingsVersion)}`,
  );
}

const expectedEngineRange = `^${typingsVersion}`;
if (engineRange !== expectedEngineRange) {
  throw new Error(
    `engines.vscode (${JSON.stringify(engineRange)}) must equal ${JSON.stringify(expectedEngineRange)} to match @types/vscode`,
  );
}

const lockEngineRange = packageLock.packages?.[""]?.engines?.vscode;
if (lockEngineRange !== engineRange) {
  throw new Error(
    `package-lock.json engines.vscode (${JSON.stringify(lockEngineRange)}) must match package.json (${JSON.stringify(engineRange)})`,
  );
}
