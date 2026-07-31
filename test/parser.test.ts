import { describe, expect, it } from 'vitest';
import { parseMakefile, splitArguments } from '../src/parser';

describe('parseMakefile', () => {
  it('parses preceding and inline documentation', () => {
    const result = parseMakefile(`
## Build the application
build: dependencies

test: ## Run the test suite
	go test ./...
`);

    expect(result).toEqual([
      { name: 'build', description: 'Build the application', line: 2 },
      { name: 'test', description: 'Run the test suite', line: 4 },
    ]);
  });

  it('requires documentation to be immediately adjacent', () => {
    const result = parseMakefile(`
## This no longer applies
VARIABLE := value
undocumented:

## Included
included:
`);

    expect(result).toEqual([
      { name: 'included', description: 'Included', line: 6 },
    ]);
  });

  it('combines consecutive documentation lines and expands multiple targets', () => {
    const result = parseMakefile(`## First sentence.
## Second sentence.
alpha beta:: prerequisite
`);

    expect(result).toEqual([
      { name: 'alpha', description: 'First sentence. Second sentence.', line: 2 },
      { name: 'beta', description: 'First sentence. Second sentence.', line: 2 },
    ]);
  });

  it('parses matching Usage metadata with positional and variable arguments', () => {
    const result = parseMakefile(`# Usage: make secrets-sops-decrypt <files>
#
## Decrypt specified files
secrets-sops-decrypt:

# Usage: make secrets-gpg-import [SECRETS_SOPS_UID=<uid>] <key-files>
#
## Import GPG keys
secrets-gpg-import:

# Usage: make another-target <file>
#
## View one file
secrets-sops-view:
`);

    expect(result).toEqual([
      {
        name: 'secrets-sops-decrypt',
        description: 'Decrypt specified files',
        usage: '<files>',
        line: 3,
      },
      {
        name: 'secrets-gpg-import',
        description: 'Import GPG keys',
        usage: '[SECRETS_SOPS_UID=<uid>] <key-files>',
        line: 8,
      },
      { name: 'secrets-sops-view', description: 'View one file', line: 13 },
    ]);
  });

  it('invalidates Usage metadata when another Makefile construct intervenes', () => {
    const result = parseMakefile(`# Usage: make scan SAST_FILES=<files>
SAST_FILES ?= .
## Scan files
scan:
`);

    expect(result).toEqual([
      { name: 'scan', description: 'Scan files', line: 3 },
    ]);
  });

  it('assigns persistent categories from canonical section headers', () => {
    const result = parseMakefile(`# ─── Skills Manager ───────────────────────────────────────────────
## Provision skills
skills-agent-add:

VARIABLE := value
skills-agent-update: ## Update skills

# --- Dependencies ---------------------------------------------------------
dependency-update: ## Update dependencies

# === Secrets
secrets-encrypt: ## Encrypt secrets
`);

    expect(result).toEqual([
      { name: 'skills-agent-add', description: 'Provision skills', category: 'Skills Manager', line: 2 },
      { name: 'skills-agent-update', description: 'Update skills', category: 'Skills Manager', line: 5 },
      { name: 'dependency-update', description: 'Update dependencies', category: 'Dependencies', line: 8 },
      { name: 'secrets-encrypt', description: 'Encrypt secrets', category: 'Secrets', line: 11 },
    ]);
  });

  it('requires whitespace and at least three repeated separator signs for categories', () => {
    const result = parseMakefile(`# ── Too Short ─────────────────────────
short: ## Not categorized

#─── Missing Space ──────────────────────
compact: ## Not categorized either

# ─── Valid ─────────────────────────────
valid: ## Categorized
`);

    expect(result).toEqual([
      { name: 'short', description: 'Not categorized', line: 1 },
      { name: 'compact', description: 'Not categorized either', line: 4 },
      { name: 'valid', description: 'Categorized', category: 'Valid', line: 7 },
    ]);
  });

  it('accepts punctuation and symbol separators but rejects format characters', () => {
    const result = parseMakefile(`# \u200D\u200D\u200D Invisible \u200D\u200D\u200D
format: ## Not categorized

# ___ Build ___
build: ## Build application

# ### Test ###
test: ## Run tests
`);

    expect(result).toEqual([
      { name: 'format', description: 'Not categorized', line: 1 },
      { name: 'build', description: 'Build application', category: 'Build', line: 4 },
      { name: 'test', description: 'Run tests', category: 'Test', line: 7 },
    ]);
  });

  it('ignores pattern rules, assignments, recipes, and duplicate definitions', () => {
    const result = parseMakefile(`## Ignore pattern
build-%:
## Ignore assignment
VALUE := x
## Keep concrete
build:
## Duplicate is suppressed
build:
	## recipe comment
	other:
`);

    expect(result).toEqual([
      { name: 'build', description: 'Keep concrete', line: 5 },
    ]);
  });
});

describe('splitArguments', () => {
  it('supports quoted and escaped values', () => {
    expect(splitArguments(`ENV=dev MESSAGE="hello world" path\\ with\\ spaces 'single value'`)).toEqual([
      'ENV=dev',
      'MESSAGE=hello world',
      'path with spaces',
      'single value',
    ]);
  });

  it('rejects unterminated quotes', () => {
    expect(() => splitArguments(`"unfinished`)).toThrow('Unterminated quoted argument.');
  });
});
