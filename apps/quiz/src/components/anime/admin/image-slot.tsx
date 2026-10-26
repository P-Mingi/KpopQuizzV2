'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { Icon } from '@/components/ux-v1/icon';
import { UxButton } from '@/components/ux-v1/button';
import { UxField } from '@/components/ux-v1/form';
import {
  CENTER_FOCAL, EMPTY_META, LICENSE_CODES, LICENSE_LABEL, MAX_UPLOAD_BYTES, checkImport, checkUpload, fileProblem, focalFromPoint, nudgeFocal, objectPositionOf,
} from '@/lib/anime/entity-images-rules';

import type { AdminImage, EntityKind, Focal, ImageMeta, LicenseCode, MetaErrors } from '@/lib/anime/entity-images-rules';
import type { ApiResult, UploadHandle } from '@/lib/anime/entity-images-api';

/** What a slot calls on the server: the real one is built from entity-images-api.ts, a test passes its own. */
export interface ImagesApi {
  upload(args: { kind: EntityKind; slug: string; file: File; meta: ImageMeta }, onProgress: (percent: number) => void): UploadHandle;
  importUrl(args: { kind: EntityKind; slug: string; url: string; meta: ImageMeta }): Promise<ApiResult<AdminImage>>;
  focal(args: { kind: EntityKind; slug: string; x: number; y: number }): Promise<ApiResult<AdminImage>>;
  remove(args: { kind: EntityKind; slug: string }): Promise<ApiResult<AdminImage | null>>;
}

export type SlotFrame = 'cover' | 'portrait';

interface SlotProps {
  readonly kind: EntityKind;
  /** The key of the image in the table (a series slug, or `<series>/<character>`). */
  readonly slug: string;
  readonly title: string;
  readonly hint?: string | undefined;
  readonly frame: SlotFrame;
  readonly image: AdminImage | null;
  /** The photo bundled with the site (the list answers { url, alt }), shown when there is no image of the owner's. */
  readonly bundled: { readonly url: string; readonly alt: string } | null;
  readonly api: ImagesApi;
  readonly onChange: (image: AdminImage | null) => void;
}

type Mode = 'view' | 'edit' | 'focal' | 'confirm';

/** The places an image of this slot is drawn on the site, for the preview in place (a box of the ratio and the radius the site uses). */
const PREVIEWS: Readonly<Record<SlotFrame, ReadonlyArray<{ readonly id: string; readonly label: string; readonly cls: string }>>> = {
  cover: [
    { id: 'card', label: 'Quiz card', cls: 'anime-adm-pv-card' },
    { id: 'header', label: 'Series header', cls: 'anime-adm-pv-header' },
    { id: 'row', label: 'Row', cls: 'anime-adm-pv-row' },
  ],
  portrait: [
    { id: 'tile', label: 'Character tile', cls: 'anime-adm-pv-tile' },
    { id: 'result', label: 'Quiz result', cls: 'anime-adm-pv-result' },
  ],
};

const sizeWords = (bytes: number): string => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/**
 * One image slot of the admin: the current picture (the owner's, else the bundled photo, else a neutral placeholder), a preview of how it
 * looks where the site draws it, and the ways to change it: drag a file in or press Upload, or paste an address and press Import. The
 * source, the author and the licence are required before anything is saved. Replace, Remove (back to the bundled photo or the placeholder)
 * and Set focal point (a click on the picture, or the arrow keys then Enter) act on the owner's image. Escape closes whatever is open.
 */
