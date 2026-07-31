import { describe, expect, it } from 'vitest';
import { codeSpan } from '../src/markdown';

describe('codeSpan', () => {
  it('preserves Markdown punctuation inside code spans', () => {
    expect(codeSpan('make secrets-gpg-import [SECRETS_SOPS_UID=<uid>] <key-files>')).toBe(
      '`make secrets-gpg-import [SECRETS_SOPS_UID=<uid>] <key-files>`',
    );
  });

  it('uses a longer delimiter and padding for embedded boundary backticks', () => {
    expect(codeSpan('`literal`')).toBe('`` `literal` ``');
    expect(codeSpan('make show ``literal``')).toBe('``` make show ``literal`` ```');
  });
});
