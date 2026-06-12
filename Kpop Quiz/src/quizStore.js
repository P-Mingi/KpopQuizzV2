// quizStore.js — JSON-file persistence for daily-quiz streaks + leaderboard.
// Survives restarts on a host with a real disk (home machine / VPS / mounted
// volume); on an ephemeral host it resets, which is harmless. Every function is
// defensive: a disk error never throws into a live quiz run.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const FILE = join(DIR, 'quiz-scores.json');

export const dateKey = () => new Date().toISOString().split('T')[0];

function load() {
  try { return JSON.parse(readFileSync(FILE, 'utf8')); }
  catch { return { users: {}, daily: {} }; }
}
function save(data) {
  try { mkdirSync(DIR, { recursive: true }); writeFileSync(FILE, JSON.stringify(data, null, 2)); }
  catch (e) { console.error('quizStore save failed:', e.message); }
}

// Record a finished run. Streak increments once per day (consecutive days).
// Daily leaderboard keeps each user's best score for the day. Returns { streak }.
export function recordResult(userId, username, score, total) {
  try {
    const d = load();
    const today = dateKey();
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const u = d.users[userId] || { streak: 0, lastDate: null };
    if (u.lastDate !== today) {
      u.streak = u.lastDate === yesterday ? (u.streak || 0) + 1 : 1;
      u.lastDate = today;
    }
    d.users[userId] = u;

    d.daily[today] = d.daily[today] || {};
    const prev = d.daily[today][userId];
    if (!prev || score > prev.score) d.daily[today][userId] = { username, score, total };

    save(d);
    return { streak: u.streak };
  } catch { return { streak: 0 }; }
}

export function getTodayLeaderboard(limit = 10) {
  try {
    const rows = Object.values(load().daily[dateKey()] || {});
    rows.sort((a, b) => b.score - a.score);
    return rows.slice(0, limit);
  } catch { return []; }
}
