# Make Tasks Specification

## Status

This document specifies the Makefile annotations recognized by VS Code Make and the observable behavior produced from those annotations.

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are to be interpreted as normative requirements.

## Scope

VS Code Make discovers documented Makefile targets and exposes them through the extension explorer, command palette, and Visual Studio Code task system.

This specification defines:

- documented target discovery;
- target descriptions and target-name grammar;
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

A concrete rule name accepted by the extension's target-name grammar.

### Documented target

A target associated with a non-empty description using one of the supported description forms.

Only documented targets are exposed by the extension.

### Description

Human-readable text associated with one or more target names declared by a documented rule and displayed in extension user interfaces.

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
| `target` | Yes | The discovered target name. |
| `description` | Yes | The documented target description. |
| `makefile` | Yes | The Makefile containing the target. |
| `category` | No | The active category at the target definition. |
| `usage` | No | The usage suffix associated with the target. |
| `args` | No | Arguments supplied for a task execution. |

Implementations MAY retain additional source-location data for navigation and diagnostics.

### Target-name grammar

A discovered target name MUST match:

```text
[A-Za-z0-9][A-Za-z0-9_.-]*
```

A rule MAY declare more than one target name separated by spaces or tabs:

```make
## Build both variants
alpha beta:: prerequisites
```

The rule above produces the documented targets `alpha` and `beta`, each with the same description.

The parser retains only the first discovered occurrence of each target name. A later documented rule with an already discovered name MUST NOT produce a duplicate target.

## Metadata indentation

Annotation lines MAY have leading spaces.

A line beginning with a tab is treated as recipe content and MUST NOT be interpreted as a description, usage annotation, category header, or target declaration.

## Documented target discovery

A target MUST have a non-empty description to be included in discovery results.

Two description forms are supported.

### Preceding description

A description comment immediately preceding a rule documents that rule:

```make
## Build the application
build:
	go build ./...
```

The description is `Build the application` and the target is `build`.

A preceding description comment MUST begin with `##` after any leading spaces. The marker and surrounding outer whitespace are not part of the description.

Consecutive preceding description comments are joined with a single space:

```make
## Build the application.
## Produces release artifacts.
build:
```

The resulting description is `Build the application. Produces release artifacts.` Empty `##` lines do not contribute text.

A preceding description applies only to the immediately following eligible rule. An unrelated variable assignment, ordinary comment, blank line, recipe line, or other Makefile construct invalidates the pending description.

### Inline description

A description following a target declaration documents that rule:

```make
test: ## Run the test suite
	go test ./...
```

The inline marker MUST begin with `##`, MUST be preceded by the rule separator or whitespace, and MUST contain non-whitespace text. It may follow prerequisites:

```make
test: dependencies ## Run the test suite
```

When an inline description is present, it takes precedence over any pending preceding description.

### Description requirements

A discovered description:

- MUST contain non-whitespace text;
- MUST be presented without the `##` marker;
- SHOULD preserve meaningful punctuation and internal whitespace;
- MAY be associated with each target name declared by the same documented rule.

### Excluded Makefile constructs

The extension MUST NOT expose the following as documented targets solely because they resemble target syntax:

- undocumented helper rules;
- target names outside the supported grammar;
- pattern rules such as `build-%`;
- variable assignments;
- recipe lines;
- ordinary comments;
- category headers.

A target that is otherwise valid but has no supported description MUST NOT be listed.

## Usage metadata and inputs

Usage metadata describes arguments accepted after a target name.

### Syntax

The canonical form is:

```text
# Usage: make <target> <usage-suffix>
```

Matching of `Usage` and `make` is case-insensitive. The target name follows the target-name grammar.

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

Usage metadata MUST precede the documented target to which it applies.

Zero or more conventional spacer comments containing only `#` MAY occur between the usage line and the description block.

The target name in usage metadata MUST match the discovered target name for the suffix to be associated. Mismatched or malformed usage metadata MUST NOT suppress an otherwise valid documented target.

An unrelated Makefile construct invalidates pending usage metadata. Usage metadata without a following documented target MUST NOT create a target.

For a rule declaring multiple targets, usage metadata is associated only with the target whose name matches the usage line.

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
# Usage: make sast-semgrep-scan SAST_SEMGREP_FILES=<path>
# Usage: make secrets-gpg-import [SECRETS_SOPS_UID=<uid>] <key-files>
```

Usage notation is descriptive. Angle brackets and square brackets do not cause the extension to validate supplied values.

### Presentation

When present, the usage suffix MUST be available in:

- the target picker;
- the explorer tooltip;
- Visual Studio Code task detail;
- the **Run Target with Arguments** input prompt.

### Input semantics

Input text is split into ordered arguments without invoking a shell parser. Whitespace separates arguments unless enclosed in matching single or double quotes. A backslash escapes the next character outside single quotes.

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
SAST_SEMGREP_FILES="src packages/shared"
```

one logical argument is passed after the target, equivalent to:

```sh
make sast-semgrep-scan 'SAST_SEMGREP_FILES=src packages/shared'
```

The extension MUST preserve argument ordering after the target name and MUST NOT interpret Make variable assignments as extension configuration.

An unterminated quoted argument MUST prevent execution and produce an input error.

## Categories

Categories organize documented targets into named sections.

### Category header grammar

A canonical category header has this structure:

```text
<optional-spaces>#<whitespace><separator-run><whitespace><category><optional-trailing-separators>
```