export function ImageSlot({ kind, slug, title, hint, frame, image, bundled, api, onChange }: SlotProps): React.ReactElement {
  const uid = useId();
  const [mode, setMode] = useState<Mode>('view');
  const [meta, setMeta] = useState<ImageMeta>(EMPTY_META);
  const [errors, setErrors] = useState<MetaErrors>({});
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'upload' | 'import' | 'focal' | 'remove' | null>(null);
  const [progress, setProgress] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<Focal>(image ? { x: image.focalX, y: image.focalY } : CENTER_FOCAL);
  const fileInput = useRef<HTMLInputElement>(null);
  const upload = useRef<UploadHandle | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLElement>(null);
  const focusAfter = useRef<string | null>(null);

  // The staged file is previewed from an object URL, released when it changes or the slot goes away.
  useEffect(() => {
    if (!file) { setFileUrl(null); return; }
    const u = URL.createObjectURL(file);
    setFileUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  // When a panel closes, the key that opened it is where the keyboard lands again (the panel's own controls are gone).
  useEffect(() => {
    if (mode !== 'view' || !focusAfter.current) return;
    root.current?.querySelector<HTMLElement>(`[data-act="${focusAfter.current}"]`)?.focus();
    focusAfter.current = null;
  }, [mode]);

  useEffect(() => { if (image) setPending({ x: image.focalX, y: image.focalY }); }, [image]);

  const shownSrc = fileUrl ?? image?.url ?? bundled?.url ?? null;
  const shownAlt = fileUrl ? 'The file you chose' : image ? title : bundled?.alt ?? '';
  const position = mode === 'focal' ? objectPositionOf(pending) : image ? objectPositionOf({ x: image.focalX, y: image.focalY }) : 'center';
  const source = image ? 'Your image' : bundled ? 'Bundled photo' : 'No image yet';

  const close = (): void => {
    if (busy) return;
    focusAfter.current = 'edit';
    setMode('view');
    setFile(null);
    setUrl('');
    setUrlError(null);
    setErrors({});
    setProblem(null);
    setProgress(0);
  };

  const choose = (f: File | null | undefined): void => {
    if (!f) return;
    const p = fileProblem({ name: f.name, size: f.size, type: f.type });
    if (p) { setProblem(p); setFile(null); return; }
    setProblem(null);
    setFile(f);
  };

  const saved = (next: AdminImage, words: string): void => {
    onChange(next);
    setBusy(null);
    focusAfter.current = 'edit';
    setMode('view');
    setFile(null);
    setUrl('');
    setProgress(0);
    setProblem(null);
    setMeta(EMPTY_META);
    setNotice(words);
  };

  const doUpload = (): void => {
    const check = checkUpload(file ? { name: file.name, size: file.size, type: file.type } : null, meta);
    setErrors(check.ok ? {} : check.errors);
    if (!check.ok) { setProblem(check.problem ?? null); return; }
    if (!file) return;
    setProblem(null);
    setNotice(null);
    setBusy('upload');
    setProgress(0);
    const handle = api.upload({ kind, slug, file, meta }, setProgress);
    upload.current = handle;
    void handle.result.then((r) => {
      upload.current = null;
      if (r.ok) saved(r.value, 'Saved. The picture is live within a few minutes.');
      else { setBusy(null); setProblem(r.message); }
    });
  };

  const doImport = (): void => {
    const check = checkImport(url, meta);
    setErrors(check.ok ? {} : check.errors);
    setUrlError(check.ok ? null : check.urlError ?? null);
    if (!check.ok) return;
    setProblem(null);
    setNotice(null);
    setBusy('import');
    void api.importUrl({ kind, slug, url: check.url, meta }).then((r) => {
      if (r.ok) saved(r.value, 'Imported. The picture is live within a few minutes.');
      else { setBusy(null); setProblem(r.message); }
    });
  };

  const commitFocal = (f: Focal): void => {
    setProblem(null);
    setNotice(null);
    setBusy('focal');
    void api.focal({ kind, slug, x: f.x, y: f.y }).then((r) => {
      setBusy(null);
      if (r.ok) { onChange(r.value); focusAfter.current = 'focal'; setMode('view'); setNotice('Focal point saved.'); }
      else setProblem(r.message);
    });
  };

  const doRemove = (): void => {
    setProblem(null);
    setNotice(null);
    setBusy('remove');
    void api.remove({ kind, slug }).then((r) => {
      setBusy(null);
      if (r.ok) { onChange(null); focusAfter.current = 'edit'; setMode('view'); setNotice(bundled ? 'Removed. The bundled photo shows again.' : 'Removed. The neutral placeholder shows again.'); }
      else setProblem(r.message);
    });
  };

  const onFocalClick = (e: React.MouseEvent<HTMLButtonElement>): void => {
    // A keyboard press (Enter or Space) reports no pointer: it saves the point the arrow keys chose.
    if (e.detail === 0) { commitFocal(pending); return; }
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    const f = focalFromPoint(r, e.clientX, e.clientY);
    setPending(f);
    commitFocal(f);
  };

  const onFocalKey = (e: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (e.key === 'Escape') { e.stopPropagation(); focusAfter.current = 'focal'; setMode('view'); setPending(image ? { x: image.focalX, y: image.focalY } : CENTER_FOCAL); return; }
    if (e.key.startsWith('Arrow')) { e.preventDefault(); setPending(nudgeFocal(pending, e.key, e.shiftKey ? 10 : 2)); }
  };

  const onPanelKey = (e: React.KeyboardEvent<HTMLElement>): void => {
    if (e.key === 'Escape' && !busy) { e.stopPropagation(); close(); }
  };

  const set = <K extends keyof ImageMeta>(k: K, v: ImageMeta[K]): void => {
    setMeta((m) => ({ ...m, [k]: v }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const id = (n: string): string => `${uid}-${n}`;
  const editing = mode === 'edit';

  return (
    <section ref={root} className={`anime-adm-slot anime-adm-slot-${frame}`} aria-labelledby={id('t')} data-testid={`slot-${slug}`} data-kind={kind} data-state={image ? 'owner' : bundled ? 'bundled' : 'empty'}>
      <header className="anime-adm-slot-h">
        <h3 id={id('t')} className="anime-adm-slot-t">{title}</h3>
        <span className={`anime-adm-badge${image ? ' anime-adm-badge-on' : ''}`}>{source}</span>
      </header>
      {hint ? <p className="anime-adm-hint">{hint}</p> : null}

      <div className="anime-adm-stage">
        <div ref={box} className={`anime-adm-frame anime-adm-frame-${frame}`}>
          {shownSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- a picture of the admin: the stored file or the chosen file, any size, no optimizer
            <img className="anime-adm-img" src={shownSrc} alt={shownAlt} style={{ objectPosition: position }} />
          ) : (
            <span className="anime-adm-ph" role="img" aria-label="Neutral placeholder: no image"><Icon name="img" size="lg" /><span>No image</span></span>
          )}
          {mode === 'focal' ? (
            <>
              <span className="anime-adm-dot" style={{ left: `${pending.x}%`, top: `${pending.y}%` }} aria-hidden="true" />
              <button
                type="button"
                className="anime-adm-hit"
                aria-label="Set focal point. Click the picture, or use the arrow keys and press Enter. Escape cancels."
                onClick={onFocalClick}
                onKeyDown={onFocalKey}
                disabled={busy === 'focal'}
                autoFocus
              />
            </>
          ) : null}
        </div>

        {shownSrc && !editing ? (
          <details className="anime-adm-pv">
            <summary>Preview in place</summary>
            <ul className="anime-adm-pv-list" aria-label="How the picture looks on the site">
              {PREVIEWS[frame].map((p) => (
                <li key={p.id}>
                  <span className={`anime-adm-pv-box ${p.cls}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- same picture as above, smaller */}
                    <img src={shownSrc} alt="" style={{ objectPosition: position }} />
                  </span>
                  <small>{p.label}</small>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>

      {image ? (
        <p className="anime-adm-credit-line" data-testid="slot-credit">
          <a href={image.sourceUrl} rel="noopener noreferrer" target="_blank">{image.author}</a>, {LICENSE_LABEL[image.license]}
          {image.licenseNote ? ` (${image.licenseNote})` : ''}
        </p>
      ) : null}

      {notice ? <p className="anime-adm-notice" role="status">{notice}</p> : null}
      {problem && !editing ? <p className="ux-err anime-adm-error" role="alert">{problem}</p> : null}

      {mode === 'view' || mode === 'confirm' || mode === 'focal' ? (
        <div className="anime-adm-actions">
          <UxButton variant="ghost" size="sm" data-act="edit" icon={image ? 'redo' : 'upload'} onClick={() => { setNotice(null); setMode('edit'); }} disabled={busy !== null}>{image ? 'Replace' : 'Add image'}</UxButton>
          {image ? (
            <>
              <UxButton variant="ghost" size="sm" data-act="focal" icon="target" aria-pressed={mode === 'focal'} onClick={() => { setNotice(null); focusAfter.current = null; setMode(mode === 'focal' ? 'view' : 'focal'); }} disabled={busy !== null}>Set focal point</UxButton>
              <UxButton variant="ghost" size="sm" data-act="remove" icon="trash" onClick={() => { setNotice(null); setMode('confirm'); }} disabled={busy !== null}>Remove</UxButton>
            </>
          ) : null}
        </div>
      ) : null}

      {mode === 'confirm' ? (
        <div className="anime-adm-confirm" role="alertdialog" aria-label={`Remove the image of ${title}`} onKeyDown={(e) => { if (e.key === 'Escape' && !busy) { e.stopPropagation(); focusAfter.current = 'remove'; setMode('view'); } }}>
          <p>Remove this image? {bundled ? 'The bundled photo shows again.' : 'The neutral placeholder shows again.'}</p>
          <div className="anime-adm-actions">
            <UxButton size="sm" icon="trash" onClick={doRemove} disabled={busy !== null}>{busy === 'remove' ? 'Removing' : 'Yes, remove'}</UxButton>
            <UxButton variant="ghost" size="sm" onClick={() => { focusAfter.current = 'remove'; setMode('view'); }} disabled={busy !== null} autoFocus>Keep it</UxButton>
          </div>
        </div>
      ) : null}

      {editing ? (
        <div className="anime-adm-edit" onKeyDown={onPanelKey} data-testid="slot-edit">
          <fieldset className="anime-adm-meta" disabled={busy !== null}>
            <legend>Where this picture comes from (required)</legend>
            <UxField label="Source URL" htmlFor={id('src')} error={errors.source_url ?? null}>
              <input id={id('src')} className="ux-inp" autoFocus type="url" inputMode="url" placeholder="https://" value={meta.source_url} onChange={(e) => set('source_url', e.target.value)} aria-invalid={errors.source_url ? true : undefined} autoComplete="off" />
            </UxField>
            <UxField label="Author" htmlFor={id('au')} error={errors.author ?? null}>
              <input id={id('au')} className="ux-inp" type="text" value={meta.author} onChange={(e) => set('author', e.target.value)} aria-invalid={errors.author ? true : undefined} autoComplete="off" />
            </UxField>
            <UxField label="Licence" htmlFor={id('li')} error={errors.license ?? null}>
              <select id={id('li')} className="ux-inp" value={meta.license} onChange={(e) => set('license', e.target.value as LicenseCode | '')} aria-invalid={errors.license ? true : undefined}>
                <option value="">Choose a licence</option>
                {LICENSE_CODES.map((c) => <option key={c} value={c}>{LICENSE_LABEL[c]}</option>)}
              </select>
            </UxField>
            <UxField label="Licence note" hint={meta.license === 'other' ? 'Required' : 'Optional'} htmlFor={id('no')} error={errors.license_note ?? null}>
              <input id={id('no')} className="ux-inp" type="text" value={meta.license_note} onChange={(e) => set('license_note', e.target.value)} aria-invalid={errors.license_note ? true : undefined} autoComplete="off" />
            </UxField>
          </fieldset>

          <div
            className={`anime-adm-drop${dragging ? ' anime-adm-drop-on' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); choose(e.dataTransfer.files[0]); }}
          >
            <Icon name="upload" size="lg" />
            <p>{file ? <><b>{file.name}</b> ({sizeWords(file.size)})</> : <>Drag a picture here, or</>}</p>
            <UxButton variant="ghost" size="sm" icon="upload" onClick={() => fileInput.current?.click()} disabled={busy !== null}>{file ? 'Choose another file' : 'Upload'}</UxButton>
            <input
              ref={fileInput}
              className="anime-adm-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              aria-label={`Choose a file for ${title}`}
              tabIndex={-1}
              onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ''; }}
            />
            <small>JPEG, PNG, WebP, GIF or AVIF, up to {MAX_UPLOAD_BYTES / (1024 * 1024)} MB.</small>
          </div>

          <form className="anime-adm-url" onSubmit={(e) => { e.preventDefault(); doImport(); }} noValidate>
            <UxField label="Paste image URL" htmlFor={id('url')} error={urlError}>
              <div className="anime-adm-url-row">
                <input id={id('url')} className="ux-inp" type="url" inputMode="url" placeholder="https://" value={url} onChange={(e) => { setUrl(e.target.value); setUrlError(null); }} aria-invalid={urlError ? true : undefined} disabled={busy !== null} autoComplete="off" />
                <UxButton variant="ghost" icon="link" type="submit" disabled={busy !== null}>{busy === 'import' ? 'Importing' : 'Import'}</UxButton>
              </div>
            </UxField>
          </form>

          {busy === 'upload' ? (
            <div className="anime-adm-progress">
              <span className="anime-adm-bar" role="progressbar" aria-label="Upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></span>
              <span>Uploading {progress}%</span>
              <UxButton variant="quiet" size="sm" onClick={() => upload.current?.cancel()}>Cancel</UxButton>
            </div>
          ) : null}
          {busy === 'import' ? <p className="anime-adm-progress" role="status">Importing the picture from the address...</p> : null}
          {problem ? <p className="ux-err anime-adm-error" role="alert">{problem}</p> : null}

          <div className="anime-adm-actions">
            <UxButton icon="check" onClick={doUpload} disabled={busy !== null || !file}>{busy === 'upload' ? 'Uploading' : image ? 'Replace with this file' : 'Save this file'}</UxButton>
            <UxButton variant="ghost" onClick={close} disabled={busy !== null}>Cancel</UxButton>
          </div>
        </div>
      ) : null}
    </section>
  );
}
