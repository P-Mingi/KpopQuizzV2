// Server-side NSFW check of a community photo (owner, 2026-10-06): nsfwjs, its MobileNetV2
// model bundled in the nsfwjs package (no account, no network call, nothing hosted
// elsewhere), on the pure-JS TensorFlow CPU backend, which runs in a Vercel function.
// Measured on a laptop: model load about 2.7 s once per instance, then about 0.7 s a photo.
//
// The verdict blocks Porn and Hentai only. "Sexy" alone never blocks: idol stage and
// concert photos score high on it (a STAYC concert photo: Sexy 0.73).
// Server only (Node runtime).

import type * as NsfwJs from 'nsfwjs';

export interface NsfwScores { Porn: number; Hentai: number; Sexy: number; Neutral: number; Drawing: number }

export const NSFW_RULE = { porn: 0.6, hentai: 0.6, sum: 0.7 } as const;

/** true = refuse the photo. */
export function isNsfw(s: NsfwScores): boolean {
  return s.Porn >= NSFW_RULE.porn || s.Hentai >= NSFW_RULE.hentai || s.Porn + s.Hentai >= NSFW_RULE.sum;
}

let modelP: Promise<NsfwJs.NSFWJS> | null = null;

async function loadModel(): Promise<NsfwJs.NSFWJS> {
  const tf = await import('@tensorflow/tfjs');
  const nsfwjs = await import('nsfwjs');
  await tf.setBackend('cpu');
  await tf.ready();
  return nsfwjs.load('MobileNetV2', { size: 224 });
}

function model(): Promise<NsfwJs.NSFWJS> {
  if (!modelP) {
    modelP = loadModel();
    modelP.catch(() => { modelP = null; }); // a failed load is retried on the next photo
  }
  return modelP;
}

export interface NsfwResult { scores: NsfwScores; nsfw: boolean; ms: { load: number; decode: number; classify: number } }

/** Decode a JPEG and classify it. Throws 'bad_image' when the bytes are not a readable JPEG. */
export async function classifyJpeg(bytes: Uint8Array): Promise<NsfwResult> {
  const t0 = Date.now();
  const m = await model();
  const t1 = Date.now();
  const tf = await import('@tensorflow/tfjs');
  const jpeg = (await import('jpeg-js')).default;
  let raw: { width: number; height: number; data: Uint8Array };
  try {
    raw = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: false, maxResolutionInMP: 40, maxMemoryUsageInMB: 512 });
  } catch {
    throw new Error('bad_image');
  }
  const t2 = Date.now();
  const img = tf.tensor3d(raw.data, [raw.height, raw.width, 3], 'int32');
  let preds: Array<{ className: string; probability: number }>;
  try {
    preds = await m.classify(img);
  } finally {
    img.dispose();
  }
  const scores: NsfwScores = { Porn: 0, Hentai: 0, Sexy: 0, Neutral: 0, Drawing: 0 };
  for (const p of preds) if (p.className in scores) scores[p.className as keyof NsfwScores] = p.probability;
  return { scores, nsfw: isNsfw(scores), ms: { load: t1 - t0, decode: t2 - t1, classify: Date.now() - t2 } };
}
