import { describe, expect, it } from 'vitest';

import {
  checkLikeBody, checkReplyBody, likeKey, MAX_IDS, NOT_LIVE, parseExtras, parseIds, parseReply,
  parseResume, REPLY_MAX, resumePayload, writeError,
} from './comments';

// X1-002: hearts + replies on the v11 results comments. The routes check every body with
// these functions, and the page reads every answer through the parsers (never trusts a key).

const A = '0f8fad5b-d9cb-469f-a165-70867728950e';
const B = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

const reply = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: B, comment_id: A, username: 'mina', content: 'Same here', created_at: '2026-09-27T10:00:00Z',
  score: 7, total: 8, avatar_url: null, name_accent: '#7F77DD', name_font: null, bias: 'RM', ...over,
});

describe('checkLikeBody', () => {
  it('accepts { target, id, action } for comments and replies', () => {
    expect(checkLikeBody({ target: 'comment', id: A, action: 'like' })).toEqual({ ok: true, value: { target: 'comment', id: A, action: 'like' } });
    expect(checkLikeBody({ target: 'reply', id: A.toUpperCase(), action: 'unlike' })).toEqual({ ok: true, value: { target: 'reply', id: A, action: 'unlike' } });
  });
  it('refuses anything else', () => {
    for (const b of [null, [], 'x', {}, { target: 'quiz', id: A, action: 'like' }, { target: 'comment', id: 'e2e-1', action: 'like' },
      { target: 'comment', id: A }, { target: 'comment', id: A, action: 'toggle' }]) {
      expect(checkLikeBody(b).ok).toBe(false);
    }
  });
});

describe('checkReplyBody', () => {
  it('trims and keeps 1..200 characters', () => {
    expect(checkReplyBody({ commentId: A, content: '  hi  ' })).toEqual({ ok: true, value: { commentId: A, content: 'hi' } });
    expect(checkReplyBody({ commentId: A, content: 'x'.repeat(REPLY_MAX) }).ok).toBe(true);
  });
  it('refuses empty, too long, a bad parent, a non-string', () => {
    expect(checkReplyBody({ commentId: A, content: '   ' })).toEqual({ ok: false, error: 'empty' });
    expect(checkReplyBody({ commentId: A, content: 'x'.repeat(REPLY_MAX + 1) })).toEqual({ ok: false, error: 'too_long' });
    expect(checkReplyBody({ commentId: 'nope', content: 'hi' })).toEqual({ ok: false, error: 'bad_comment' });
    expect(checkReplyBody({ commentId: A, content: 3 })).toEqual({ ok: false, error: 'content_required' });
    expect(checkReplyBody(null)).toEqual({ ok: false, error: 'invalid_input' });
  });
});

describe('parseIds', () => {
  it('keeps valid uuids once, lower case, at most MAX_IDS', () => {
    expect(parseIds(`${A},bad,${A.toUpperCase()}, ${B}`)).toEqual([A, B]);
    expect(parseIds(null)).toEqual([]);
    const many = Array.from({ length: 80 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`).join(',');
    expect(parseIds(many)).toHaveLength(MAX_IDS);
  });
});

describe('parseExtras (fail closed)', () => {
  it('not live, or not an object: no hearts, no replies', () => {
    for (const raw of [null, undefined, 'x', [], {}, { live: false, likes: { [`comment:${A}`]: 3 } }, { live: 'true' }]) {
      expect(parseExtras(raw)).toEqual(NOT_LIVE);
    }
  });
  it('live: counts, own hearts and replies, bad entries dropped', () => {
    const e = parseExtras({
      live: true,
      likes: { [likeKey('comment', A)]: 3, [likeKey('reply', B)]: 0, [`quiz:${A}`]: 9, [likeKey('comment', B)]: -1, x: '4' },
      liked: [likeKey('comment', A), 7, 'nope'],
      replies: { [A]: [reply(), reply({ id: null }), reply({ comment_id: B })], [B]: 'x' },
    });
    expect(e.live).toBe(true);
    expect(e.likes).toEqual({ [`comment:${A}`]: 3, [`reply:${B}`]: 0 });
    expect(e.liked).toEqual([`comment:${A}`]);
    expect(e.replies[A]).toHaveLength(1);
    expect(e.replies[A]![0]).toMatchObject({ id: B, username: 'mina', score: 7, total: 8, bias: 'RM' });
    expect(e.replies[B]).toBeUndefined();
  });
  it('a reply row needs id, parent, name, text and time; numbers are checked', () => {
    expect(parseReply(reply({ username: '' }))).toBeNull();
    expect(parseReply(reply({ content: undefined }))).toBeNull();
    expect(parseReply(reply({ score: '7', total: 0 }))).toMatchObject({ score: null, total: null });
    expect(parseReply({})).toBeNull();
  });
});

describe('sign-in resume payload', () => {
  it('round-trips the three kinds, and reads the legacy { text }', () => {
    for (const r of [
      { kind: 'comment', text: 'Great quiz' },
      { kind: 'reply', text: 'Same', replyTo: A },
      { kind: 'like', target: 'reply', id: B },
    ] as const) {
      expect(parseResume(resumePayload(r))).toEqual(r);
    }
    expect(parseResume({ text: 'old' })).toEqual({ kind: 'comment', text: 'old' });
  });
  it('drops a malformed payload', () => {
    for (const raw of [null, 'x', {}, { like: { target: 'quiz', id: A } }, { like: { target: 'comment', id: 'x' } }, { text: 'a', replyTo: 'x' }, { text: 3 }]) {
      expect(parseResume(raw)).toBeNull();
    }
  });
});

describe('writeError', () => {
  it('says what happened', () => {
    expect(writeError('like', 503)).toBe('Hearts open soon.');
    expect(writeError('reply', 503)).toBe('Replies open soon.');
    expect(writeError('reply', 429)).toBe('You are replying fast. Try again in a minute.');
    expect(writeError('reply', 400, 'too_long')).toBe('That reply is too long.');
    expect(writeError('like', 404)).toBe('That comment is gone.');
    expect(writeError('like', 500)).toBe('Could not update. Try again.');
    expect(writeError('reply', 0)).toBe('Could not post. Try again.');
  });
  it('no em or en dash in any line', () => {
    for (const s of [writeError('like', 503), writeError('reply', 503), writeError('reply', 429), writeError('reply', 400, 'too_long'), writeError('like', 404), writeError('like', 500), writeError('reply', 500)]) {
      expect(s).not.toMatch(/[\u2013\u2014]/);
    }
  });
});
