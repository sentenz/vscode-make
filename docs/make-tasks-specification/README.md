# Make Tasks Specification

The Make Tasks Specification is a lightweight convention for documenting Makefile targets and exposing them as Visual Studio Code tasks. It defines the annotation syntax recognized by the Makefile Tasks extension and the externally observable behavior produced from those annotations.

This specification covers only the supported annotation subset. GNU Make remains authoritative for Makefile syntax and execution.

## Summary

A documented target uses a preceding description:

```make
## Build the application
build:
	go build ./...
```

or an inline description:

```make
test: ## Run the test suite
	go test ./...
```

Optional category and usage metadata may precede the target:

```make
# --- Secrets --------------------------------------------------------------
# Usage: make secrets-decrypt <files>
#
## Decrypt one or more files
secrets-decrypt:
	@for file in $(filter-out $@,$(MAKECMDGOALS)); do \
		decrypt "$$file"; \
	done
```

The convention has four structural elements:

1. **Target**: a concrete Make target name.
2. **Description**: required text that makes the target discoverable.
3. **Usage**: optional text describing positional arguments or Make variable assignments.
4. **Category**: optional persistent metadata used to group related targets.

## Specification

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are interpreted as described in RFC 2119 and RFC 8174.

1. A discovered target name MUST match `[A-Za-z0-9][A-Za-z0-9_.-]*`. A supported rule MUST begin at the first character of a line, contain one or more target names separated by spaces or tabs, and use `:` or `::` as the rule separator.

2. A target MUST have a non-empty description. A preceding description MUST begin with `##` after optional leading spaces and apply to the immediately following supported rule. An inline description MUST use `## <description>` in the rule remainder and take precedence over a preceding description.

3. Consecutive preceding description lines MUST be joined with one space. A rule containing multiple valid target names MUST produce one discovered target per name, with the same description and active category.

4. Pending description and usage metadata MUST be cleared by blank lines, ordinary comments, assignments, unsupported constructs, category headers, and recipe lines. A line beginning with a tab MUST be treated as recipe content and MUST NOT be parsed as an annotation or target.

5. Undocumented rules, invalid names, pattern rules such as `build-%`, assignments, recipes, and duplicate target definitions MUST NOT be exposed. For duplicate names, the first discovered definition in a Makefile MUST be retained.

6. Usage metadata MAY precede a documented target in the form `# Usage: make <target> <usage-suffix>`. `Usage` and `make` MUST be matched case-insensitively, while the metadata target name MUST match the discovered target name case-sensitively.

7. Spacer comments containing only `#` and optional spaces MAY occur between usage metadata and the description. The trimmed usage suffix MUST be retained as descriptive text and MUST NOT validate or transform supplied arguments. For a multi-target rule, usage metadata applies only to the matching target.

8. A category header MAY use `# <separator><separator><separator> <category> [trailing separators]`. The leading separator MUST be one Unicode punctuation or symbol character repeated at least three times, with whitespace separating `#`, the separator run, and the category name.

9. A valid category MUST apply to subsequent documented targets until another valid category header is encountered. Unrelated Makefile constructs MUST NOT clear the active category.

10. Makefiles MUST be discovered independently within each workspace folder. Files containing no documented targets MUST be omitted. Each discovered target MUST retain its name, description, workspace folder, Makefile path, and source line, plus category and usage metadata when present.

11. Discovered targets MUST be available through the Visual Studio Code task type `makefileTarget`. Its definition MUST require `target` and MAY contain `makefile` and `args`.

12. When `makefile` is present, task resolution MUST match the workspace-relative Makefile path. When it is absent, the first matching target in the task's workspace scope MAY be used.

13. Task execution MUST use the configured Make command as `<make-command> -f <makefile-name> <target> [arguments...]`, with the Makefile directory as the working directory.

14. Arguments supplied through **Run Target with Arguments** MUST be split without invoking a shell parser. Whitespace separates arguments except inside single or double quotes; backslash escapes the following character outside single quotes. Unterminated quoted input MUST be rejected.

15. Categories named `Build`, `Test`, `Clean`, `Rebuild`, or `Rebuild All` MUST map case-insensitively to the corresponding Visual Studio Code task group. When any target in a Makefile has a category, uncategorized targets MUST appear under **Uncategorized**.

