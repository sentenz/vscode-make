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
exports.MakefileDiscovery = void 0;
const path = __importStar(require("node:path"));
const vscode = __importStar(require("vscode"));
const parser_1 = require("./parser");
const decoder = new TextDecoder('utf-8');
class MakefileDiscovery {
    output;
    constructor(output) {
        this.output = output;
    }
    async discover() {
        const folders = vscode.workspace.workspaceFolders ?? [];
        const configuration = vscode.workspace.getConfiguration('makefileTasks');
        const globs = configuration.get('fileGlobs', [
            '**/Makefile',
            '**/makefile',
            '**/GNUmakefile'
        ]);
        const exclude = configuration.get('excludeGlob', '**/{.git,node_modules,vendor,.venv,dist,out}/**');
        const documents = [];
        for (const folder of folders) {
            const files = new Map();
            for (const glob of globs) {
                const matches = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, glob), exclude);
                for (const uri of matches) {
                    files.set(uri.toString(), uri);
                }
            }
            for (const uri of [...files.values()].sort((left, right) => left.path.localeCompare(right.path))) {
                try {
                    const content = decoder.decode(await vscode.workspace.fs.readFile(uri));
                    const parsed = (0, parser_1.parseMakefile)(content);
                    if (parsed.length === 0) {
                        continue;
                    }
                    const relativePath = path.posix.relative(folder.uri.path, uri.path) || path.posix.basename(uri.path);
                    const targets = parsed.map((target) => ({
                        ...target,
                        workspaceFolder: folder,
                        makefileUri: uri,
                        makefileRelativePath: relativePath,
                    }));
                    documents.push({ workspaceFolder: folder, uri, relativePath, targets });
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    this.output.appendLine(`Failed to read ${uri.toString()}: ${message}`);
                }
            }
        }
        return documents;
    }
}
exports.MakefileDiscovery = MakefileDiscovery;
