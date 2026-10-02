// G8 (V12): the words of the share kit (SYSTEM.md 5.4, prototype #kit). Pure.
// Every caption is built from the published quiz itself: its title, its group,
// the group's real fandom name (left out when the group has none) and its real
// question count. Nothing here invents a score or a number.

export interface KitQuiz {
  title: string;
  slug: string;
  questions: number;
  group: string | null;
  /** The real fandom name ("EYEKON"), null when the group has none on record. */
  fandom: string | null;
}

export interface KitCaption {
  id: 'x' | 'short';
  /** Where it is meant to go. TikTok: the word only (run rule 10). */
  label: string;
  text: string;
}

/** "kpopquiz.org/q/slug" from a full URL: the link as a fan types it. */
export function bareUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

/** A hashtag from a name: letters and digits only ("Stray Kids" -> "#StrayKids"). Null when nothing is left. */
export function hashtag(name: string | null | undefined): string | null {
  const t = (name ?? '').normalize('NFKD').replace(/[^\p{L}\p{N}]/gu, '');
  return t ? `#${t}` : null;
}

function plural(fandom: string): string {
  return /s$/i.test(fandom) ? fandom : `${fandom}s`;
}

/** The two ready-to-post captions. `link` is the creator's tracked link. */
export function kitCaptions(q: KitQuiz, link: string): KitCaption[] {
  const url = bareUrl(link);
  const group = q.group?.trim() || null;
  const fans = q.fandom ? plural(q.fandom) : group ? `${group} fans` : 'K-pop fans';
  const tags = [hashtag(group), hashtag(q.fandom)].filter(Boolean).join(' ');
  const what = group ? `my new ${group} quiz` : 'my new K-pop quiz';
  const n = q.questions > 0 ? `${q.questions} ${q.questions === 1 ? 'question' : 'questions'}` : null;
  return [
    {
      id: 'x',
      label: 'X (Twitter)',
      text: [`${q.title}. Calling all ${fans}: try ${what}.`, url, tags].filter(Boolean).join(' '),
    },
    {
      id: 'short',
      label: 'TikTok and Instagram',
      text: `I made a ${group ? `${group} ` : 'K-pop '}quiz: ${q.title}.${n ? ` ${n}.` : ''} Link in bio.`,
    },
  ];
}

/** Kicker of the story image: "KATSEYE quiz". */
export function kitKicker(q: Pick<KitQuiz, 'group'>): string {
  return q.group ? `${q.group} quiz` : 'K-pop quiz';
}
