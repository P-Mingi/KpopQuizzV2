// Shared helpers of the daily quiz bank scripts (Mission U, owner 2026-10-15). Local tools:
// they read the database with the service role key from apps/quiz/.env.local, READ ONLY,
// and never write to it. The owner applies the generated SQL himself.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createClient } from '@supabase/supabase-js';

export interface McQuestion { question: string; options: string[]; correct: number; fun_fact: string; source: string }
export interface TfQuestion { question: string; correct: boolean; fun_fact: string; source: string }
export interface LotQuiz {
  scheduled_date: string;
  title: string;
  description: string;
  group_slug: string | null;
  category: 'group_specific' | 'knowledge' | 'era' | 'fun' | 'true_false';
  quiz_type: 'multiple_choice' | 'true_false';
  difficulty: 'easy' | 'medium' | 'hard';
  questions: Array<McQuestion | TfQuestion>;
  sources?: string[];
}

const APP = resolve(new URL('.', import.meta.url).pathname, '../..');

export function env(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(resolve(APP, '.env.local'), 'utf8').split('\n')) {
    const i = line.indexOf('=');
    if (i > 0 && !line.trim().startsWith('#')) out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, '');
  }
  return out;
}

/** A read-only service role client (local scripts only; the key never leaves .env.local). */
export function readClient() {
  const e = env();
  const url = e.NEXT_PUBLIC_SUPABASE_URL;
  const key = e.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed in apps/quiz/.env.local');
  return createClient(url, key, { auth: { persistSession: false } });
}

export function loadLots(paths: string[]): LotQuiz[] {
  return paths.flatMap((p) => JSON.parse(readFileSync(resolve(p), 'utf8')) as LotQuiz[]);
}

/** Normalized text for duplicate checks: lowercase, letters and digits only, single spaces. */
export function norm(s: string): string {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export async function fetchAll<T>(make: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await make(from, from + 999);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}
