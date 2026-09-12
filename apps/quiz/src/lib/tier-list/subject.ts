import type { SubjectKind } from './types';

export const SUBJECT_KIND_LABEL: Record<SubjectKind, string> = {
  members: 'members',
  tracks: 'title tracks',
  albums: 'albums',
  all: 'everything',
  blank: 'blank',
};

const KINDS: SubjectKind[] = ['members', 'tracks', 'albums', 'all', 'blank'];
export function parseKind(v: string | undefined): SubjectKind {
  return (KINDS as string[]).includes(v ?? '') ? (v as SubjectKind) : 'blank';
}
