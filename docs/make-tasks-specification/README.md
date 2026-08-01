# Make Tasks Specification

## Status

This document specifies the Makefile annotations recognized by VS Code Make and the observable behavior produced from those annotations.

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are to be interpreted as normative requirements.

## Scope

VS Code Make discovers documented Makefile targets and exposes them through the extension explorer, command palette, and Visual Studio Code task system.

This specification defines:

- documented target discovery;
- target descriptions;
- target categories;
- usage metadata and target inputs;
- generated Visual Studio Code tasks;
- execution semantics;
- workspace and refresh behavior.

This specification does not define GNU Make syntax beyond the subset required to identify targets and their annotations.

## Terminology

### Makefile

A file selected by the extension's configured discovery rules and interpreted as a source of Make targets.

### Target

A Make rule name that can be invoked by passing the name to the configured Make command.

### Documented target

A target associated with a non-empty description using one of the supported description forms.

Only documented targets are exposed by the extension.

### Description

Human-readable text associated with a target and displayed in extension user interfaces.

### Category

A section name associated with subsequent documented targets by a canonical category header.

### Usage metadata

An optional comment that describes arguments accepted after a target name.

### Input

Text supplied when a target is run with arguments. An input can contain positional goals, Make variable assignments, or both.

### Task

A Visual Studio Code task generated from a discovered target or explicitly declared with the `makefileTarget` task type.

## Target model

Each discovered target has the following logical properties:

| Property | Required | Description |
| --- | --- | --- |
| `target` | Yes | The Make target name. |
| `description` | Yes | The documented target description. |
| `makefile` | Yes | The Makefile containing the target. |
| `category` | No | The active category at the target definition. |
| `usage` | No | The usage suffix associated with the target. |
| `args` | No | Arguments supplied for a task execution. |

Implementations MAY retain additional source-location data for navigation and diagnostics.

## Documented target discovery

A target MUST have a description to be included in discovery results.

Two description forms are supported.

### Preceding description

A description comment immediately preceding a rule documents that rule:

```make
## Build the application
build:
	go build ./...
```

The description is `Build the application` and the target is `build`.

The description comment MUST begin with `##`. Leading indentation MAY be present. Whitespace after `##` is not part of the description.

A preceding description applies only to the next eligible target rule. It MUST NOT document an unrelated variable assignment, recipe line, or later rule separated by unrelated content.

### Inline description

A description following a target declaration documents that target:

```make
test: ## Run the test suite
	go test ./...
```

The description is `Run the test suite` and the target is `test`.

The inline description MUST appear on the target declaration line and MUST begin with `##` after the rule separator.

### Description requirements

A discovered description:

- MUST contain non-whitespace text;
- MUST be presented without the `##` marker;
- SHOULD preserve meaningful punctuation and internal whitespace;
- MUST be associated with exactly one discovered target.

When a supported inline description is present, it defines the description for that target.

### Excluded Makefile constructs

The extension MUST NOT expose the following as documented targets solely because they resemble target syntax:

- undocumented helper rules;
- pattern rules such as `build-%`;
- variable assignments;
- recipe lines;
- ordinary comments;
- category headers.

A target that is otherwise valid but has no supported description MUST NOT be listed.

## Usage metadata and inputs

Usage metadata describes the arguments accepted after a target name.

### Syntax

The canonical form is:

```text
# Usage: make <target> <usage-suffix>
```

Example:

```make
# Usage: make secrets-sops-decrypt <files>
#
## Decrypt specified SOPS-encrypted files
secrets-sops-decrypt:
	@for file in $(filter-out $@,$(MAKECMDGOALS)); do \
		sops decrypt "$$file"; \
	done
```

For this target, the usage suffix is `<files>`.

### Association

Usage metadata MUST be associated with the documented target that follows it.

A single conventional spacer comment containing only `#` MAY occur between the usage line and the description.

The target name in the usage metadata SHOULD match the documented target name. Implementations SHOULD ignore malformed usage metadata rather than suppressing an otherwise valid documented target.

Usage metadata without a following documented target MUST NOT create a target.

### Usage suffix

The usage suffix is the portion following `make <target>`.

The suffix MAY describe:

- positional goals;
- required values;
- optional values;
- Make variable assignments;
- a combination of positional goals and variable assignments.

Examples:

```make
# Usage: make secrets-sops-decrypt <files>
```

```make
# Usage: make sast-semgrep-scan SAST_SEMGREP_FILES=<path>
```

