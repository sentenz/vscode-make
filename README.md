# Makefile Tasks

A native VS Code task explorer for documented Makefile targets. The extension discovers targets marked with `##` comments, presents them in a dedicated Activity Bar view, and registers each target with VS Code's Tasks system.

## Target format

A target is included when a description appears immediately before the rule:

```make
## Build the application
build:
	go build ./...
```

The conventional inline form is also supported:

```make
test: ## Run the test suite
	go test ./...
```

Undocumented helper rules, pattern rules such as `build-%`, variable assignments, and recipes are not listed.

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

The `Build`, `Test`, `Clean`, and `Rebuild` category names also map to VS Code's corresponding built-in task groups, so those targets participate in commands such as **Tasks: Run Build Task** and **Tasks: Run Test Task**.

## Features

- Dedicated Makefile icon in the Activity Bar.
- Tree view grouped by workspace and Makefile when necessary.
- Optional target categories from canonical section comments.
- Click or use the inline play button to execute a target as a VS Code task.
- Run targets with additional arguments or variable assignments.
- Quick-pick command for keyboard-driven execution.
- Go directly to a target definition.
- Multi-root workspace and multiple-Makefile support.
- Automatic refresh after Makefile changes.
- Configurable Make command, discovery globs, exclusions, sorting, and click behavior.

## Commands

- **Makefile Tasks: Refresh Targets**
- **Makefile Tasks: Run Target**
- **Makefile Tasks: Run Target with Arguments**
- **Makefile Tasks: Run Target…**
- **Makefile Tasks: Go to Target Definition**

## Task configuration

Discovered targets appear under **Tasks: Run Task**. They may also be declared in `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "makefileTarget",
      "target": "build",
      "makefile": "Makefile",
      "args": ["ENV=development"]
    }
  ]
}
```

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
