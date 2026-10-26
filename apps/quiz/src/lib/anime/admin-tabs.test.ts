import { describe, expect, it } from 'vitest';

import { ADMIN_TABS, adminGate, adminTabOf } from './admin-tabs';

describe('the tabs of /admin', () => {
  it('opens on Images and keeps room for more', () => {
    expect(ADMIN_TABS[0]).toEqual({ id: 'images', label: 'Images' });
    expect(adminTabOf(undefined)).toBe('images');
    expect(adminTabOf('overview')).toBe('overview');
    expect(adminTabOf('nope')).toBe('images');
    expect(adminTabOf(['overview', 'images'])).toBe('images');
  });
});

describe('the gate of /admin', () => {
  const isAdmin = (id: string): boolean => id === 'admin-1';
  it('lets a signed-in admin through', () => {
    expect(adminGate('admin-1', isAdmin)).toBe('ok');
  });
  it('is a 404 for a visitor and for an account that is not an admin', () => {
    expect(adminGate(undefined, isAdmin)).toBe('notfound');
    expect(adminGate(null, isAdmin)).toBe('notfound');
    expect(adminGate('', isAdmin)).toBe('notfound');
    expect(adminGate('user-2', isAdmin)).toBe('notfound');
  });
});