The separator run consists of one Unicode punctuation or symbol character repeated at least three times. Optional trailing separators use the same character.

Examples:

```make
# ─── Skills Manager ───────────────────────────────────────────────────────
# --- Dependencies ---------------------------------------------------------
# === Test ================================================================
```

Supported separator characters include, but are not limited to `─`, `-`, `=`, `_`, and `#`. The visual width of a header is not significant.

### Category validity

A category header MUST:

- begin with `#` after any leading spaces;
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

Undocumented rules and unrelated Makefile constructs do not terminate the active category.

### Uncategorized targets

A documented target with no active category has no category association.

When at least one discovered target has a category, the explorer MUST group targets without a category under **Uncategorized**.

When no discovered target has a category, the category grouping level is omitted.

### Built-in Visual Studio Code task groups

Category matching for built-in task groups ignores leading and trailing whitespace and is case-insensitive.

| Category value | Visual Studio Code task group |
| --- | --- |
| `Build` | Build |
| `Test` | Test |
| `Clean` | Clean |
| `Rebuild` | Rebuild |
| `Rebuild All` | Rebuild |

The values in the table represent canonical capitalization; equivalent case variants map to the same group. Other category names remain valid organizational categories but do not map to a built-in task group.

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
| `target` | Yes | Target name to execute. |
| `makefile` | No | Workspace-relative Makefile path used to disambiguate the target. |
| `args` | No | Ordered arguments passed after the target. |

When `makefile` is omitted, the task provider resolves the first discovered target with the requested name in the task's workspace scope. Explicitly setting `makefile` is RECOMMENDED whenever more than one discovered Makefile defines the same target name.

A task that cannot be matched to a discovered target is not resolved.

`args` MAY contain positional goals, Make variable assignments, or both.

### Command construction

For a resolved target, the logical command order is:

```text
<make-command> -f <makefile-basename> <target> <args...>
```

The command runs with the selected Makefile's directory as its working directory.

The configured Make command MUST be used. The selected target MUST precede all user-supplied arguments, and arguments declared in `args` MUST retain their array order.

## User interface behavior

### Explorer

The extension provides a dedicated Makefile view in the Activity Bar.

The explorer MUST present discovered targets and SHOULD expose:

- the target name;
- the description;
- category grouping when applicable;
- usage metadata when present;
- workspace and Makefile grouping when necessary.

Selecting a target runs it only when `makefileTasks.runOnClick` is enabled. The inline play action executes the target as a Visual Studio Code task.

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

Targets MUST retain their Makefile association for display, task identity, navigation, and execution.

### Multi-root workspaces

The extension supports multi-root Visual Studio Code workspaces.

Targets MUST retain their workspace-folder association. Interfaces group by workspace folder when more than one folder contains discovered targets.

### Discovery configuration

Makefile discovery is controlled by extension configuration, including:

- `makefileTasks.fileGlobs`;
- `makefileTasks.excludeGlob`;
- `makefileTasks.sort`;
- `makefileTasks.makeCommand`;
- `makefileTasks.runOnClick`;
- `makefileTasks.autoRefresh`.

Only files included by the effective discovery globs and not excluded by the effective exclusion pattern are sources of discovered targets.

## Refresh behavior

The extension performs an initial discovery pass when activated.

The **Refresh Targets** command MUST request a new discovery pass regardless of the `makefileTasks.autoRefresh` setting.

Changes to extension configuration under `makefileTasks` request a new discovery pass.

When `makefileTasks.autoRefresh` is enabled, the extension schedules discovery after:

- a save of a currently discovered Makefile;
- a workspace-folder change;
- create, change, or delete events matching `**/{Makefile,makefile,GNUmakefile,*.mk}`.

Files discovered only through custom `makefileTasks.fileGlobs` that do not match the watcher pattern may require the **Refresh Targets** command after external creation, deletion, or modification.

When `makefileTasks.autoRefresh` is disabled, file and workspace events MUST NOT schedule automatic discovery.

After a completed refresh, removed targets MUST no longer be presented and changed metadata MUST replace stale metadata.

## Error handling

A malformed annotation SHOULD be ignored without preventing discovery of unrelated valid targets.

An unsupported Makefile construct MUST NOT be exposed as a target merely because it contains comment markers resembling supported annotations.

A Makefile that cannot be read is skipped and the failure is written to the extension output channel.

Execution failures from Make are task execution failures and SHOULD be surfaced through normal Visual Studio Code task output and status mechanisms.

## Conformance examples

### Consecutive descriptions and multiple targets

Input:

```make
## First sentence.
## Second sentence.
alpha beta:: prerequisite
```

Expected targets:

```json
[
  { "target": "alpha", "description": "First sentence. Second sentence." },
  { "target": "beta", "description": "First sentence. Second sentence." }
]
```

### Leading tab is recipe content

Input:

```make
	## Not target documentation
hidden:
```

Expected result: `hidden` is not discovered.

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

### Invalid target name

Input:

```make
docs/build: ## Build documentation
```

Expected result: the rule is not exposed because `/` is outside the supported target-name grammar.

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

The root README provides the concise user-facing description of these features. This specification is the normative reference for annotation syntax and externally observable behavior.

Changes that alter documented target discovery, category parsing, usage metadata, input handling, generated task behavior, or refresh behavior SHOULD update this specification in the same pull request.
