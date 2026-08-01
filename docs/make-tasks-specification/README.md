# Make Tasks Specification

The Make Tasks Specification defines the Makefile annotation syntax and externally observable behavior of the Makefile Tasks extension for Visual Studio Code. It specifies documented-target discovery, metadata association, task generation, argument processing, execution, workspace integration, and refresh semantics.

This specification is the behavioral contract used to align the extension implementation, user documentation, and regression tests. It defines only the supported annotation subset and does not replace the syntax or execution model of [GNU Make](https://www.gnu.org/software/make/manual/make.html).

- [1. Status and Conformance](#1-status-and-conformance)
  - [1.1. Normative Language](#11-normative-language)
  - [1.2. Conformance](#12-conformance)
- [2. Scope](#2-scope)
- [3. Terminology](#3-terminology)
- [4. Target Model](#4-target-model)
- [5. Annotation Syntax](#5-annotation-syntax)
  - [5.1. Line Classification](#51-line-classification)
  - [5.2. Target-Name Grammar](#52-target-name-grammar)
  - [5.3. Preceding Description](#53-preceding-description)
  - [5.4. Inline Description](#54-inline-description)
  - [5.5. Description Association](#55-description-association)
  - [5.6. Usage Metadata](#56-usage-metadata)
    - [5.6.1. Syntax](#561-syntax)
    - [5.6.2. Association](#562-association)
    - [5.6.3. Usage Suffix](#563-usage-suffix)
  - [5.7. Category Metadata](#57-category-metadata)
    - [5.7.1. Header Grammar](#571-header-grammar)
    - [5.7.2. Validity](#572-validity)
    - [5.7.3. Lifetime](#573-lifetime)
- [6. Discovery Semantics](#6-discovery-semantics)
  - [6.1. Documented Targets](#61-documented-targets)
  - [6.2. Excluded Constructs](#62-excluded-constructs)
  - [6.3. Duplicate Names](#63-duplicate-names)
  - [6.4. Makefile Discovery](#64-makefile-discovery)
- [7. Input and Argument Semantics](#7-input-and-argument-semantics)
  - [7.1. Input Forms](#71-input-forms)
  - [7.2. Tokenization](#72-tokenization)
  - [7.3. Argument Ordering](#73-argument-ordering)
- [8. Visual Studio Code Task Integration](#8-visual-studio-code-task-integration)
  - [8.1. Availability and Generated Tasks](#81-availability-and-generated-tasks)
  - [8.2. Explicit Task Definition](#82-explicit-task-definition)
  - [8.3. Task Resolution](#83-task-resolution)
  - [8.4. Command Construction](#84-command-construction)
  - [8.5. Task Detail and Built-In Groups](#85-task-detail-and-built-in-groups)
- [9. User Interface Behavior](#9-user-interface-behavior)
  - [9.1. Explorer Hierarchy](#91-explorer-hierarchy)
  - [9.2. Target Presentation](#92-target-presentation)
  - [9.3. Commands](#93-commands)
  - [9.4. Navigation](#94-navigation)
- [10. Workspace and Configuration](#10-workspace-and-configuration)
  - [10.1. Multiple Makefiles](#101-multiple-makefiles)
  - [10.2. Multi-Root Workspaces](#102-multi-root-workspaces)
  - [10.3. Configuration](#103-configuration)
- [11. Refresh and Error Handling](#11-refresh-and-error-handling)
  - [11.1. Initial and Manual Refresh](#111-initial-and-manual-refresh)
  - [11.2. Automatic Refresh](#112-automatic-refresh)
  - [11.3. Refresh Results](#113-refresh-results)
  - [11.4. Discovery and Execution Errors](#114-discovery-and-execution-errors)
- [12. Conformance Examples](#12-conformance-examples)
  - [12.1. Consecutive Descriptions and Multiple Targets](#121-consecutive-descriptions-and-multiple-targets)
  - [12.2. Leading Tab Is Recipe Content](#122-leading-tab-is-recipe-content)
  - [12.3. Category and Usage Metadata](#123-category-and-usage-metadata)
  - [12.4. Uncategorized Target in a Categorized Makefile](#124-uncategorized-target-in-a-categorized-makefile)
  - [12.5. Invalid Target Name](#125-invalid-target-name)
  - [12.6. Excluded and Duplicate Targets](#126-excluded-and-duplicate-targets)
  - [12.7. Quoted and Escaped Arguments](#127-quoted-and-escaped-arguments)
- [13. Compatibility and Maintenance](#13-compatibility-and-maintenance)
- [14. References](#14-references)

## 1. Status and Conformance

This document is the normative reference for the Makefile annotations recognized by Makefile Tasks and for the externally observable behavior produced from those annotations.

### 1.1. Normative Language

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are interpreted according to IETF [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174) when they appear in uppercase. Lowercase forms have their ordinary descriptive meaning.

### 1.2. Conformance

A conforming implementation MUST satisfy every applicable normative requirement in this document. The expected results in [12. Conformance Examples](#12-conformance-examples) are normative examples of parser, presentation, and argument-processing behavior.

Repository implementation links identify the behavior against which this specification was revised. They provide traceability but do not replace the requirements in this document.

## 2. Scope

Makefile Tasks discovers documented Makefile targets and exposes them through a dedicated explorer, extension commands, and the [Visual Studio Code task system](https://code.visualstudio.com/docs/debugtest/tasks).

This specification defines:

- documented-target discovery and target-name constraints;
- preceding and inline target descriptions;
- usage and category metadata;
- target data and source identity;
- argument tokenization and ordering;
- generated and explicit Visual Studio Code tasks;
- explorer, command, and navigation behavior;
- multiple-Makefile and multi-root workspace behavior;
- configuration, refresh, and error semantics.

This specification does not define:

- GNU Make syntax beyond the subset required to recognize supported rules and annotations;
- shell parsing or shell expansion of user input;
- Makefile recipe behavior or build outcomes;
- installation or availability of the configured Make executable;
- annotations or target forms not explicitly described in this document.

## 3. Terminology

The following terms establish the logical entities used throughout the specification.

- Makefile
  > A file selected by the extension's configured discovery rules and interpreted as a source of Make targets.

- Target
  > A concrete Make rule name accepted by the extension's target-name grammar.

- Documented Target
  > A target associated with a non-empty description through a supported preceding or inline description form. Only documented targets are exposed by the extension.

- Description
  > Human-readable text associated with one or more target names declared by a documented rule and displayed in extension interfaces.

- Usage Metadata
  > An optional annotation that describes arguments accepted after a target name.

- Usage Suffix
  > The portion of a usage annotation that follows `make <target>`.

- Category
  > A section name associated with subsequent documented targets by a valid category header.

- Input
  > Text supplied through **Run Target with Arguments** before tokenization.

- Argument
  > One ordered token passed to Make after the selected target name.

- Task
  > A Visual Studio Code task generated from a discovered target or explicitly declared with the `makefileTarget` task type.

- Workspace Scope
  > The Visual Studio Code workspace folder used to discover, distinguish, resolve, and execute a target.

## 4. Target Model

Each discovered target has the following logical properties:

| Property | Required | Description |
| --- | --- | --- |
| `name` | Yes | The discovered target name. |
| `description` | Yes | The normalized non-empty description. |
| `workspaceFolder` | Yes | The Visual Studio Code workspace folder containing the Makefile. |
| `makefile` | Yes | The workspace-relative path of the source Makefile. |
| `category` | No | The active category at the target definition. |
| `usage` | No | The associated non-empty usage suffix. |
| `sourceLocation` | Yes | The source position retained for navigation and diagnostics. |

The [target model](../../src/model.ts) MAY retain additional implementation data when it does not alter the observable semantics defined here.

## 5. Annotation Syntax

Annotations are line-oriented comments associated with concrete Make rules. Description and usage metadata are pending annotations: they apply only to the next eligible rule and are invalidated by unrelated input. Category metadata is persistent and remains active until another valid category header replaces it.

### 5.1. Line Classification

The [parser](../../src/parser.ts) normalizes carriage-return line endings before classifying lines.

- Leading Spaces
  > Description, usage, category, and spacer-comment lines MAY contain leading spaces.

- Target Column
  > A target declaration MUST begin at the first character of the line.

- Leading Tab
  > A line beginning with a tab is recipe content. It MUST NOT be interpreted as a description, usage annotation, category header, or target declaration. It clears pending description and usage metadata.

- Unrelated Input
  > A blank line, ordinary comment, variable assignment, unsupported Makefile construct, or other unrelated line clears pending description and usage metadata.

- Category Persistence
  > Unrelated input and recipe content do not clear the active category.

### 5.2. Target-Name Grammar

A discovered target name MUST match:

```text
[A-Za-z0-9][A-Za-z0-9_.-]*
```

The first character is therefore an ASCII letter or digit. Subsequent characters may also include underscore, period, and hyphen.

A supported rule declaration contains one or more target names separated by spaces or tabs, followed by `:` or `::`. Prerequisites MAY follow the rule separator.

```make
## Build both variants
alpha beta:: prerequisites
```

The rule produces the documented targets `alpha` and `beta`, each with the same description and active category.

### 5.3. Preceding Description

A preceding description comment immediately before a rule documents that rule:

```make
## Build the application
build:
	go build ./...
```

A preceding description line MUST begin with `##` after any leading spaces. The marker and surrounding outer whitespace are not part of the resulting description.

Consecutive preceding description lines are joined with one space:

```make
## Build the application.
## Produces release artifacts.
build:
```

The resulting description is `Build the application. Produces release artifacts.` An empty `##` line contributes no text but does not terminate the consecutive description block.

### 5.4. Inline Description

An inline description follows a target declaration:

```make
test: ## Run the test suite
	go test ./...
```

The marker MUST begin with `##`, MUST occur immediately after the rule separator or after whitespace in the rule remainder, and MUST contain non-whitespace text. It MAY follow prerequisites:

```make
test: dependencies ## Run the test suite
```

An inline description takes precedence over any pending preceding description.

### 5.5. Description Association

A target MUST have a non-empty description to be included in discovery results.

A preceding description applies only to the immediately following eligible rule. A usage annotation MAY precede the description block, but encountering a new usage annotation clears any previously pending description.

For a rule that declares multiple valid target names, the resulting description is associated with each name. An empty or malformed description marker does not create a documented target by itself.

### 5.6. Usage Metadata

Usage metadata describes arguments accepted after a target name. It is descriptive metadata and does not validate values.

#### 5.6.1. Syntax

The canonical form is:

```text
# Usage: make <target> <usage-suffix>
```

Matching of `Usage` and `make` is case-insensitive. The target name follows the target-name grammar and is matched to a discovered target case-sensitively.

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

The associated usage suffix is `<files>`.

#### 5.6.2. Association

Usage metadata MUST precede the documented target to which it applies. Zero or more spacer comments containing only `#` and optional spaces MAY occur between the usage line and the description block.

The target name in usage metadata MUST equal the discovered target name for the suffix to be associated. Mismatched or malformed usage metadata MUST NOT suppress an otherwise valid documented target.

An unrelated Makefile construct invalidates pending usage metadata. Usage metadata without a following documented target MUST NOT create a target.

For a rule declaring multiple targets, usage metadata is associated only with the target whose name matches the usage line.

#### 5.6.3. Usage Suffix

The usage suffix is the trimmed portion following `make <target>`. An empty suffix is not retained as usage metadata.

A suffix MAY describe:

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

Angle brackets and square brackets are notation only. They do not cause the extension to validate supplied values.

### 5.7. Category Metadata

Category metadata associates a section name with subsequent documented targets.

#### 5.7.1. Header Grammar

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

Supported separator characters include, but are not limited to, `─`, `-`, `=`, `_`, and `#`. The visual width of a header is not significant.

#### 5.7.2. Validity

A category header MUST:

- begin with `#` after any leading spaces;
- contain whitespace between `#` and the leading separator run;
- use at least three repetitions of one Unicode punctuation or symbol character;
- contain non-empty category text after the leading separator run;
- precede any trailing separator run with whitespace;
- use the leading separator character for any trailing separator run.

The following lines are ordinary comments and MUST NOT change the active category:

```make
# -- Build
#--- Build
# Notes about build targets
```

A format character or another character outside the Unicode punctuation and symbol classes MUST NOT form a separator run.

#### 5.7.3. Lifetime

A valid category applies to each subsequent documented target until another valid category header is encountered.

Undocumented rules and unrelated Makefile constructs do not terminate the active category. A documented target encountered before any valid category has no category association.

A category header clears pending description and usage metadata because it begins a new annotation section.

## 6. Discovery Semantics

Discovery converts supported Makefile annotations and concrete rule declarations into target records while preserving source identity.

### 6.1. Documented Targets

A rule produces one discovered target for each valid target name when the rule has a non-empty supported description.

The discovered target retains its description, active category, matching usage suffix, workspace folder, Makefile path, and source line. Files containing no documented targets do not produce discovery documents.

### 6.2. Excluded Constructs

The extension MUST NOT expose the following as documented targets solely because they resemble supported syntax:

- undocumented helper rules;
- target names outside the supported grammar;
- pattern rules such as `build-%`;
- variable assignments;
- recipe lines;
- ordinary comments;
- category headers;

A target that is otherwise syntactically valid but has no supported description MUST NOT be listed.

### 6.3. Duplicate Names

Within a single Makefile, only the first discovered occurrence of a target name is retained. A later documented rule in the same file with the same name MUST NOT produce a duplicate target.

The same target name MAY be discovered independently in different Makefiles. The Makefile path and workspace scope distinguish those targets.

### 6.4. Makefile Discovery

The [discovery implementation](../../src/discovery.ts) evaluates configured file globs independently for each workspace folder and applies the configured exclusion pattern.

A file matched by more than one discovery glob is processed once. Matched files are processed in lexical URI-path order within each workspace folder.

The default discovery globs select:

```text
**/Makefile
**/makefile
**/GNUmakefile
```

The default exclusion pattern is:

```text
**/{.git,node_modules,vendor,.venv,dist,out}/**
```

Custom discovery globs MAY select other file names, including `*.mk` files.

## 7. Input and Argument Semantics

The **Run Target with Arguments** command accepts a text fragment and converts it into an ordered argument array without invoking a shell parser.

### 7.1. Input Forms

Input MAY contain:

- positional Make goals;
- Make variable assignments;
- quoted values;
- escaped whitespace;
- any ordered combination of these forms.

Given the target `secrets-sops-decrypt`, this input:

```text
secrets/example.yaml.enc secrets/other.yaml.enc
```

produces arguments equivalent to:

```bash
make secrets-sops-decrypt secrets/example.yaml.enc secrets/other.yaml.enc
```

Given the target `sast-semgrep-scan`, this input:

```text
SAST_SEMGREP_FILES="src packages/shared"
```

produces one logical argument equivalent to:

```bash
make sast-semgrep-scan 'SAST_SEMGREP_FILES=src packages/shared'
```

### 7.2. Tokenization

The [argument parser](../../src/parser.ts) applies the following rules:

- whitespace separates arguments unless it occurs inside matching single or double quotes;
- surrounding quote characters are removed from the resulting argument;
- a backslash escapes the next character outside single quotes;
- a backslash is literal inside single quotes;
- an unterminated single or double quote prevents execution and produces an input error.

The extension does not perform shell expansion, variable expansion, command substitution, glob expansion, or redirection while tokenizing input.

### 7.3. Argument Ordering

The selected target MUST precede every user-supplied argument. Parsed arguments MUST retain their input order.

Make variable assignments are passed as ordinary Make arguments and MUST NOT be interpreted as extension configuration.

## 8. Visual Studio Code Task Integration

Every discovered target is exposed through the Visual Studio Code task system. The [task provider implementation](../../src/tasks.ts) supplies generated tasks and resolves explicitly declared tasks through the Visual Studio Code [TaskProvider API](https://code.visualstudio.com/api/references/vscode-api#TaskProvider).

### 8.1. Availability and Generated Tasks

Every discovered target MUST be available through **Tasks: Run Task**.

A generated task has:

- a definition type of `makefileTarget`;
- the discovered target name;
- the workspace-relative Makefile path;
- the target's workspace-folder scope;
- an optional ordered `args` array;
- a task name equal to the target name;
- a task source of `Makefile`.

Generated task definitions include the Makefile path so targets with identical names remain distinguishable.

### 8.2. Explicit Task Definition

A target MAY be declared explicitly in `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "makefileTarget",
      "target": "secrets-sops-decrypt",
      "makefile": "Makefile",
      "args": [
        "secrets/example.yaml.enc",
        "secrets/other.yaml.enc"
      ]
    }
  ]
}
```

The [task definition contribution](../../package.json) defines these properties:

| Property | Required | Description |
| --- | --- | --- |
| `type` | Yes | MUST be `makefileTarget`. |
| `target` | Yes | Target name to execute. |
| `makefile` | No | Workspace-relative Makefile path used to disambiguate the target. |
| `args` | No | Ordered arguments passed after the target. |

### 8.3. Task Resolution

The task provider resolves an explicit task against the current discovered target set. When the task has workspace-folder scope, resolution is confined to that folder.

When `makefile` is present, the target name and workspace-relative Makefile path MUST both match a discovered target.

When `makefile` is omitted, the provider resolves the first discovered target with the requested name in that workspace scope. Explicitly setting `makefile` is RECOMMENDED when more than one discovered Makefile defines the same target name.

A task that cannot be matched to a discovered target is not resolved. Omitted `args` are equivalent to an empty argument array.

### 8.4. Command Construction

For a resolved target, the logical command order is:

```text
<make-command> -f <makefile-basename> <target> <args...>
```

The command runs with the selected Makefile's directory as its working directory.

The configured Make command MUST be used. The target MUST precede all user-supplied arguments, and arguments declared in `args` MUST retain their array order.

### 8.5. Task Detail and Built-In Groups

Task detail includes the target description and, when present, its category and complete usage form.

Category matching for built-in Visual Studio Code task groups ignores leading and trailing whitespace and is case-insensitive.

| Category value | Visual Studio Code task group |
| --- | --- |
| `Build` | Build |
| `Test` | Test |
| `Clean` | Clean |
| `Rebuild` | Rebuild |
| `Rebuild All` | Rebuild |

Equivalent case variants map to the same group. Other category names remain valid organizational categories but do not map to a built-in task group.

## 9. User Interface Behavior

The extension exposes discovered targets through the Makefile Tasks Activity Bar view and command set. The [tree provider](../../src/tree.ts) preserves the workspace and Makefile identity required for presentation and execution.

### 9.1. Explorer Hierarchy

The explorer hierarchy adapts to the discovered source set:

- Workspace Folders
  > When more than one workspace folder contains discovered targets, the explorer creates one root node per workspace folder.

- Makefiles
  > When a displayed workspace level contains more than one discovered Makefile, the explorer creates one node per Makefile. A workspace containing one discovered Makefile exposes that file's content directly.

- Categories
  > When at least one target in a displayed Makefile or workspace content set has a category, the explorer groups all targets by category and places targets without a category under **Uncategorized**.

- Flat Targets
  > When no target in the displayed content set has a category, the category level is omitted.

Targets retain workspace-folder and Makefile associations regardless of which grouping levels are omitted.

### 9.2. Target Presentation

A target item presents its target name and exposes the following context where available:

- description;
- category;
- usage in the form `make <target> <usage-suffix>`;
- workspace-relative Makefile path;
- one-based source line for navigation.

The target picker includes enough workspace and Makefile context to distinguish targets with identical names.

When `makefileTasks.runOnClick` is enabled, selecting a target item executes it. The inline play action executes the target as a Visual Studio Code task independently of the selection behavior.

The `makefileTasks.sort` setting controls target ordering:

- `source`
  > Preserves target order from each Makefile and category order by first appearance.

- `name`
  > Sorts target names alphabetically and sorts category labels alphabetically.

### 9.3. Commands

The extension contributes these commands:

- **Makefile Tasks: Refresh Targets**;
- **Makefile Tasks: Run Target**;
- **Makefile Tasks: Run Target with Arguments**;
- **Makefile Tasks: Run Target…**;
- **Makefile Tasks: Go to Target Definition**.

Target-selection interfaces SHOULD include enough context to distinguish targets with the same name from different Makefiles or workspace folders.

### 9.4. Navigation

**Go to Target Definition** MUST open the source Makefile and reveal the selected target's retained source line when the source remains available.

## 10. Workspace and Configuration

Workspace behavior preserves source identity across discovery, presentation, task resolution, navigation, and execution.

### 10.1. Multiple Makefiles

The extension supports more than one discovered Makefile in a workspace folder.

Targets MUST retain their Makefile association. The Makefile path is used for display, task identity, explicit task resolution, navigation, and working-directory selection.

### 10.2. Multi-Root Workspaces

The extension supports [multi-root Visual Studio Code workspaces](https://code.visualstudio.com/docs/editing/workspaces/multi-root-workspaces).

Targets MUST retain their workspace-folder association. The explorer groups by workspace folder when more than one folder contains discovered targets, and task resolution remains within the task's workspace scope.

### 10.3. Configuration

The extension manifest partitions configuration by behavioral concern:

| Setting | Concern | Default | Effect |
| --- | --- | --- | --- |
| `makefileTasks.fileGlobs` | Discovery | `["**/Makefile", "**/makefile", "**/GNUmakefile"]` | Selects candidate Makefiles independently in each workspace folder. |
| `makefileTasks.excludeGlob` | Discovery | `**/{.git,node_modules,vendor,.venv,dist,out}/**` | Excludes matching paths from discovery. |
| `makefileTasks.sort` | Presentation | `source` | Selects source-order or alphabetical target presentation. |
| `makefileTasks.makeCommand` | Execution | `make` | Selects the executable or command used for task execution. |
| `makefileTasks.runOnClick` | Interaction | `true` | Controls whether selecting an explorer target executes it. |
| `makefileTasks.autoRefresh` | Refresh | `true` | Controls refresh scheduling for file and workspace events. |

Only `fileGlobs` and `excludeGlob` determine which files are discovery candidates. The remaining settings affect presentation, execution, interaction, or refresh scheduling.

## 11. Refresh and Error Handling

The [extension activation and refresh implementation](../../src/extension.ts) coordinates discovery with configuration and workspace events.

### 11.1. Initial and Manual Refresh

The extension performs an initial discovery pass when activated.

**Makefile Tasks: Refresh Targets** MUST request a new discovery pass regardless of the `makefileTasks.autoRefresh` setting.

A configuration change under `makefileTasks` requests a new discovery pass. Presentation-only configuration changes also update the current tree ordering.

### 11.2. Automatic Refresh

When `makefileTasks.autoRefresh` is enabled, the extension schedules discovery after:

- a save of a currently discovered Makefile;
- a workspace-folder change;
- a create, change, or delete event matching `**/{Makefile,makefile,GNUmakefile,*.mk}`.

Rapid file events MAY be coalesced into one discovery pass.

Files discovered only through custom `makefileTasks.fileGlobs` that do not match the watcher pattern may require **Refresh Targets** after external creation, deletion, or modification.

When `makefileTasks.autoRefresh` is disabled, file and workspace events MUST NOT schedule automatic discovery.

### 11.3. Refresh Results

After a completed refresh:

- removed targets MUST no longer be presented;
- changed descriptions, categories, usage metadata, paths, and source lines MUST replace stale values;
- newly discovered targets MUST be presented according to the active grouping and sorting settings;
- task-provider results MUST reflect the refreshed target set.

### 11.4. Discovery and Execution Errors

A malformed annotation SHOULD be ignored without preventing discovery of unrelated valid targets.

A Makefile that cannot be read is skipped, and the failure is written to the Makefile Tasks output channel.

A top-level refresh failure is written to the output channel and surfaced as an extension error message.

An unterminated quoted argument prevents task execution and is surfaced as an input error.

Failures reported by Make are task execution failures and SHOULD be surfaced through standard Visual Studio Code task output and status mechanisms.

## 12. Conformance Examples

The following examples define representative required outcomes.

### 12.1. Consecutive Descriptions and Multiple Targets

Input:

```make
## First sentence.
## Second sentence.
alpha beta:: prerequisite
```

Expected targets:

```json
[
  {
    "target": "alpha",
    "description": "First sentence. Second sentence."
  },
  {
    "target": "beta",
    "description": "First sentence. Second sentence."
  }
]
```

### 12.2. Leading Tab Is Recipe Content

Input:

```make
	## Not target documentation
hidden:
```

Expected result: `hidden` is not discovered.

### 12.3. Category and Usage Metadata

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

### 12.4. Uncategorized Target in a Categorized Makefile

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

### 12.5. Invalid Target Name

Input:

```make
docs/build: ## Build documentation
```

Expected result: the rule is not exposed because `/` is outside the supported target-name grammar.

### 12.6. Excluded and Duplicate Targets

Input:

```make
helper:
	@echo helper

build-%: ## Build a named component
	@echo "$*"

## Build the application
build:

## Duplicate definition
build:
```

Expected target names:

```json
[
  "build"
]
```

`helper` is undocumented, `build-%` is a pattern rule, and the later `build` definition is suppressed within the same Makefile.

### 12.7. Quoted and Escaped Arguments

Input:

```text
ENV=dev MESSAGE="hello world" path\ with\ spaces 'single value'
```

Expected arguments:

```json
[
  "ENV=dev",
  "MESSAGE=hello world",
  "path with spaces",
  "single value"
]
```

Input containing an unterminated quote MUST produce an input error and MUST NOT execute the target.

## 13. Compatibility and Maintenance

The root [README](../../README.md) provides the concise user-facing description of Makefile Tasks. This specification is the normative reference for annotation syntax and externally observable behavior.

A change that alters target discovery, annotation parsing, category association, usage metadata, input tokenization, task generation or resolution, explorer behavior, configuration defaults, workspace behavior, or refresh semantics SHOULD update this specification in the same pull request.

Behavioral changes SHOULD also update the relevant regression tests. Documentation-only revisions MUST preserve technically relevant behavior unless the revision explicitly identifies and corrects a contradiction.

## 14. References

- IETF [Key words for use in RFCs to Indicate Requirement Levels](https://www.rfc-editor.org/rfc/rfc2119) RFC.
- IETF [Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words](https://www.rfc-editor.org/rfc/rfc8174) RFC.
- GNU [GNU Make Manual](https://www.gnu.org/software/make/manual/make.html) manual.
- Visual Studio Code [Integrate with External Tools via Tasks](https://code.visualstudio.com/docs/debugtest/tasks) documentation.
- Visual Studio Code [TaskProvider API](https://code.visualstudio.com/api/references/vscode-api#TaskProvider) API documentation.
- Visual Studio Code [Multi-root Workspaces](https://code.visualstudio.com/docs/editing/workspaces/multi-root-workspaces) documentation.
- VS Code Make [`src/model.ts`](../../src/model.ts) source file.
- VS Code Make [`src/parser.ts`](../../src/parser.ts) source file.
- VS Code Make [`src/tasks.ts`](../../src/tasks.ts) source file.
- VS Code Make [`src/tree.ts`](../../src/tree.ts) source file.
- VS Code Make [`src/discovery.ts`](../../src/discovery.ts) source file.
- VS Code Make [`src/extension.ts`](../../src/extension.ts) source file.
- VS Code Make [`package.json`](../../package.json) manifest.
- VS Code Make [`test/parser.test.ts`](../../test/parser.test.ts) test file.
