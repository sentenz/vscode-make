import * as vscode from 'vscode';
import { codeSpan } from './markdown';
import type { MakefileDocument, MakefileTarget } from './model';

type TreeNode = WorkspaceNode | MakefileNode | CategoryNode | TargetNode;

interface WorkspaceNode {
  readonly kind: 'workspace';
  readonly folder: vscode.WorkspaceFolder;
  readonly documents: readonly MakefileDocument[];
}

interface MakefileNode {
  readonly kind: 'makefile';
  readonly document: MakefileDocument;
}

interface CategoryNode {
  readonly kind: 'category';
  readonly category: string | undefined;
  readonly targets: readonly MakefileTarget[];
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
  private readonly categoryIconPath?: { readonly light: vscode.Uri; readonly dark: vscode.Uri };
  private readonly taskIconPath?: { readonly light: vscode.Uri; readonly dark: vscode.Uri };

  public constructor(extensionUri?: vscode.Uri) {
    if (!extensionUri) {
      return;
    }
    this.categoryIconPath = {
      light: vscode.Uri.joinPath(extensionUri, 'assets', 'category-light.svg'),
      dark: vscode.Uri.joinPath(extensionUri, 'assets', 'category-dark.svg'),
    };
    this.taskIconPath = {
      light: vscode.Uri.joinPath(extensionUri, 'assets', 'task-light.svg'),
      dark: vscode.Uri.joinPath(extensionUri, 'assets', 'task-dark.svg'),
    };
  }

  public setDocuments(documents: readonly MakefileDocument[]): void {
    this.documents = documents;
    this.changed.fire();
  }

  public getDocuments(): readonly MakefileDocument[] {
    return this.documents;
  }

  public getTreeItem(element: TreeNode): vscode.TreeItem {
    if (element.kind === 'workspace') {
      const item = new vscode.TreeItem(element.folder.name, vscode.TreeItemCollapsibleState.Collapsed);
      item.iconPath = new vscode.ThemeIcon('root-folder');
      item.contextValue = 'makefileWorkspace';
      return item;
    }

    if (element.kind === 'makefile') {
      const item = new vscode.TreeItem(element.document.relativePath, vscode.TreeItemCollapsibleState.Collapsed);
      item.resourceUri = element.document.uri;
      item.iconPath = new vscode.ThemeIcon('symbol-file');
      item.contextValue = 'makefileDocument';
      return item;
    }

    if (element.kind === 'category') {
      const label = element.category ?? 'Uncategorized';
      const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Collapsed);
      item.iconPath = this.categoryIconPath ?? new vscode.ThemeIcon('symbol-namespace');
      item.contextValue = 'makefileCategory';
      item.description = `${element.targets.length}`;
      return item;
    }

    const target = element.target;
    const item = new vscode.TreeItem(target.name, vscode.TreeItemCollapsibleState.None);
    item.iconPath = this.taskIconPath ?? new vscode.ThemeIcon('play');
    item.contextValue = 'makefileTarget';
    const usage = target.usage ? `  \nUsage: ${codeSpan(`make ${target.name} ${target.usage}`)}` : '';
    const category = target.category ? `  \nCategory: ${escapeMarkdown(target.category)}` : '';
    item.tooltip = new vscode.MarkdownString(
      `${escapeMarkdown(target.description)}${usage}${category}  \n\`${escapeMarkdown(target.makefileRelativePath)}:${target.line + 1}\``,
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
        return this.contentNodes(element.documents[0]?.targets ?? []);
      }
      return element.documents.map((document) => ({ kind: 'makefile', document }));
    }
    if (element.kind === 'makefile') {
      return this.contentNodes(element.document.targets);
    }
    if (element.kind === 'category') {
      return this.targetNodes(element.targets);
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
    return this.contentNodes(onlyFolder.documents[0]?.targets ?? []);
  }

  private contentNodes(targets: readonly MakefileTarget[]): Array<CategoryNode | TargetNode> {
    if (!targets.some((target) => target.category !== undefined)) {
      return this.targetNodes(targets);
    }

    const groups = new Map<string | undefined, MakefileTarget[]>();
    for (const target of targets) {
      const group = groups.get(target.category) ?? [];
      group.push(target);
      groups.set(target.category, group);
    }

    let entries = [...groups.entries()];
    const sort = vscode.workspace.getConfiguration('makefileTasks').get<'source' | 'name'>('sort', 'source');
    if (sort === 'name') {
      entries = entries.sort(([left], [right]) => (left ?? 'Uncategorized').localeCompare(right ?? 'Uncategorized'));
    }

    return entries.map(([category, groupTargets]) => ({ kind: 'category', category, targets: groupTargets }));
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
  return value.replace(/[\\`*_{}[\]()#+\-.!|>]/g, '\\$&');
}
