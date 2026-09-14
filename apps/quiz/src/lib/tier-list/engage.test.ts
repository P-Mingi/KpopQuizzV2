import { describe, it, expect } from 'vitest';

import { resolveAnonId, resolveLike } from './engage';

const UUID_A = '11111111-1111-1111-1111-111111111111';
const UUID_B = '22222222-2222-2222-2222-222222222222';

describe('resolveAnonId (cookie is the identity)', () => {
  it('cookie wins and is never overridden by the body', () => {
    expect(resolveAnonId(UUID_A, UUID_B)).toEqual({ anonId: UUID_A, mintCookie: false });
  });
  it('mints from the body only when there is no cookie', () => {
    expect(resolveAnonId(null, UUID_B)).toEqual({ anonId: UUID_B, mintCookie: true });
  });
  it('keeps the cookie when the body is missing', () => {
    expect(resolveAnonId(UUID_A, undefined)).toEqual({ anonId: UUID_A, mintCookie: false });
  });
  it('is null when neither cookie nor body is a valid uuid', () => {
    expect(resolveAnonId(null, 'not-a-uuid')).toEqual({ anonId: null, mintCookie: false });
    expect(resolveAnonId('garbage', undefined)).toEqual({ anonId: null, mintCookie: false });
  });
  it('a garbage cookie falls back to minting from a valid body', () => {
    expect(resolveAnonId('garbage', UUID_B)).toEqual({ anonId: UUID_B, mintCookie: true });
  });
});

describe('resolveLike (toggle idempotency)', () => {
  it('first like inserts', () => { expect(resolveLike(false, 'like')).toEqual({ op: 'insert', liked: true }); });
  it('second like is a no-op', () => { expect(resolveLike(true, 'like')).toEqual({ op: 'none', liked: true }); });
  it('unlike removes', () => { expect(resolveLike(true, 'unlike')).toEqual({ op: 'delete', liked: false }); });
  it('unlike when not liked is a no-op', () => { expect(resolveLike(false, 'unlike')).toEqual({ op: 'none', liked: false }); });
  it('no action toggles from the current state', () => {
    expect(resolveLike(false)).toEqual({ op: 'insert', liked: true });
    expect(resolveLike(true)).toEqual({ op: 'delete', liked: false });
  });
});
