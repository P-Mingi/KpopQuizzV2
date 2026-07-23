// H1 - anonymous creation draft. localStorage-primary (decision a: no new DB
// table). Survives reloads + the OAuth redirect (localStorage persists). The
// cover is held as a compressed data URL until publish, when it is uploaded to
// the existing quiz-images bucket (the upload route requires auth, which the
// funnel only has at publish).

export interface DraftQuestion {
  question: string;
  answers: [string, string, string, string];
  correctIndex: number | null;
  /** Optional reveal-time blurb shown after each question (server: fun_fact). */
  funFact?: string;
}

/** Difficulty is creator-selectable (Q-B1). Older drafts predate this field, so
 *  it is optional here and defaults to 'medium' on load. */
export type DraftDifficulty = 'easy' | 'medium' | 'hard';

export interface Draft {
  title: string;
  group_slug: string | null;
  /** Q-B1: name of a brand-new custom group the creator typed (sent as
   *  group_name at publish). Mutually exclusive with group_slug. */
  newGroup?: string | null;
  /** Q-B1: creator-selected difficulty (was hardcoded 'medium'). */
  difficulty?: DraftDifficulty;
  cover: string | null; // data URL (anonymous) or an https URL (already uploaded)
  coverRights?: boolean; // H9: the user confirmed they have the right to use the cover
  questions: DraftQuestion[];
  updatedAt: number;
}

// H9 - cover guardrail (client mirror of the server upload-route rules). Accept
// only JPEG/PNG/WebP and cap the RAW file at 5MB *before* client compression.
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_COVER_BYTES = 5 * 1024 * 1024;

/** Returns a human-readable error if the picked file is the wrong type or too
 *  large, or null when it is acceptable. Mirrored authoritatively on the server. */
export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return 'That file type is not supported. Use a JPG, PNG, or WebP image.';
  }
  if (file.size > MAX_COVER_BYTES) {
    return `That image is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please use one under 5MB.`;
  }
  return null;
}

const KEY = 'kq_create_draft_v1';
const STEP_KEY = 'kq_create_step_v1';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function blankQuestion(): DraftQuestion {
  return { question: '', answers: ['', '', '', ''], correctIndex: null, funFact: '' };
}

export function isQuestionComplete(q: DraftQuestion): boolean {
  return q.question.trim().length > 0 && q.answers.every((a) => a.trim().length > 0) && q.correctIndex !== null;
}

export function completeCount(questions: DraftQuestion[]): number {
  return questions.filter(isQuestionComplete).length;
}

export function loadDraft(): Draft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    if (!d || typeof d.updatedAt !== 'number' || Date.now() - d.updatedAt > MAX_AGE_MS) {
      clearDraft(); // expired or malformed - drop it
      return null;
    }
    if (!Array.isArray(d.questions)) d.questions = [blankQuestion()];
    return d;
  } catch {
    return null;
  }
}

/** Save the draft (stamps updatedAt). Falls back to saving without the cover if
 *  the data-URL cover blows the localStorage quota, so text still persists. */
export function saveDraft(d: Omit<Draft, 'updatedAt'>): void {
  if (typeof window === 'undefined') return;
  const payload: Draft = { ...d, updatedAt: Date.now() };
  try {
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...payload, cover: null }));
    } catch {
      // storage blocked - in-memory only for this session
    }
  }
}

export function clearDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(STEP_KEY);
  } catch {
    // ignore
  }
}

export function loadStep(): number | null {
  if (typeof window === 'undefined') return null;
  const n = Number(localStorage.getItem(STEP_KEY));
  return n >= 1 && n <= 3 ? n : null; // never restore into the share screen
}

export function saveStep(step: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STEP_KEY, String(step));
  } catch {
    // ignore
  }
}

/** Resize + re-encode an image File to a compact JPEG data URL so it fits in
 *  localStorage and survives the OAuth redirect. Uploaded for real at publish. */
export async function compressImageToDataUrl(file: File, maxDim = 1280, quality = 0.82): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('decode failed'));
    image.src = dataUrl;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

/** data URL -> File, for the upload route at publish time. */
export async function dataUrlToFile(dataUrl: string, name = 'cover.jpg'): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], name, { type: blob.type || 'image/jpeg' });
}
