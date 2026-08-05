# VS Code Make

A native VS Code task explorer for documented Makefile targets.

- [1. Details](#1-details)

## 1. Details

### Prerequisites

- [Node.js](https://nodejs.org/en/download/)
  > Node.js (>=22) is required to build, test, and package the extension.

- [Visual Studio Code](https://code.visualstudio.com/download)
  > Visual Studio Code (>=1.125) is required to run the extension.

### 1.2. Usage

The extension discovers targets marked with `##` comments, presents them in a dedicated Activity Bar view, and registers each target with VS Code's Tasks system.

1. Insights and Details

    - VS Code [Extension Anatomy](https://code.visualstudio.com/api/get-started/extension-anatomy)
      > Anatomy of a VS Code extension, including the structure of the extension folder and the purpose of each file.

    - [Make Tasks Specification](docs/make-tasks-specification.md)
      > The Make Tasks Specification is the normative reference for annotation syntax and externally observable behavior.

    - VS Code [Publisher Marketplace](https://marketplace.visualstudio.com/manage/publishers/sentenz)
      > The publisher page for the extension, including version history, download statistics, and links to the source repository.

2. Usage and Instructions

    - CI/CD

      ```yaml
      uses: .sentez/actions/vscode-extension
      ```

    - Tasks

      ```bash
      make vscode-extension-build
      make vscode-extension-package
      make vscode-extension-publish
      ```

## Target format

A target is included when a description appears immediately before the rule:

```make
## Build the application
build:
	go build ./...
```

Consecutive description lines are joined with spaces, and a rule may declare multiple target names:

```make
## Build both variants.
## Produces release artifacts.
alpha beta:: prerequisites
```

The conventional inline form is also supported:

```make
test: ## Run the test suite
	go test ./...
```

Annotation lines may have leading spaces. Lines beginning with a tab are recipe content and are not treated as annotations.

Discovered target names use the grammar `[A-Za-z0-9][A-Za-z0-9_.-]*`. Undocumented helper rules, pattern rules such as `build-%`, variable assignments, recipes, unsupported target names, and duplicate documented definitions are not listed.

## Usage metadata and input parameters

Optional `# Usage: make <target> ...` metadata may be placed immediately before a documented target. Conventional `#` spacers between the usage line and `##` description are supported:

```make
# Usage: make secrets-sops-decrypt <files>
#
## Decrypt specified SOPS-encrypted files
secrets-sops-decrypt:
	@for file in $(filter-out $@,$(MAKECMDGOALS)); do \
		sops decrypt "$$file"; \
	done
```

The extension associates the usage suffix (`<files>` in this example) with the matching target and displays it in the target picker, explorer tooltip, VS Code task detail, and **Run Target with Arguments** input prompt.

The argument input is passed to `make` after the selected target, so both positional goals and Make variable assignments are supported. For example:

```text
secrets/example.yaml.enc secrets/other.yaml.enc
SAST_SEMGREP_FILES=src
SAST_SEMGREP_FILES="src packages/shared"
```

These execute equivalently to:

```sh
make secrets-sops-decrypt secrets/example.yaml.enc secrets/other.yaml.enc
make sast-semgrep-scan SAST_SEMGREP_FILES=src
make sast-semgrep-scan 'SAST_SEMGREP_FILES=src packages/shared'
```

Usage metadata may describe positional arguments, variable assignments, or both:

```make
# Usage: make secrets-gpg-import [SECRETS_SOPS_UID=<uid>] <key-files>
#
## Import GPG keys and optionally set trust for a SOPS UID
secrets-gpg-import:
	# ...
```

## Categories

Targets can be organized with canonical section comments using this generic schema:

```text
<comment><space><three-or-more-separator-signs><space><category><optional trailing separators>
```

For Makefiles, the comment marker is `#`. The separator is any Unicode punctuation or symbol character repeated at least three times. Optional trailing separators use the same character. This includes separators such as `─`, `-`, `=`, `_`, and `#`. For example:

```make
# ─── Skills Manager ───────────────────────────────────────────────────────
skills-agent-add: ## Provision Agent Skills
	skills add ./skills

skills-agent-update: ## Update Agent Skills
	skills update ./skills

# --- Dependencies ---------------------------------------------------------
dependency-update: ## Update project dependencies
	renovate --platform=local

# === Test ================================================================
test: ## Run the test suite
	go test ./...
```

A category applies to subsequent documented targets until another valid category header is encountered. The visual width of the header is not significant; only the leading run requires three or more repeated separator signs. Headers with fewer than three signs, or without whitespace between `#` and the separator run, are ordinary comments and do not affect categorization.

When at least one target is categorized, the Activity Bar explorer groups targets by category and places targets without a category under **Uncategorized**.

Category-to-task-group matching is case-insensitive. `Build`, `Test`, `Clean`, `Rebuild`, and `Rebuild All` map to VS Code's corresponding built-in task groups, so those targets participate in commands such as **Tasks: Run Build Task** and **Tasks: Run Test Task**.

## Features

- Dedicated Makefile icon in the Activity Bar.
- Tree view grouped by workspace and Makefile when necessary.
- Optional target categories from canonical section comments.
- Optional usage metadata for target input parameters.
- Click or use the inline play button to execute a target as a VS Code task.
- Run targets with positional arguments or Make variable assignments.
- Quick-pick command for keyboard-driven execution.
- Go directly to a target definition.
- Multi-root workspace and multiple-Makefile support.
- Automatic refresh after matching Makefile changes when `makefileTasks.autoRefresh` is enabled.
- Configurable Make command, discovery globs, exclusions, sorting, click behavior, and automatic refresh.

## Commands

- **Makefile Tasks: Refresh Targets**
- **Makefile Tasks: Run Target**
- **Makefile Tasks: Run Target with Arguments**
- **Makefile Tasks: Run Target…**
- **Makefile Tasks: Go to Target Definition**

## Task configuration

Discovered targets appear under **Tasks: Run Task**. They may also be declared in `.vscode/tasks.json` with positional arguments, variable assignments, or both:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "makefileTarget",
      "target": "secrets-sops-decrypt",
      "makefile": "Makefile",
      "args": ["secrets/example.yaml.enc", "secrets/other.yaml.enc"]
    },
    {
      "type": "makefileTarget",
      "target": "sast-semgrep-scan",
      "args": ["SAST_SEMGREP_FILES=src"]
    }
  ]
}
```

Only `target` is required. When `makefile` is omitted, the task provider resolves the first discovered target with that name in the task's workspace scope. Set `makefile` explicitly when the same target name appears in more than one discovered Makefile.

## Refresh behavior

The extension always performs initial discovery, refreshes after `makefileTasks` configuration changes, and supports manual refresh through **Makefile Tasks: Refresh Targets**.

When `makefileTasks.autoRefresh` is enabled, saves to known Makefiles, workspace-folder changes, and file events matching `**/{Makefile,makefile,GNUmakefile,*.mk}` schedule a refresh. Files discovered only through custom globs outside that watcher pattern may require manual refresh after external changes.

## Development

```sh
npm install
npm run check
npm run build
npm run test:integration
```

Press `F5` in VS Code to launch an Extension Development Host. Create an installable VSIX with:

```sh
npm run package
```

## Release validation

`npm run package` invokes VS Code's `vscode:prepublish` lifecycle automatically, so linting, type checking, unit tests, and compilation complete before the VSIX is created. The integration test launches an Extension Development Host against `test/fixtures/workspace`.
