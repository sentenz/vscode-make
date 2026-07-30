"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MakefileTreeProvider = void 0;
exports.targetFromArgument = targetFromArgument;
const vscode = __importStar(require("vscode"));
function isTargetNode(value) {
    return typeof value === 'object' && value !== null && value.kind === 'target';
}
function targetFromArgument(value) {
    if (isTargetNode(value)) {
        return value.target;
    }
    if (typeof value === 'object' && value !== null && 'makefileUri' in value && 'name' in value) {
        return value;
    }
    return undefined;
}
class MakefileTreeProvider {
    changed = new vscode.EventEmitter();
    onDidChangeTreeData = this.changed.event;
    documents = [];
    setDocuments(documents) {
        this.documents = documents;
        this.changed.fire();
    }
    getDocuments() {
        return this.documents;
    }
    getTreeItem(element) {
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
        item.tooltip = new vscode.MarkdownString(`**${escapeMarkdown(target.name)}**  \n${escapeMarkdown(target.description)}  \n\`${escapeMarkdown(target.makefileRelativePath)}:${target.line + 1}\``);
        if (vscode.workspace.getConfiguration('makefileTasks').get('runOnClick', true)) {
            item.command = {
                command: 'makefileTasks.runTarget',
                title: 'Run Target',
                arguments: [element],
            };
        }
        return item;
    }
    getChildren(element) {
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
    rootNodes() {
        const folders = new Map();
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
    targetNodes(targets) {
        const sort = vscode.workspace.getConfiguration('makefileTasks').get('sort', 'source');
        const ordered = sort === 'name'
            ? [...targets].sort((left, right) => left.name.localeCompare(right.name))
            : [...targets];
        return ordered.map((target) => ({ kind: 'target', target }));
    }
}
exports.MakefileTreeProvider = MakefileTreeProvider;
function escapeMarkdown(value) {
    return value.replace(/[\\`*_{}\[\]()#+\-.!|>]/g, '\\$&');
}