```make
# Usage: make secrets-gpg-import [SECRETS_SOPS_UID=<uid>] <key-files>
```

Usage notation is descriptive. Angle brackets and square brackets do not cause the extension to validate the supplied value.

### Presentation

When present, the usage suffix MUST be available to interfaces that explain or request target arguments.

The extension displays usage information in the following contexts:

- the target picker;
- the explorer tooltip;
- Visual Studio Code task detail;
- the **Run Target with Arguments** input prompt.

### Input semantics

Input text is passed to Make after the selected target.

Given the target `secrets-sops-decrypt` and input:

```text
secrets/example.yaml.enc secrets/other.yaml.enc
```

execution is equivalent to:

```sh
make secrets-sops-decrypt secrets/example.yaml.enc secrets/other.yaml.enc
```

Given the target `sast-semgrep-scan` and input:

```text
SAST_SEMGREP_FILES=src
```

execution is equivalent to:

```sh
make sast-semgrep-scan SAST_SEMGREP_FILES=src
```

Inputs MAY combine positional goals and variable assignments.

Quoted input MAY be used to preserve whitespace in one logical argument. For example:

```text
SAST_SEMGREP_FILES="src packages/shared"
```

is equivalent to invoking:

```sh
make sast-semgrep-scan 'SAST_SEMGREP_FILES=src packages/shared'
```

The extension MUST preserve argument ordering after the target name.

The extension MUST NOT interpret Make variable assignments as extension configuration.

## Categories

Categories organize documented targets into named sections.

### Category header grammar

A canonical category header has this structure:

```text
<comment><space><separator-run><space><category><optional-trailing-separators>
```

For Makefiles:

- `<comment>` is `#`;
- `<separator-run>` is one Unicode punctuation or symbol character repeated at least three times;
- `<category>` is non-empty category text;
- optional trailing separators use the same separator character.

Examples:

```make
# ─── Skills Manager ───────────────────────────────────────────────────────
# --- Dependencies ---------------------------------------------------------
# === Test ================================================================
```

Supported separator characters include, but are not limited to:

- `─`;
- `-`;
- `=`;
- `_`;
- `#`.

The visual width of a header is not significant.

### Category validity

A category header MUST:

- begin with `#`;
- contain whitespace between `#` and the leading separator run;
- use at least three repeated separator characters;
- contain non-empty category text after the leading separator run.

The following are ordinary comments and MUST NOT change the active category:

```make
# -- Build
#--- Build
# Notes about build targets
```

### Category lifetime

A valid category applies to each subsequent documented target until another valid category header is encountered.

Example:

```make
# --- Dependencies ---------------------------------------------------------
dependency-install: ## Install dependencies
	npm install

dependency-update: ## Update dependencies
	renovate --platform=local

# === Test ================================================================
test: ## Run the test suite
	npm test
```

The first two targets belong to `Dependencies`; `test` belongs to `Test`.

Undocumented rules do not terminate the active category.

### Uncategorized targets

A documented target with no active category has no category association.

When at least one discovered target has a category, the explorer MUST group targets without a category under **Uncategorized**.

When no discovered target has a category, implementations MAY omit the category grouping level.

### Built-in Visual Studio Code task groups

The following category names map to Visual Studio Code built-in task groups:

| Category | Visual Studio Code task group |
| --- | --- |
| `Build` | Build |
| `Test` | Test |
| `Clean` | Clean |
| `Rebuild` | Rebuild |

Targets in these categories participate in corresponding Visual Studio Code task commands, including **Tasks: Run Build Task** and **Tasks: Run Test Task**.

Other category names remain valid organizational categories but do not map to a built-in task group.

## Visual Studio Code task integration

Every discovered target MUST be available through **Tasks: Run Task**.

A target MAY also be declared explicitly in `.vscode/tasks.json` using the `makefileTarget` task type.

