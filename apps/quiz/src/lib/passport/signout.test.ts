// Run O1, lot (e), lane B7: the sign-out library (apis.md 3.6 last paragraph; registry auth.signOutModes).
import { describe, expect, it } from 'vitest';

import { signOut, signOutModesFor, signOutScopeFor } from './signout';

function client() {
  const scopes: string[] = [];
  return { scopes, auth: { signOut: async (o: { scope: string }) => { scopes.push(o.scope); return { error: null }; } } };
}

describe('sign-out scopes', () => {
  it('anime and hub offer global and local; kpop offers global only (unchanged)', () => {
    expect(signOutModesFor('anime')).toEqual(['global', 'local']);
    expect(signOutModesFor('hub')).toEqual(['global', 'local']);
    expect(signOutModesFor('kpop')).toEqual(['global']);
  });

  it('a requested scope the site offers is used; anything else is global', () => {
    expect(signOutScopeFor('local', 'anime')).toBe('local');
    expect(signOutScopeFor('local', 'hub')).toBe('local');
    expect(signOutScopeFor('global', 'anime')).toBe('global');
    expect(signOutScopeFor(undefined, 'anime')).toBe('global');
    expect(signOutScopeFor('local', 'kpop')).toBe('global');
    expect(signOutScopeFor('bogus' as 'local', 'hub')).toBe('global');
  });

  it('signOut calls supabase.auth.signOut with that scope and returns it', async () => {
    const c = client();
    expect(await signOut(c, 'local', 'anime')).toBe('local');
    expect(await signOut(c, 'local', 'kpop')).toBe('global');
    expect(await signOut(c, undefined, 'hub')).toBe('global');
    expect(c.scopes).toEqual(['local', 'global', 'global']);
  });

  it('a failing call reaches the caller', async () => {
    const bad = { auth: { signOut: async () => { throw new Error('network'); } } };
    await expect(signOut(bad, 'global', 'anime')).rejects.toThrow('network');
  });

  it('a returned { error } is a failure too, on every site (supabase-js does not throw)', async () => {
    const bad = { auth: { signOut: async () => ({ error: new Error('401 – session not found') }) } };
    await expect(signOut(bad, 'global', 'hub')).rejects.toThrow('session not found');
    await expect(signOut(bad, 'local', 'anime')).rejects.toThrow('session not found');
    await expect(signOut(bad, 'global', 'kpop')).rejects.toThrow('session not found');
  });

  it('no error: the scope is returned, whatever else the call returns', async () => {
    const none = { auth: { signOut: async () => undefined } };
    const nul = { auth: { signOut: async () => ({ error: null }) } };
    expect(await signOut(none, 'global', 'kpop')).toBe('global');
    expect(await signOut(nul, 'local', 'hub')).toBe('local');
  });
});
