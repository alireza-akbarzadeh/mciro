import { MIN_PASSWORD_LENGTH } from '@micro-shop/auth-api/api-types';

// A hint for the sign-up form, not a rule: the API only enforces the minimum
// length. Longer beats cleverer, so length counts twice.

export type Strength = { score: 0 | 1 | 2 | 3 | 4; label: string };

export function passwordStrength(password: string): Strength {
  if (!password) return { score: 0, label: '' };
  if (password.length < MIN_PASSWORD_LENGTH) return { score: 1, label: 'Too short' };

  const points =
    1 +
    Number(password.length >= 12) +
    Number(/[a-z]/.test(password) && /[A-Z]/.test(password)) +
    Number(/\d/.test(password) || /[^A-Za-z0-9]/.test(password));
  const score = Math.min(points, 4) as Strength['score'];
  return { score, label: ['', 'Weak', 'Fair', 'Good', 'Strong'][score] ?? '' };
}
