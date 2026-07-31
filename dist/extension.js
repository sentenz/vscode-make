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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const discovery_1 = require("./discovery");
const parser_1 = require("./parser");
const tasks_1 = require("./tasks");
const tree_1 = require("./tree");
function activate(context) {
    const output = vscode.window.createOutputChannel('Makefile Tasks', { log: true });
    const discovery = new discovery_1.MakefileDiscovery(output);
    const treeProvider = new tree_1.MakefileTreeProvider();
    const treeView = vscode.window.createTreeView('makefileTasks.targets', {
        treeDataProvider: treeProvider,
        showCollapseAll: true,
    });
    let refreshTimer;
    const refresh = async () => {
        try {
            const documents = await discovery.discover();
            treeProvider.setDocuments(documents);
            const count = documents.reduce((sum, document) => sum + document.targets.length, 0);
            await vscode.commands.executeCommand('setContext', 'makefileTasks.hasTargets', count > 0);
            treeView.message = count > 0 ? `${count} documented target${count === 1 ? '' : 's'}` : '';
            output.appendLine(`Discovered ${count} documented Makefile target${count === 1 ? '' : 's'}.`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            output.error(`Refresh failed: ${message}`);
            void vscode.window.showErrorMessage(`Makefile Tasks: ${message}`);
        }
    };
    const scheduleRefresh = () => {
        if (!vscode.workspace.getConfiguration('makefileTasks').get('autoRefresh', true)) {
            return;
        }
        if (refreshTimer) {
            clearTimeout(refreshTimer);
        }
        refreshTimer = setTimeout(() => void refresh(), 150);
    };
    const selectTarget = async () => {
        const targets = treeProvider.getDocuments().flatMap((document) => document.targets);
        const sort = vscode.workspace.getConfiguration('makefileTasks').get('sort', 'source');
        const ordered = sort === 'name' ? [...targets].sort((a, b) => a.name.localeCompare(b.name)) : targets;
        const selected = await vscode.window.showQuickPick(ordered.map((target) => ({
            label: `$(play) ${target.name}`,
            description: target.description,
            detail: `${target.workspaceFolder.name}/${target.makefileRelativePath}`,
            target,
        })), { title: 'Run Makefile Target', matchOnDescription: true, matchOnDetail: true });
        return selected?.target;
    };
    const resolveTarget = async (argument) => (0, tree_1.targetFromArgument)(argument) ?? selectTarget();
    const runTarget = async (argument, extraArgs = []) => {
        const target = await resolveTarget(argument);
        if (!target) {
            return;
        }
        await vscode.tasks.executeTask((0, tasks_1.createMakeTask)(target, extraArgs));
    };
    context.subscriptions.push(new vscode.Disposable(() => {
        if (refreshTimer) {
            clearTimeout(refreshTimer);
            refreshTimer = undefined;
        }
    }), output, treeView, vscode.tasks.registerTaskProvider('makefileTarget', new tasks_1.MakefileTaskProvider(() => treeProvider.getDocuments())), vscode.commands.registerCommand('makefileTasks.refresh', refresh), vscode.commands.registerCommand('makefileTasks.runTarget', runTarget), vscode.commands.registerCommand('makefileTasks.runTargetPicker', () => runTarget()), vscode.commands.registerCommand('makefileTasks.runTargetWithArgs', async (argument) => {
        const target = await resolveTarget(argument);
        if (!target) {
            return;
        }
        const input = await vscode.window.showInputBox({
            title: `Run make ${target.name}`,
            prompt: 'Additional make arguments or variable assignments',
            placeHolder: 'ENV=development --jobs 4',
        });
        if (input === undefined) {
            return;
        }
        try {
            await runTarget(target, (0, parser_1.splitArguments)(input));
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`Makefile Tasks: ${message}`);
        }
    }), vscode.commands.registerCommand('makefileTasks.openTarget', async (argument) => {
        const target = await resolveTarget(argument);
        if (!target) {
            return;
        }
        const document = await vscode.workspace.openTextDocument(target.makefileUri);
        const editor = await vscode.window.showTextDocument(document);
        const position = new vscode.Position(target.line, 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    }), vscode.workspace.onDidSaveTextDocument((document) => {
        const known = treeProvider.getDocuments().some((item) => item.uri.toString() === document.uri.toString());
        if (known) {
            scheduleRefresh();
        }
    }), vscode.workspace.onDidChangeWorkspaceFolders(scheduleRefresh), vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('makefileTasks')) {
            treeProvider.setDocuments(treeProvider.getDocuments());
            void refresh();
        }
    }));
    const watcher = vscode.workspace.createFileSystemWatcher('**/{Makefile,makefile,GNUmakefile,*.mk}');
    watcher.onDidChange(scheduleRefresh, undefined, context.subscriptions);
    watcher.onDidCreate(scheduleRefresh, undefined, context.subscriptions);
    watcher.onDidDelete(scheduleRefresh, undefined, context.subscriptions);
    context.subscriptions.push(watcher);
    void refresh();
}
function deactivate() { }
