# Make Tasks Specification

The Make Tasks Specification defines the Makefile annotation syntax and externally observable behavior of the Makefile Tasks extension for Visual Studio Code. It covers documented target discovery, metadata association, task generation, execution, workspace integration, and refresh semantics.

This specification is the behavioral contract used to align the extension implementation, user documentation, and regression tests. It defines only the supported annotation subset and does not replace GNU Make's syntax or execution model.

- [1. Status](#1-status)
- [2. Scope](#2-scope)
- [3. Terminology](#3-terminology)
  - [3.1. Makefile](#31-makefile)
  - [3.2. Target](#32-target)
  - [3.3. Documented Target](#33-documented-target)
  - [3.4. Description](#34-description)
  - [3.5. Category](#35-category)
  - [3.6. Usage Metadata](#36-usage-metadata)
  - [3.7. Input](#37-input)
  - [3.8. Task](#38-task)
- [4. Target Model](#4-target-model)
  - [4.1. Target-Name Grammar](#41-target-name-grammar)
- [5. Metadata Indentation](#5-metadata-indentation)
- [6. Documented Target Discovery](#6-documented-target-discovery)
  - [6.1. Preceding Description](#61-preceding-description)
  - [6.2. Inline Description](#62-inline-description)
  - [6.3. Description Requirements](#63-description-requirements)
  - [6.4. Excluded Makefile Constructs](#64-excluded-makefile-constructs)
- [7. Usage Metadata and Inputs](#7-usage-metadata-and-inputs)
  - [7.1. Syntax](#71-syntax)
  - [7.2. Association](#72-association)
  - [7.3. Usage Suffix](#73-usage-suffix)
  - [7.4. Presentation](#74-presentation)
  - [7.5. Input Semantics](#75-input-semantics)
- [8. Categories](#8-categories)
  - [8.1. Category Header Grammar](#81-category-header-grammar)
  - [8.2. Category Validity](#82-category-validity)
  - [8.3. Category Lifetime](#83-category-lifetime)
  - [8.4. Uncategorized Targets](#84-uncategorized-targets)
  - [8.5. Built-In Visual Studio Code Task Groups](#85-built-in-visual-studio-code-task-groups)
- [9. Visual Studio Code Task Integration](#9-visual-studio-code-task-integration)
  - [9.1. Task Shape](#91-task-shape)
  - [9.2. Task Properties](#92-task-properties)
  - [9.3. Command Construction](#93-command-construction)
- [10. User Interface Behavior](#10-user-interface-behavior)
  - [10.1. Explorer](#101-explorer)
  - [10.2. Commands](#102-commands)
  - [10.3. Navigation](#103-navigation)
- [11. Workspace Behavior](#11-workspace-behavior)
  - [11.1. Multiple Makefiles](#111-multiple-makefiles)
  - [11.2. Multi-Root Workspaces](#112-multi-root-workspaces)
  - [11.3. Configuration](#113-configuration)
- [12. Refresh Behavior](#12-refresh-behavior)
- [13. Error Handling](#13-error-handling)
- [14. Conformance Examples](#14-conformance-examples)
  - [14.1. Consecutive Descriptions and Multiple Targets](#141-consecutive-descriptions-and-multiple-targets)
  - [14.2. Leading Tab Is Recipe Content](#142-leading-tab-is-recipe-content)
  - [14.3. Category and Usage Metadata](#143-category-and-usage-metadata)
  - [14.4. Uncategorized Target in a Categorized Makefile](#144-uncategorized-target-in-a-categorized-makefile)
  - [14.5. Invalid Target Name](#145-invalid-target-name)
  - [14.6. Excluded Targets](#146-excluded-targets)
- [15. Compatibility](#15-compatibility)
- [16. References](#16-references)

## 1. Status

This document is the normative reference for the Makefile annotations recognized by VS Code Make and the externally observable behavior produced from those annotations.

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are interpreted as described by IETF [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174) when they appear in uppercase.

## 2. Scope

VS Code Make discovers documented Makefile targets and exposes them through the extension explorer, command palette, and [Visual Studio Code task system](https://code.visualstudio.com/docs/debugtest/tasks).

This specification defines:

- documented target discovery;
- target descriptions and target-name grammar;
- target categories;
- usage metadata and target inputs;
- generated Visual Studio Code tasks;
- execution semantics;
- workspace and refresh behavior.

This specification does not define [GNU Make syntax](https://www.gnu.org/software/make/manual/make.html) beyond the subset required to identify targets and their annotations.

## 3. Terminology

The following terms establish the logical entities used throughout the specification.

### 3.1. Makefile

A file selected by the extension's configured discovery rules and interpreted as a source of Make targets.

### 3.2. Target

A concrete rule name accepted by the extension's target-name grammar.

### 3.3. Documented Target

A target associated with a non-empty description using one of the supported description forms.

Only documented targets are exposed by the extension.

### 3.4. Description

Human-readable text associated with one or more target names declared by a documented rule and displayed in extension user interfaces.

### 3.5. Category

A section name associated with subsequent documented targets by a canonical category header.

### 3.6. Usage Metadata

An optional comment that describes arguments accepted after a target name.

### 3.7. Input

Text supplied when a target is run with arguments. An input can contain positional goals, Make variable assignments, or both.

### 3.8. Task

A Visual Studio Code task generated from a discovered target or explicitly declared with the `makefileTarget` task type.

## 4. Target Model

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

### 4.1. Target-Name Grammar

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

Within a single Makefile, the [parser implementation](../../src/parser.ts) retains only the first discovered occurrence of each target name. A later documented rule in that Makefile with an already discovered name MUST NOT produce a duplicate target.

## 5. Metadata Indentation

Annotation lines MAY have leading spaces.

A line beginning with a tab is treated as recipe content and MUST NOT be interpreted as a description, usage annotation, category header, or target declaration.

## 6. Documented Target Discovery

A target MUST have a non-empty description to be included in discovery results.

Two description forms are supported.

### 6.1. Preceding Description

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

### 6.2. Inline Description

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

### 6.3. Description Requirements

A discovered description:

- MUST contain non-whitespace text;
- MUST be presented without the `##` marker;
- SHOULD preserve meaningful punctuation and internal whitespace;
- MAY be associated with each target name declared by the same documented rule.

### 6.4. Excluded Makefile Constructs

The extension MUST NOT expose the following as documented targets solely because they resemble target syntax:

- undocumented helper rules;
- target names outside the supported grammar;
- pattern rules such as `build-%`;
- variable assignments;
- recipe lines;
- ordinary comments;
- category headers.

A target that is otherwise valid but has no supported description MUST NOT be listed.

## 7. Usage Metadata and Inputs

Usage metadata describes arguments accepted after a target name.

### 7.1. Syntax

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

### 7.2. Association

Usage metadata MUST precede the documented target to which it applies.

Zero or more conventional spacer comments containing only `#` MAY occur between the usage line and the description block.

The target name in usage metadata MUST match the discovered target name for the suffix to be associated. Mismatched or malformed usage metadata MUST NOT suppress an otherwise valid documented target.

An unrelated Makefile construct invalidates pending usage metadata. Usage metadata without a following documented target MUST NOT create a target.

For a rule declaring multiple targets, usage metadata is associated only with the target whose name matches the usage line.

### 7.3. Usage Suffix

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

### 7.4. Presentation

When present, the usage suffix MUST be available in:

- the target picker;
- the explorer tooltip;
- Visual Studio Code task detail;
- the **Run Target with Arguments** input prompt.

### 7.5. Input Semantics

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

## 8. Categories

Categories organize documented targets into named sections.

### 8.1. Category Header Grammar

A canonical category header has this structure:

```text
<optional-spaces>#<whitespace><separator-run><whitespace><category>(<whitespace><trailing-separator-run>)?
```

The leading separator run consists of one Unicode punctuation or symbol character repeated at least three times. A trailing separator run, when present, uses the same character and is preceded by whitespace.

Examples:

```make
# ─── Skills Manager ───────────────────────────────────────────────────────
# --- Dependencies ---------------------------------------------------------
# === Test ================================================================
```

Supported separator characters include, but are not limited to `─`, `-`, `=`, `_`, and `#`. The visual width of a header is not significant.

### 8.2. Category Validity

A category header MUST:

- begin with `#` after any leading spaces;
- contain whitespace between `#` and the leading separator run;
- use at least three repeated separator characters;
- contain non-empty category text after the leading separator run;
- precede any trailing separator run with whitespace;
- use the leading separator character for any trailing separator run.

The following are ordinary comments and MUST NOT change the active category:

```make
# -- Build
#--- Build
# Notes about build targets
```

### 8.3. Category Lifetime

A valid category applies to each subsequent documented target until another valid category header is encountered.

Undocumented rules and unrelated Makefile constructs do not terminate the active category.

### 8.4. Uncategorized Targets

A documented target with no active category has no category association.

When at least one discovered target has a category, the explorer MUST group targets without a category under **Uncategorized**.

When no discovered target has a category, the category grouping level is omitted.

### 8.5. Built-In Visual Studio Code Task Groups

Category matching for built-in task groups ignores leading and trailing whitespace and is case-insensitive.

| Category value | Visual Studio Code task group |
| --- | --- |
| `Build` | Build |
| `Test` | Test |
| `Clean` | Clean |
| `Rebuild` | Rebuild |
| `Rebuild All` | Rebuild |

The values in the table represent canonical capitalization; equivalent case variants map to the same group. Other category names remain valid organizational categories but do not map to a built-in task group.

## 9. Visual Studio Code Task Integration

Every discovered target MUST be available through **Tasks: Run Task**.

A target MAY also be declared explicitly in `.vscode/tasks.json` using the `makefileTarget` task type. The [task provider implementation](../../src/tasks.ts) supplies and resolves these tasks through the Visual Studio Code [TaskProvider API](https://code.visualstudio.com/api/references/vscode-api#TaskProvider).

### 9.1. Task Shape

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

### 9.2. Task Properties

The repository [task definition contribution](../../package.json) defines the supported properties.

| Property | Required | Description |
| --- | --- | --- |
| `type` | Yes | MUST be `makefileTarget`. |
| `target` | Yes | Target name to execute. |
| `makefile` | No | Workspace-relative Makefile path used to disambiguate the target. |
| `args` | No | Ordered arguments passed after the target. |

When `makefile` is omitted, the task provider resolves the first discovered target with the requested name in the task's workspace scope. Explicitly setting `makefile` is RECOMMENDED whenever more than one discovered Makefile defines the same target name.

A task that cannot be matched to a discovered target is not resolved.

`args` MAY contain positional goals, Make variable assignments, or both.

### 9.3. Command Construction

For a resolved target, the logical command order is:

```text
<make-command> -f <makefile-basename> <target> <args...>
```

The command runs with the selected Makefile's directory as its working directory.

The configured Make command MUST be used. The selected target MUST precede all user-supplied arguments, and arguments declared in `args` MUST retain their array order.

## 10. User Interface Behavior

The user interface exposes discovered targets through a dedicated explorer and command set.

### 10.1. Explorer

The [tree provider implementation](../../src/tree.ts) provides a dedicated Makefile view in the Activity Bar.

The explorer MUST present discovered targets and SHOULD expose:

- the target name;
- the description;
- category grouping when applicable;
- usage metadata when present;
- workspace and Makefile grouping when necessary.

Selecting a target runs it only when `makefileTasks.runOnClick` is enabled. The inline play action executes the target as a Visual Studio Code task.

### 10.2. Commands

The extension provides these commands:

- **Makefile Tasks: Refresh Targets**;
- **Makefile Tasks: Run Target**;
- **Makefile Tasks: Run Target with Arguments**;
- **Makefile Tasks: Run Target…**;
- **Makefile Tasks: Go to Target Definition**.

Target selection interfaces SHOULD include enough context to distinguish targets with the same name from different Makefiles or workspace folders.

### 10.3. Navigation

**Go to Target Definition** MUST navigate to the source definition of the selected target when the source remains available.

## 11. Workspace Behavior

Workspace behavior preserves the source identity required to distinguish and execute targets.

### 11.1. Multiple Makefiles

The extension supports more than one discovered Makefile.

Targets MUST retain their Makefile association for display, task identity, navigation, and execution.

### 11.2. Multi-Root Workspaces

The extension supports [multi-root Visual Studio Code workspaces](https://code.visualstudio.com/docs/editing/workspaces/multi-root-workspaces).

Targets MUST retain their workspace-folder association. Interfaces group by workspace folder when more than one folder contains discovered targets.

### 11.3. Configuration

Extension configuration is partitioned by behavioral concern:

- Discovery
  > `makefileTasks.fileGlobs` selects candidate Makefiles, and `makefileTasks.excludeGlob` excludes matching paths.

- Presentation
  > `makefileTasks.sort` controls target ordering in the explorer and target picker.

- Execution
  > `makefileTasks.makeCommand` selects the Make executable or command.

- Interaction
  > `makefileTasks.runOnClick` controls whether selecting an explorer target executes it.

- Refresh
  > `makefileTasks.autoRefresh` controls whether file and workspace events schedule discovery.

Only files included by the effective discovery globs and not excluded by the effective exclusion pattern are sources of discovered targets. The [discovery implementation](../../src/discovery.ts) applies these settings independently for each workspace folder.

## 12. Refresh Behavior

The [extension activation and refresh implementation](../../src/extension.ts) performs an initial discovery pass when activated.

The **Refresh Targets** command MUST request a new discovery pass regardless of the `makefileTasks.autoRefresh` setting.

Changes to extension configuration under `makefileTasks` request a new discovery pass.

When `makefileTasks.autoRefresh` is enabled, the extension schedules discovery after:

- a save of a currently discovered Makefile;
- a workspace-folder change;
- create, change, or delete events matching `**/{Makefile,makefile,GNUmakefile,*.mk}`.

Files discovered only through custom `makefileTasks.fileGlobs` that do not match the watcher pattern may require the **Refresh Targets** command after external creation, deletion, or modification.

When `makefileTasks.autoRefresh` is disabled, file and workspace events MUST NOT schedule automatic discovery.

After a completed refresh, removed targets MUST no longer be presented and changed metadata MUST replace stale metadata.

## 13. Error Handling

A malformed annotation SHOULD be ignored without preventing discovery of unrelated valid targets.

An unsupported Makefile construct MUST NOT be exposed as a target merely because it contains comment markers resembling supported annotations.

A Makefile that cannot be read is skipped and the failure is written to the extension output channel.

Execution failures from Make are task execution failures and SHOULD be surfaced through normal Visual Studio Code task output and status mechanisms.

## 14. Conformance Examples

The following examples define representative parser and presentation outcomes.

### 14.1. Consecutive Descriptions and Multiple Targets

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

### 14.2. Leading Tab Is Recipe Content

Input:

```make
	## Not target documentation
hidden:
```

Expected result: `hidden` is not discovered.

### 14.3. Category and Usage Metadata

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

### 14.4. Uncategorized Target in a Categorized Makefile

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

### 14.5. Invalid Target Name

Input:

```make
docs/build: ## Build documentation
```

Expected result: the rule is not exposed because `/` is outside the supported target-name grammar.

### 14.6. Excluded Targets

Input:

```make
helper:
	@echo helper

build-%: ## Build a named component
	@echo "$*"
```

Expected result: neither rule is exposed. `helper` is undocumented and `build-%` is a pattern rule.

## 15. Compatibility

The root [README](../../README.md) provides the concise user-facing description of these features. This specification is the normative reference for annotation syntax and externally observable behavior.

Changes that alter documented target discovery, category parsing, usage metadata, input handling, generated task behavior, or refresh behavior SHOULD update this specification in the same pull request.

## 16. References

- IETF [Key words for use in RFCs to Indicate Requirement Levels](https://www.rfc-editor.org/rfc/rfc2119) RFC.
- IETF [Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words](https://www.rfc-editor.org/rfc/rfc8174) RFC.
- GNU [GNU Make Manual](https://www.gnu.org/software/make/manual/make.html) manual.
- Visual Studio Code [Integrate with External Tools via Tasks](https://code.visualstudio.com/docs/debugtest/tasks) documentation.
- Visual Studio Code [TaskProvider API](https://code.visualstudio.com/api/references/vscode-api#TaskProvider) API documentation.
- Visual Studio Code [Multi-root Workspaces](https://code.visualstudio.com/docs/editing/workspaces/multi-root-workspaces) documentation.
- VS Code Make [`src/parser.ts`](../../src/parser.ts) source file.
- VS Code Make [`src/tasks.ts`](../../src/tasks.ts) source file.
- VS Code Make [`src/tree.ts`](../../src/tree.ts) source file.
- VS Code Make [`src/discovery.ts`](../../src/discovery.ts) source file.
- VS Code Make [`src/extension.ts`](../../src/extension.ts) source file.
- VS Code Make [`package.json`](../../package.json) manifest.
