# Make Tasks Specification

The Make Tasks Specification defines the Makefile annotations and task behavior supported by the [Makefile Tasks](../../README.md) extension for the [Visual Studio Code task system](https://code.visualstudio.com/docs/debugtest/tasks). It establishes a compact contract for documented-target discovery, optional usage and category metadata, task resolution, argument processing, and workspace presentation.

The specification covers only the extension's recognized annotation subset. [GNU Make](https://www.gnu.org/software/make/manual/make.html) remains authoritative for Makefile syntax, dependency evaluation, recipes, and execution semantics.

- [1. Scope](#1-scope)
  - [1.1. Conformance](#11-conformance)
  - [1.2. Feature Model](#12-feature-model)
- [2. Annotation Syntax](#2-annotation-syntax)
  - [2.1. Target Rules](#21-target-rules)
  - [2.2. Descriptions](#22-descriptions)
  - [2.3. Usage Metadata](#23-usage-metadata)
  - [2.4. Categories](#24-categories)
- [3. Discovery and Task Behavior](#3-discovery-and-task-behavior)
  - [3.1. Discovery](#31-discovery)
  - [3.2. Task Definition and Resolution](#32-task-definition-and-resolution)
  - [3.3. Execution and Arguments](#33-execution-and-arguments)
  - [3.4. Presentation and Refresh](#34-presentation-and-refresh)
- [4. Configuration](#4-configuration)
- [5. Examples](#5-examples)
  - [5.1. Documented Target](#51-documented-target)
  - [5.2. Category and Input](#52-category-and-input)
  - [5.3. Multiple Targets](#53-multiple-targets)
  - [5.4. Excluded Constructs](#54-excluded-constructs)
- [6. Terminology](#6-terminology)
- [7. References](#7-references)

## 1. Scope

Makefile Tasks exposes documented Makefile targets through an Activity Bar explorer, extension commands, and the Visual Studio Code task system. The specification defines the annotation and integration behavior required for those interfaces; it does not define general Makefile parsing.

### 1.1. Conformance

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are interpreted according to IETF [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174) when they appear in uppercase.

A conforming implementation satisfies every applicable normative statement in this document. Changes to recognized annotation syntax or externally observable task behavior SHOULD update this specification and the corresponding regression tests in the same change.

### 1.2. Feature Model

The annotation model contains four elements.

- Target
  > A concrete Make rule name that identifies an executable task.

- Description
  > Required text that makes a supported target discoverable.

- Usage
  > Optional descriptive metadata for positional goals or Make variable assignments supplied after the target.

- Category
  > Optional persistent metadata that groups subsequent documented targets and may map them to a built-in Visual Studio Code task group.

## 2. Annotation Syntax

Annotations are line-oriented comments associated with concrete Make rules. Description and usage annotations are pending metadata that apply only to the next supported rule. Category metadata remains active until another valid category header replaces it.

### 2.1. Target Rules

A discovered target name MUST match:

```plaintext
[A-Za-z0-9][A-Za-z0-9_.-]*
```

A supported rule MUST begin at the first character of a line, contain one or more valid target names separated by spaces or tabs, and use `:` or `::` as the rule separator. Prerequisites MAY follow the separator.

Pattern rules, assignments, recipes, unsupported target names, and undocumented rules MUST NOT produce discovered targets.

### 2.2. Descriptions

A supported target MUST have a non-empty preceding or inline description.

- Preceding Description
  > A preceding description begins with `##` after optional leading spaces and applies to the immediately following supported rule.

- Inline Description
  > An inline description uses `## <description>` in the rule remainder. It MAY follow prerequisites and takes precedence over a pending preceding description.

- Consecutive Lines
  > Consecutive non-empty preceding description lines are joined with one space.

- Adjacency
  > Blank lines, ordinary comments, assignments, unsupported constructs, category headers, and recipe lines clear pending description and usage metadata. A line beginning with a tab is recipe content and MUST NOT be interpreted as an annotation or target.

- Multiple Targets
  > A supported rule containing multiple target names produces one discovered target per name. Each target receives the same description and active category.

### 2.3. Usage Metadata

Usage metadata MAY precede a documented target in the following form:

```plaintext
# Usage: make <target> <usage-suffix>
```

`Usage` and `make` are matched case-insensitively. The metadata target name is matched to a discovered target case-sensitively.

Spacer comments containing only `#` and optional horizontal whitespace MAY occur between the usage line and the description. A non-empty, trimmed usage suffix is retained as descriptive text; it does not validate, type, or transform supplied arguments. For a rule containing multiple targets, usage metadata applies only to the target whose name matches the metadata.

### 2.4. Categories

A category header has the following abstract form:

```plaintext
# <separator-run> <category> [<trailing-separator-run>]
```

The leading separator run MUST contain one Unicode punctuation or symbol character repeated at least three times. Whitespace MUST separate the comment marker, separator run, and non-empty category name. A trailing separator run, when present, MUST use the same character as the leading run.

A valid category applies to subsequent documented targets until another valid category header is encountered. Unrelated Makefile constructs do not clear the active category. A category header clears pending description and usage metadata.

## 3. Discovery and Task Behavior

Discovery converts supported annotations and rules into workspace-scoped target records. Task integration converts those records into Visual Studio Code tasks without evaluating Make variables, includes, conditionals, implicit rules, or generated targets.

### 3.1. Discovery

Makefiles MUST be discovered independently within each workspace folder using the configured include globs and exclusion glob. Files containing no documented targets MUST be omitted.

Each discovered target MUST retain its name, description, workspace folder, workspace-relative Makefile path, and source line. Category and usage metadata MUST be retained when present.

Within one Makefile, the first discovered definition of a target name MUST be retained and later duplicate definitions MUST be ignored. The same target name in different Makefiles remains distinct.

### 3.2. Task Definition and Resolution

Discovered targets MUST be available through the `makefileTarget` task type.

| Property | Required | Description |
| --- | --- | --- |
| `type` | Yes | Literal task type `makefileTarget`. |
| `target` | Yes | Target name to execute. |
| `makefile` | No | Workspace-relative Makefile path used to disambiguate the target. |
| `args` | No | Ordered arguments or Make variable assignments appended after the target. |

When `makefile` is present, task resolution MUST match the target name, workspace scope, and workspace-relative Makefile path. When `makefile` is absent, task resolution MUST use the first discovered target with the same name in the task's workspace scope. Explicit `makefile` values SHOULD be used when names are duplicated across Makefiles.

### 3.3. Execution and Arguments

A resolved task MUST execute the configured Make command with this argument order:

```plaintext
<make-command> -f <makefile-name> <target> [arguments...]
```

The working directory MUST be the directory containing the selected Makefile. Arguments declared in `tasks.json` are appended in array order.

Text entered through **Run Target with Arguments** is tokenized without invoking a shell parser. Whitespace separates arguments except inside single or double quotes. Backslash escapes the following character outside single quotes. Quote delimiters are removed, and unterminated quoted input MUST be rejected without executing the task.

### 3.4. Presentation and Refresh

Targets MUST remain distinguishable by workspace folder and Makefile when more than one scope exists. When at least one target in a Makefile has a category, categorized targets MUST be grouped by category and targets without a category MUST appear under **Uncategorized**.

The categories `Build`, `Test`, `Clean`, `Rebuild`, and `Rebuild All` MUST map case-insensitively to the corresponding built-in Visual Studio Code task group. Other category names remain presentation metadata.

Initial discovery and manual refresh MUST be supported. When `makefileTasks.autoRefresh` is enabled, saves to discovered Makefiles, workspace-folder changes, and file events matching `**/{Makefile,makefile,GNUmakefile,*.mk}` schedule a refresh. Files matched only by custom globs outside that watcher pattern MAY require manual refresh after external changes.

Discovery and input errors MUST be reported without terminating extension activation or executing invalid input.

## 4. Configuration

The extension defines the following configuration settings.

| Setting | Default | Purpose |
| --- | --- | --- |
| `makefileTasks.makeCommand` | `make` | Make executable or command supplied to task execution. |
| `makefileTasks.fileGlobs` | `**/Makefile`, `**/makefile`, `**/GNUmakefile` | Workspace-relative Makefile discovery patterns. |
| `makefileTasks.excludeGlob` | `**/{.git,node_modules,vendor,.venv,dist,out}/**` | Glob excluded from discovery. |
| `makefileTasks.autoRefresh` | `true` | Enables refresh scheduling after supported workspace and file events. |
| `makefileTasks.runOnClick` | `true` | Runs a target when its explorer item is selected. |
| `makefileTasks.sort` | `source` | Preserves source order or sorts targets and categories by name. |

## 5. Examples

The examples demonstrate the recognized subset and its resulting metadata. Recipe behavior remains governed by GNU Make.

### 5.1. Documented Target

Example:

```make
## Build the application
build:
	go build ./...
```

The rule produces the target `build` with the description `Build the application`.

The equivalent inline form is:

```make
test: ## Run the test suite
	go test ./...
```

### 5.2. Category and Input

Example:

```make
# === Test ================================================================
# Usage: make test TEST_PATTERN=<pattern>
#
## Run matching tests
test:
	go test ./... -run "$(TEST_PATTERN)"
```

The target belongs to category `Test`, advertises the usage suffix `TEST_PATTERN=<pattern>`, and maps to the built-in test task group. The usage suffix describes accepted input but does not validate it.

### 5.3. Multiple Targets

Example:

```make
## Build both variants.
## Produce release artifacts.
alpha beta:: prerequisites
```

The rule produces `alpha` and `beta` with the description `Build both variants. Produce release artifacts.`

### 5.4. Excluded Constructs

Example:

```make
## Pattern rules are excluded
build-%:

## Assignments are excluded
VALUE := example

undocumented:
	@echo hidden
```

None of these constructs produces a discovered target.

## 6. Terminology

- Documented Target
  > A supported concrete target associated with a non-empty preceding or inline description.

- Pending Metadata
  > Description or usage metadata retained until the next supported rule or invalidated by unrelated input.

- Active Category
  > The most recent valid category header that applies to subsequent documented targets.

- Workspace Scope
  > The Visual Studio Code workspace folder used to discover, distinguish, resolve, and execute a target.

- Usage Suffix
  > The trimmed text following `make <target>` in a usage annotation.

## 7. References

- GNU Project [GNU Make Manual](https://www.gnu.org/software/make/manual/make.html) documentation.
- Visual Studio Code [Tasks](https://code.visualstudio.com/docs/debugtest/tasks) documentation.
- Visual Studio Code [Task Provider](https://code.visualstudio.com/api/extension-guides/task-provider) documentation.
- IETF [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) standard.
- IETF [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174) standard.
- Makefile Tasks [parser](../../src/parser.ts) implementation.
- Makefile Tasks [task provider](../../src/tasks.ts) implementation.
- Makefile Tasks [discovery](../../src/discovery.ts) implementation.
- Makefile Tasks [extension activation](../../src/extension.ts) implementation.
- Makefile Tasks [explorer](../../src/tree.ts) implementation.
- Makefile Tasks [extension manifest](../../package.json) implementation.
