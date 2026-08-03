import * as assert from 'node:assert/strict';
import * as vscode from 'vscode';

suite('Makefile Tasks extension', () => {
  test('activates and contributes documented Makefile tasks', async () => {
    const extension = vscode.extensions.getExtension('sentenz.makefile-task');
    assert.ok(extension, 'Extension should be available in the development host.');

    await extension.activate();
    await vscode.commands.executeCommand('makefileTasks.refresh');

    const tasks = await vscode.tasks.fetchTasks({ type: 'makefileTarget' });
    assert.ok(tasks.some((task) => task.name === 'build'), 'Expected the documented build target.');
  });

  test('registers the public commands declared by the manifest', async () => {
    const commands = new Set(await vscode.commands.getCommands(true));
    for (const command of [
      'makefileTasks.refresh',
      'makefileTasks.runTarget',
      'makefileTasks.runTargetWithArgs',
      'makefileTasks.runTargetPicker',
      'makefileTasks.openTarget',
    ]) {
      assert.ok(commands.has(command), `Expected command ${command} to be registered.`);
    }
  });
});
