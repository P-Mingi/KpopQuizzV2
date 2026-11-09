import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/profile/follow-button', () => ({ FollowButton: () => null }));
vi.mock('@/components/layout/world-link', () => ({ WorldLink: (p: { href: string; children: unknown }) => createElement('a', { href: p.href }, p.children as never) }));

import { PersonCard } from './person-card';

const person = { username: 'njeansstan', avatarUrl: null, avatarBg: '#fff', avatarText: '#000', xp: 4000, followerCount: 3 };

// Audit 04 P0-2: on the legacy quiz page a Team creator carries the Team badge and "by the KpopQuiz Team", no fan level.
describe('PersonCard on a Team quiz', () => {
  it('shows the Team badge and the Team byline, no level', () => {
    const html = renderToStaticMarkup(createElement(PersonCard, { person: { ...person, isTeam: true }, compact: true }));
    expect(html).toContain('ux-teamtag');
    expect(html).toContain('by the KpopQuiz Team');
    expect(html).not.toMatch(/Lv \d/);
  });
  it('a fan card is unchanged: level line, no Team badge', () => {
    const html = renderToStaticMarkup(createElement(PersonCard, { person, compact: true }));
    expect(html).toMatch(/Lv \d/);
    expect(html).not.toContain('ux-teamtag');
    expect(html).not.toContain('KpopQuiz Team');
  });
});
