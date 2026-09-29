import { describe, expect, it } from 'vitest';
import { passwordStrength } from './password-strength';

describe('passwordStrength', () => {
  it.each([
    ['', 0, ''],
    ['short', 1, 'Too short'],
    ['lowercase', 1, 'Weak'],
    ['lowercase1', 2, 'Fair'],
    ['longer-lowercase', 3, 'Good'],
    ['Longer-Mixed-Case-1', 4, 'Strong'],
  ])('%j → %i (%s)', (password, score, label) => {
    expect(passwordStrength(password)).toEqual({ score, label });
  });
});
