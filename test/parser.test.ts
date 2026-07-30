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
    expect(splitArguments(`ENV=dev MESSAGE="hello world" path\ with\ spaces 'single value'`)).toEqual([
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