16. Multiple workspace folders and Makefiles MUST remain distinguishable. Initial and manual refresh MUST be supported; automatic refresh SHOULD occur after configured Makefile changes when `makefileTasks.autoRefresh` is enabled. Discovery and input errors MUST be reported without terminating extension activation or executing an invalid task.

Changes to supported annotation syntax or externally observable task behavior SHOULD update this specification and corresponding regression tests in the same change.

## Task Configuration

Explicit tasks use the `makefileTarget` task type:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "makefileTarget",
      "target": "secrets-decrypt",
      "makefile": "Makefile",
      "args": [
        "secrets/example.yaml.enc",
        "ENV=development"
      ]
    }
  ]
}
```

| Property | Required | Description |
| --- | --- | --- |
| `type` | Yes | MUST be `makefileTarget`. |
| `target` | Yes | Target name to execute. |
| `makefile` | No | Workspace-relative Makefile path used to disambiguate the target. |
| `args` | No | Ordered positional goals or Make variable assignments appended after the target. |

The extension provides the following configuration:

| Setting | Default | Purpose |
| --- | --- | --- |
| `makefileTasks.makeCommand` | `make` | Make executable or command. |
| `makefileTasks.fileGlobs` | `**/Makefile`, `**/makefile`, `**/GNUmakefile` | Workspace-relative discovery patterns. |
| `makefileTasks.excludeGlob` | `**/{.git,node_modules,vendor,.venv,dist,out}/**` | Discovery exclusion pattern. |
| `makefileTasks.autoRefresh` | `true` | Refresh after matching file changes. |
| `makefileTasks.runOnClick` | `true` | Run a target when its explorer item is selected. |
| `makefileTasks.sort` | `source` | Preserve source order or sort by name. |

## Examples

### Multiple Targets

```make
## Build both variants.
## Produce release artifacts.
alpha beta:: prerequisites
```

The rule produces `alpha` and `beta` with the description `Build both variants. Produce release artifacts.`

### Category and Usage

```make
# === Test ================================================================
# Usage: make test TEST_PATTERN=<pattern>
#
## Run matching tests
test:
	go test ./... -run "$(TEST_PATTERN)"
```

The target belongs to category `Test`, advertises `TEST_PATTERN=<pattern>`, and maps to the Visual Studio Code test task group.

### Arguments

```text
secrets/example.yaml.enc secrets/other.yaml.enc
ENV=development
MESSAGE="hello world"
path\ with\ spaces
```

These inputs produce ordered arguments after the selected target. Quotation marks group whitespace and are removed during tokenization.

### Excluded Constructs

```make
## Pattern rules are not discovered
build-%:

## Assignments are not targets
VALUE := example

undocumented:
	@echo hidden
```

None of these constructs produces a discovered target.

## Why Use Make Tasks

- **Discoverability**: documented targets become visible without duplicating them in editor-specific configuration.
- **Consistency**: one annotation format drives the explorer, task picker, task details, and target navigation.
- **Input Support**: usage metadata communicates positional goals and Make variable assignments without prescribing Makefile semantics.
- **Workspace Integration**: targets participate in Visual Studio Code tasks while retaining their Makefile and workspace identity.
- **Determinism**: adjacency, naming, duplicate, and category rules produce stable discovery results.

## References

- GNU Make [Manual](https://www.gnu.org/software/make/manual/make.html) documentation.
- Visual Studio Code [Tasks](https://code.visualstudio.com/docs/debugtest/tasks) documentation.
- Visual Studio Code [Task Provider](https://code.visualstudio.com/api/extension-guides/task-provider) documentation.
- IETF [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) standard.
- IETF [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174) standard.
- Conventional Commits [Specification 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) specification.
- Semantic Versioning [Specification 2.0.0](https://semver.org/) specification.
- Makefile Tasks [parser](../../src/parser.ts) implementation.
- Makefile Tasks [task provider](../../src/tasks.ts) implementation.
- Makefile Tasks [discovery](../../src/discovery.ts) implementation.
- Makefile Tasks [extension activation](../../src/extension.ts) implementation.
