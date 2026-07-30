import * as path from 'node:path';
import * as vscode from 'vscode';
import type { MakefileDocument, MakefileTarget } from './model';
import { parseMakefile } from './parser';

const decoder = new TextDecoder('utf-8');

export class MakefileDiscovery {
  public constructor(private readonly output: vscode.OutputChannel) {}

  public async discover(): Promise<MakefileDocument[]> {
    const folders = vscode.workspace.workspaceFolders ?? [];
    const configuration = vscode.workspace.getConfiguration('makefileTasks');
    const globs = configuration.get<readonly string[]>('fileGlobs', [
      '**/Makefile',
      '**/makefile',
      '**/GNUmakefile'
    ]);
    const exclude = configuration.get<string>('excludeGlob', '**/{.git,node_modules,vendor,.venv,dist,out}/**');
    const documents: MakefileDocument[] = [];

    for (const folder of folders) {
      const files = new Map<string, vscode.Uri>();
      for (const glob of globs) {
        const matches = await vscode.workspace.findFiles(
          new vscode.RelativePattern(folder, glob),
          exclude,
        );
        for (const uri of matches) {
          files.set(uri.toString(), uri);
        }
      }

      for (const uri of [...files.values()].sort((left, right) => left.path.localeCompare(right.path))) {
        try {
          const content = decoder.decode(await vscode.workspace.fs.readFile(uri));
          const parsed = parseMakefile(content);
          if (parsed.length === 0) {
            continue;
          }

          const relativePath = path.posix.relative(folder.uri.path, uri.path) || path.posix.basename(uri.path);
          const targets: MakefileTarget[] = parsed.map((target) => ({
            ...target,
            workspaceFolder: folder,
            makefileUri: uri,
            makefileRelativePath: relativePath,
          }));
          documents.push({ workspaceFolder: folder, uri, relativePath, targets });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.output.appendLine(`Failed to read ${uri.toString()}: ${message}`);
        }
      }
    }

    return documents;
  }
}
