import * as path from 'node:path';
import { runTests } from '@vscode/test-electron';

async function main(): Promise<void> {
  const extensionDevelopmentPath = path.resolve(__dirname, '../../..');
  const extensionTestsPath = path.resolve(__dirname, 'suite/index');
  const testWorkspace = path.resolve(extensionDevelopmentPath, 'test/fixtures/workspace');

  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
    launchArgs: [testWorkspace, '--disable-extensions'],
  });
}

void main().catch((error: unknown) => {
  console.error('Extension integration tests failed.', error);
  process.exitCode = 1;
});
