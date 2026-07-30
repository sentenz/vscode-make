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
exports.MakefileTaskProvider = void 0;
exports.createMakeTask = createMakeTask;
const path = __importStar(require("node:path"));
const vscode = __importStar(require("vscode"));
function makefileDirectory(uri) {
    return path.dirname(uri.fsPath);
}
function createMakeTask(target, extraArgs = []) {
    const definition = {
        type: 'makefileTarget',
        target: target.name,
        makefile: target.makefileRelativePath,
        ...(extraArgs.length > 0 ? { args: extraArgs } : {}),
    };
    const command = vscode.workspace.getConfiguration('makefileTasks').get('makeCommand', 'make');
    const makefileName = path.basename(target.makefileUri.fsPath);
    const execution = new vscode.ShellExecution(command, ['-f', makefileName, target.name, ...extraArgs], { cwd: makefileDirectory(target.makefileUri) });
    const task = new vscode.Task(definition, target.workspaceFolder, target.name, 'Makefile', execution, []);
    task.detail = target.description;
    task.presentationOptions = {
        reveal: vscode.TaskRevealKind.Always,
        panel: vscode.TaskPanelKind.Shared,
        clear: false,
        focus: false,
        echo: true,
    };
    return task;
}
class MakefileTaskProvider {
    getDocuments;
    constructor(getDocuments) {
        this.getDocuments = getDocuments;
    }
    provideTasks() {
        return this.getDocuments().flatMap((document) => document.targets.map((target) => createMakeTask(target)));
    }
    resolveTask(task) {
        const definition = task.definition;
        if (definition.type !== 'makefileTarget' || !definition.target) {
            return undefined;
        }
        const matchingTarget = this.getDocuments()
            .flatMap((document) => document.targets)
            .find((target) => {
            const sameTarget = target.name === definition.target;
            const sameMakefile = !definition.makefile || target.makefileRelativePath === definition.makefile;
            const scopeFolder = typeof task.scope === 'object' ? task.scope : undefined;
            const sameScope = !scopeFolder || target.workspaceFolder.uri.toString() === scopeFolder.uri.toString();
            return sameTarget && sameMakefile && sameScope;
        });
        if (!matchingTarget) {
            return undefined;
        }
        return createMakeTask(matchingTarget, definition.args ?? []);
    }
}
exports.MakefileTaskProvider = MakefileTaskProvider;