### Task shape

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "makefileTarget",
      "target": "secrets-sops-decrypt",
      "makefile": "Makefile",
      "args": ["secrets/example.yaml.enc", "secrets/other.yaml.enc"]
    }
  ]
}
```

### Task properties

| Property | Required | Description |
| --- | --- | --- |
| `type` | Yes | MUST be `makefileTarget`. |
| `target` | Yes | Target name passed to Make. |
| `makefile` | Yes | Makefile used for execution. |
| `args` | No | Ordered arguments passed after the target. |

`args` MAY contain positional goals, Make variable assignments, or both.

Example with a variable assignment:

```json
{
  "type": "makefileTarget",
  "target": "sast-semgrep-scan",
  "makefile": "Makefile",
  "args": ["SAST_SEMGREP_FILES=src"]
}
```

### Command construction

The logical command order is:

```text
<make-command> <makefile-selection> <target> <args...>
```

The configured Make command MUST be used.

The selected target MUST precede all user-supplied arguments.

Arguments declared in `args` MUST retain their array order.

## User interface behavior

### Explorer

The extension provides a dedicated Makefile view in the Activity Bar.

The explorer MUST present discovered targets and SHOULD expose:

- the target name;
- the description;
- category grouping when applicable;
- usage metadata when present;
- workspace and Makefile grouping when necessary.

Selecting a target follows the configured click behavior. An inline play action executes the target as a Visual Studio Code task.

### Commands

The extension provides these commands:

- **Makefile Tasks: Refresh Targets**;
- **Makefile Tasks: Run Target**;
- **Makefile Tasks: Run Target with Arguments**;
- **Makefile Tasks: Run Target…**;
- **Makefile Tasks: Go to Target Definition**.

Target selection interfaces SHOULD include enough context to distinguish targets with the same name from different Makefiles or workspace folders.

### Navigation

**Go to Target Definition** MUST navigate to the source definition of the selected target when the source remains available.

## Workspace behavior

### Multiple Makefiles

The extension supports more than one discovered Makefile.

When multiple Makefiles are present, targets MUST retain their Makefile association for display, task identity, navigation, and execution.

### Multi-root workspaces

The extension supports multi-root Visual Studio Code workspaces.

Targets MUST retain their workspace-folder association. Interfaces SHOULD group by workspace folder when required to avoid ambiguity.

### Discovery configuration

Makefile discovery is controlled by extension configuration, including:

- discovery globs;
- exclusions;
- sorting;
- the Make command;
- click behavior.

Only files included by the effective discovery configuration are sources of discovered targets.

## Refresh behavior

The extension automatically refreshes target discovery after relevant Makefile changes.

The **Refresh Targets** command MUST request a new discovery pass.

After refresh, removed targets MUST no longer be presented and changed metadata MUST replace stale metadata.

## Error handling

A malformed annotation SHOULD be ignored without preventing discovery of unrelated valid targets.

An unsupported Makefile construct MUST NOT be exposed as a target merely because it contains comment markers resembling supported annotations.

Execution failures from Make are task execution failures and SHOULD be surfaced through normal Visual Studio Code task output and status mechanisms.

## Conformance examples

### Preceding description

Input:

```make
## Build the application
build:
	go build ./...
```

Expected target:

```json
{
  "target": "build",
  "description": "Build the application"
}
```

### Inline description

Input:

```make
test: ## Run the test suite
	go test ./...
```

Expected target:

```json
{
  "target": "test",
  "description": "Run the test suite"
}
```

### Category and usage metadata

Input:

```make
# --- Secrets --------------------------------------------------------------
# Usage: make secrets-gpg-import [SECRETS_SOPS_UID=<uid>] <key-files>
#
## Import GPG keys and optionally set trust for a SOPS UID
secrets-gpg-import:
	# ...
```

Expected target:

```json
{
  "target": "secrets-gpg-import",
  "description": "Import GPG keys and optionally set trust for a SOPS UID",
  "category": "Secrets",
  "usage": "[SECRETS_SOPS_UID=<uid>] <key-files>"
}
```

### Uncategorized target in a categorized Makefile

Input:

```make
help: ## Show available commands
	@echo help

# === Test ================================================================
test: ## Run the test suite
	go test ./...
```

Expected grouping:

```text
Uncategorized
  help
Test
  test
```

### Invalid category header

Input:

```make
# -- Build
build: ## Build the application
	go build ./...
```

Expected result: `build` is discovered without a category because the separator run contains fewer than three characters.

### Excluded targets

Input:

```make
helper:
	@echo helper

build-%: ## Build a named component
	@echo "$*"
```

Expected result: neither rule is exposed. `helper` is undocumented and `build-%` is a pattern rule.

## Compatibility

The README provides the concise user-facing description of these features. This specification is the normative reference for annotation syntax and externally observable behavior.

Changes that alter documented target discovery, category parsing, usage metadata, input handling, or generated task behavior SHOULD update this specification in the same pull request.
