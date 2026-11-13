'use client';

// Lot 3 DLE (owner decision of 2026-11-13): the button "Supprimer les images non libres" of the Photos tab (Personnages anime). The selection is
// computed on the server (lib/entity-images/non-free.ts), at the preview and again at the click: this component only shows the counts and
// 10 examples, refuses when the server says it is too big, asks for the word SUPPRIMER, and sends that word with the counts it was shown.
import { useEffect, useRef, useState } from 'react';

import { callNonFree } from './api';
import s from './photos-admin.module.css';

import type { NonFreePreview, NonFreeReport } from './api';

/** The word to type, and the sentence of the counts (rows, their files, orphans), in the admin's French. */
export const CONFIRM_WORD = 'SUPPRIMER';

export const fr = (n: number): string => String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');

export function countsLine(c: NonFreePreview['counts']): string {
  return `${fr(c.rows)} ${c.rows === 1 ? 'image' : 'images'}, ${fr(c.files)} ${c.files === 1 ? 'fichier' : 'fichiers'} à supprimer avec elles, ${fr(c.orphans)} ${c.orphans === 1 ? 'fichier orphelin' : 'fichiers orphelins'}.`;
}

export function refusalLine(p: Pick<NonFreePreview, 'counts' | 'max'>): string {
  return `${fr(p.counts.rows)} images sélectionnées, plus que ${fr(p.max)} : suppression refusée, rien n'est supprimé.`;
}

export function reportLine(r: NonFreeReport): string {
  const done = `Supprimé : ${fr(r.rows)} ${r.rows === 1 ? 'image' : 'images'}, ${fr(r.files)} ${r.files === 1 ? 'fichier' : 'fichiers'}, ${fr(r.orphans)} ${r.orphans === 1 ? 'fichier orphelin' : 'fichiers orphelins'}.`;
  return r.failedChunks > 0 ? `${done} ${fr(r.failedChunks)} lot(s) ont échoué : ouvre l'aperçu de nouveau pour voir ce qui reste.` : done;
}

type Step =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'preview'; preview: NonFreePreview }
  | { kind: 'deleting'; preview: NonFreePreview }
  | { kind: 'done'; report: NonFreeReport };

export function NonFreePanel({ onDone }: { onDone?: () => void }): React.ReactElement {
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  const [word, setWord] = useState('');
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { if (step.kind === 'preview' && !step.preview.tooMany) input.current?.focus(); }, [step.kind, step]);

  const open = async (): Promise<void> => {
    setError(null); setWord(''); setStep({ kind: 'loading' });
    const res = await callNonFree<NonFreePreview>({ action: 'preview' });
    if (!res.ok) { setStep({ kind: 'idle' }); setError(res.error); return; }
    setStep({ kind: 'preview', preview: res.data });
  };

  const run = async (preview: NonFreePreview): Promise<void> => {
    setError(null); setStep({ kind: 'deleting', preview });
    const res = await callNonFree<{ report: NonFreeReport }>({ action: 'delete', confirm: word, expect: preview.counts });
    if (!res.ok) { setStep({ kind: 'idle' }); setError(res.error); return; }
    setStep({ kind: 'done', report: res.data.report }); setWord('');
    onDone?.();
  };

  const busy = step.kind === 'loading' || step.kind === 'deleting';
  const preview = step.kind === 'preview' || step.kind === 'deleting' ? step.preview : null;

  return (
    <section aria-labelledby="nf-h" className={s.where}>
      <h2 id="nf-h" className={s.whereTitle}>Images non libres</h2>
      <p className={s.whereText}>
        Les images de personnages venues d&apos;un site de fans ou des illustrations officielles ne sont pas libres. La sélection est calculée par le serveur,
        puis recalculée au clic : elle ne prend que les images jamais vérifiées de l&apos;import du 11 novembre 2026 (« Official artwork ») et celles en CC0 dont la source est Fandom.
      </p>
      <div className={s.actions}>
        <button type="button" className={s.danger} disabled={busy || step.kind === 'preview'} onClick={() => void open()}>Supprimer les images non libres</button>
        {step.kind === 'preview' ? <button type="button" className={s.secondary} onClick={() => { setStep({ kind: 'idle' }); setWord(''); }}>Annuler</button> : null}
      </div>
      <div role="status" aria-live="polite">
        {step.kind === 'loading' ? <p className={s.note}>Calcul de la sélection sur le serveur…</p> : null}
        {step.kind === 'done' ? <p className={s.status}>{reportLine(step.report)}</p> : null}
      </div>
      {error ? <p role="alert" className={`${s.status} ${s.statusErr}`}>{error}</p> : null}
      {preview ? (
        <PreviewBlock preview={preview} word={word} deleting={step.kind === 'deleting'} inputRef={input} onWord={setWord} onRun={() => void run(preview)} />
      ) : null}
    </section>
  );
}

/** The counts, the examples, then either the refusal (over the limit), "nothing to delete", or the word field and the final button. */
export function PreviewBlock({ preview, word, deleting, inputRef, onWord, onRun }: {
  preview: NonFreePreview; word: string; deleting: boolean; inputRef?: React.Ref<HTMLInputElement>; onWord: (v: string) => void; onRun: () => void;
}): React.ReactElement {
  return (
    <div>
      <p className={s.status}>{countsLine(preview.counts)}</p>
      {preview.examples.length > 0 ? (
        <>
          <p className={s.note}>{preview.examples.length === 1 ? 'Un exemple' : `${preview.examples.length} exemples`} :</p>
          <ul className={s.note}>
            {preview.examples.map((e) => <li key={e.slug}><code>{e.slug}</code> ({e.license}, {e.why})</li>)}
          </ul>
        </>
      ) : null}
      {preview.tooMany ? <p role="alert" className={`${s.status} ${s.statusErr}`}>{refusalLine(preview)}</p> : preview.counts.rows === 0 && preview.counts.orphans === 0 ? (
        <p className={s.note}>Rien à supprimer.</p>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); if (word === CONFIRM_WORD && !deleting) onRun(); }}>
          <div className={s.fld}>
            <label htmlFor="nf-word">Tape {CONFIRM_WORD} pour confirmer. La suppression est définitive.</label>
            <input id="nf-word" ref={inputRef} type="text" value={word} autoComplete="off" autoCapitalize="characters" spellCheck={false} onChange={(e) => onWord(e.target.value)} />
          </div>
          <div className={s.actions}>
            <button type="submit" className={s.danger} disabled={word !== CONFIRM_WORD || deleting}>{deleting ? 'Suppression en cours…' : 'Supprimer maintenant'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
