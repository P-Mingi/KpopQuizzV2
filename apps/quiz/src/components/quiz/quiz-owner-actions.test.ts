import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { viewerRole } from './quiz-owner-actions';

const profile = { username: 'mina', display_name: null, avatar_url: null, avatar_bg: '#ED93B1', avatar_text: '#FFFFFF' };

describe('QuizOwnerActions: who sees what', () => {
  it('a visitor, a loading state or a signed-out answer sees nothing', () => {
    expect(viewerRole(null, 'u-1')).toBe('none');
    expect(viewerRole({ profile: null }, 'u-1')).toBe('none');
    expect(viewerRole({ profile, is_admin: true }, 'u-1')).toBe('none');
  });

  it('the creator gets the owner actions, even when also an admin', () => {
    expect(viewerRole({ id: 'u-1', profile }, 'u-1')).toBe('owner');
    expect(viewerRole({ id: 'u-1', is_admin: true, profile }, 'u-1')).toBe('owner');
  });

  it('an admin who is not the creator gets the admin removal, anyone else nothing', () => {
    expect(viewerRole({ id: 'u-2', is_admin: true, profile }, 'u-1')).toBe('admin');
    expect(viewerRole({ id: 'u-2', is_admin: false, profile }, 'u-1')).toBe('none');
    expect(viewerRole({ id: 'u-2', profile }, null)).toBe('none');
  });

  it('ships no supabase-js: the component reads the shared /api/auth/me result', () => {
    const src = readFileSync(fileURLToPath(new URL('./quiz-owner-actions.tsx', import.meta.url)), 'utf8');
    expect(src).not.toMatch(/@\/lib\/supabase\/client/);
    expect(src).toContain('useUxMe()');
  });
});
