import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

// Password hashing with scrypt (built into Node, no dependency). scrypt is
// deliberately slow and memory-hungry, so a stolen table of hashes is expensive
// to crack. The parameters are stored with each hash, so they can be raised
// later without breaking existing passwords.
//
//   scrypt$<N>$<r>$<p>$<salt base64>$<hash base64>

const PARAMS = { N: 2 ** 15, r: 8, p: 1 };
const KEY_LENGTH = 64;
const MAX_MEMORY = 64 * 1024 * 1024;

type Params = typeof PARAMS;

function derive(password: string, salt: Buffer, { N, r, p }: Params): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, { N, r, p, maxmem: MAX_MEMORY }, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, PARAMS);
  const { N, r, p } = PARAMS;
  return ['scrypt', N, r, p, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, N, r, p, salt, hash] = stored.split('$');
  if (algorithm !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = await derive(password, Buffer.from(salt, 'base64'), {
    N: Number(N),
    r: Number(r),
    p: Number(p),
  });
  // Constant-time comparison: how long it takes reveals nothing about the hash.
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
