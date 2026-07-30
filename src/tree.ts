import * as vscode from 'vscode';
import type { MakefileDocument, MakefileTarget } from './model';

type TreeNode = WorkspaceNode | MakefileNode | TargetNode;

interface WorkspaceNode {
  readonly kind: 'workspace';
  readonly folder: vscode.WorkspaceFolder;
  readonly documents: readonly MakefileDocument[];
}

interface MakefileNode {
  readonly kind: 'makefile';
  readonly document: MakefileDocument;
}

export interface TargetNode {
  readonly kind: 'target';
  readonly target: MakefileTarget;
}

function isTargetNode(value: unknown): value is TargetNode {
  return typeof value === 'object' && value !== null && (value as TargetNode).kind === 'target';
}

export function targetFromArgument(value: unknown): MakefileTarget | undefined {
  if (isTargetNode(value)) {
    return value.target;
  }
  if (typeof value === 'object' && value !== null && 'makefileUri' in value && 'name' in value) {
    return value as MakefileTarget;
  }
  return undefined;
}

export class MakefileTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private readonly changed = new vscode.EventEmitter<TreeNode | undefined | null | void>();
  public readonly onDidChangeTreeData = this.changed.event;

  private documents: readonly MakefileDocument[] = [];

  public setDocuments(documents: readonly MakefileDocument[]): void {
    this.documents = documents;
    this.changed.fire();
  }

  public getDocuments(): readonly MakefileDocument[] {
    return this.documents;
  }

  public getTreeItem(element: TreeNode): vscode.TreeItem {
    if (element.kind === 'workspace') {
      const item = new vscode.TreeItem(element.folder.name, vscode.TreeItemCollapsibleState.Expanded);
      item.iconPath = new vscode.ThemeIcon('root-folder');
      item.contextValue = 'makefileWorkspace';
      return item;
    }

    if (element.kind === 'makefile') {
      const item = new vscode.TreeItem(element.document.relativePath, vscode.TreeItemCollapsibleState.Expanded);
      item.resourceUri = element.document.uri;
      item.iconPath = new vscode.ThemeIcon('symbol-file');
      item.contextValue = 'makefileDocument';
      return item;
    }

    const target = element.target;
    const item = new vscode.TreeItem(target.name, vscode.TreeItemCollapsibleState.None);
    item.description = target.description;
    item.iconPath = new vscode.ThemeIcon('play');
    item.contextValue = 'makefileTarget';
    item.tooltip = new vscode.MarkdownString(
      `**${escapeMarkdown(target.name)}**  \n${escapeMarkdown(target.description)}  \n\`${escapeMarkdown(target.makefileRelativePath)}:${target.line + 1}\``,
    );
    if (vscode.workspace.getConfiguration('makefileTasks').get<boolean>('runOnClick', true)) {
      item.command = {
        command: 'makefileTasks.runTarget',
        title: 'Run Target',
        arguments: [element],
      };
    }
    return item;
  }

  public getChildren(element?: TreeNode): TreeNode[] {
    if (!element) {
      return this.rootNodes();
    }
    if (element.kind === 'workspace') {
      if (element.documents.length === 1) {
        return this.targetNodes(element.documents[0]?.targets ?? []);
      }
      return element.documents.map((document) => ({ kind: 'makefile', document }));
    }
    if (element.kind === 'makefile') {
      return this.targetNodes(element.document.targets);
    }
    return [];
  }

  private rootNodes(): TreeNode[] {
    const folders = new Map<string, { folder: vscode.WorkspaceFolder; documents: MakefileDocument[] }>();
    for (const document of this.documents) {
      const key = document.workspaceFolder.uri.toString();
      const entry = folders.get(key) ?? { folder: document.workspaceFolder, documents: [] };
      entry.documents.push(document);
      folders.set(key, entry);
    }

    if (folders.size > 1) {
      return [...folders.values()].map(({ folder, documents }) => ({ kind: 'workspace', folder, documents }));
    }

    const onlyFolder = [...folders.values()][0];
    if (!onlyFolder) {
      return [];
    }
    if (onlyFolder.documents.length > 1) {
      return onlyFolder.documents.map((document) => ({ kind: 'makefile', document }));
    }
    return this.targetNodes(onlyFolder.documents[0]?.targets ?? []);
  }

  private targetNodes(targets: readonly MakefileTarget[]): TargetNode[] {
    const sort = vscode.workspace.getConfiguration('makefileTasks').get<'source' | 'name'>('sort', 'source');
    const ordered = sort === 'name'
      ? [...targets].sort((left, right) => left.name.localeCompare(right.name))
      : [...targets];
    return ordered.map((target) => ({ kind: 'target', target }));
  }
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}\[\]()#+\-.!|>]/g, '\\$&');
}
