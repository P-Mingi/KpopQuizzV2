'use client';

import { useEffect, useMemo, useRef } from 'react';

import { CoverImg } from './cover-img';
import { Icon } from './icon';
import { Sheet } from './sheet';
import { downloadFile, storyCardFile } from './story-image';
import { useUxToast } from './toast';

export interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  /** Sheet title ("Share your score", "Share this post"). */
  title?: string;
  /** Mini card: photo + two lines, all from the actual run (16.7: score, beat %, rank). */
  preview?: { image?: string | null; line1: string; line2?: string };
  /** Absolute URL to share (canonical page or the /s/ short link). */
  url: string;
  /** Text for navigator.share and the Discord message. */
  text?: string;
  /** Saves the 1080 x 1920 story image (page-provided). When absent and a preview is
   *  given, the sheet draws a default story card from the preview (story-image.ts). */
  onStoryImage?: () => void | Promise<void>;
  /** Story image as a File for navigator.share where files are supported (defaults to
   *  the preview's story card, like onStoryImage). */
  storyFile?: () => Promise<File | null>;
  /** Challenge link block (challenge runs): url + "48 hours" note. */
  challenge?: { url: string; note?: string; help?: string };
  /** Kit gallery only: render in the page flow. */
  inline?: boolean;
}

async function copy(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

/**
 * Share sheet (DESIGN-SPEC 16.7): mini card with the real numbers, then Copy link,
 * Story image, More apps (navigator.share, with the story image as a file where
 * supported) and Discord (copies a Discord-ready message). Optional challenge link
 * block. Bottom sheet on phones. Writes nothing; sharing stays client-side. The
 * default Story image (no onStoryImage) shares the drawn card as a file where the
 * browser can, and saves it as a download otherwise.
 */
export function ShareSheet({ open, onClose, title = 'Share your score', preview, url, text, onStoryImage, storyFile, challenge, inline }: ShareSheetProps): React.ReactElement | null {
  const toast = useUxToast();
  // The prototype focuses Copy link when the sheet opens (openShare: sh-copy.focus()).
  const copyRef = useRef<HTMLButtonElement>(null);

  // X2-008: the prototype's sheet always has the Story image tile. A page that passes
  // no story of its own gets a card drawn from the preview; it is drawn once per open
  // (started on open, so a click can hand it to navigator.share while the tap still
  // counts as a user gesture).
  const img = preview?.image ?? null;
  const line1 = preview?.line1;
  const line2 = preview?.line2;
  const card = useMemo(() => (line1 !== undefined ? { image: img, line1, line2 } : null), [img, line1, line2]);
  const drawn = useRef<Promise<File | null> | null>(null);
  useEffect(() => { drawn.current = null; }, [card]);
  const defaultFile = useMemo(() => (card ? (): Promise<File | null> => {
    drawn.current ??= storyCardFile(card).catch(() => null);
    return drawn.current;
  } : null), [card]);
  useEffect(() => {
    if (open && defaultFile && !onStoryImage && !storyFile) void defaultFile();
  }, [open, defaultFile, onStoryImage, storyFile]);
  const fileFor = storyFile ?? defaultFile ?? undefined;
  const saveDefault = async (): Promise<void> => {
    const file = defaultFile ? await defaultFile() : null;
    if (!file) { toast('Could not make the story image'); return; }
    if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title }); return; } catch (e) {
        if ((e as { name?: string } | null)?.name === 'AbortError') return; // the viewer closed the share sheet
      }
    }
    downloadFile(file);
    toast('Story image saved');
  };
  const story = onStoryImage ?? (defaultFile ? saveDefault : undefined);

  const copyLink = async (): Promise<void> => { toast((await copy(url)) ? 'Link copied' : 'Copy failed. Long-press the link to copy it.'); };
  const discord = async (): Promise<void> => {
    const msg = `${text ? `${text} ` : ''}${url}`;
    toast((await copy(msg)) ? 'Copied a Discord-ready message' : 'Copy failed');
  };
  const more = async (): Promise<void> => {
    const data: ShareData = text ? { title, text, url } : { title, url };
    try {
      const file = fileFor ? await fileFor() : null;
      if (file && navigator.canShare?.({ files: [file] })) data.files = [file];
    } catch { /* share without the image */ }
    if (typeof navigator.share === 'function') {
      try { await navigator.share(data); } catch { /* cancelled */ }
      return;
    }
    await copyLink();
  };

  return (
    <Sheet open={open} onClose={onClose} title={title} width={520} inline={inline} initialFocus={copyRef}>
      {preview ? (
        <div className="ux-minicard">
          <span className="ux-minicard-pv">
            {preview.image ? <CoverImg src={preview.image} alt="" /> : null}
          </span>
          <div><b>{preview.line1}</b>{preview.line2 ? <p>{preview.line2}</p> : null}</div>
        </div>
      ) : null}
      <div className="ux-shgrid">
        <button ref={copyRef} type="button" className="ux-shbtn" onClick={() => { void copyLink(); }}><i><Icon name="link" /></i>Copy link</button>
        {story ? <button type="button" className="ux-shbtn" onClick={() => { void story(); }}><i><Icon name="img" /></i>Story image</button> : null}
        <button type="button" className="ux-shbtn" onClick={() => { void more(); }}><i><Icon name="share" /></i>More apps</button>
        <button type="button" className="ux-shbtn" onClick={() => { void discord(); }}><i><Icon name="msg" /></i>Discord</button>
      </div>
      {challenge ? (
        <div>
          <div className="ux-flabel" style={{ marginTop: 24 }}>Challenge link <small>{challenge.note ?? 'They play your exact questions · 48 hours'}</small></div>
          <div className="ux-urlbox">
            <span>{challenge.url.replace(/^https?:\/\//, '')}</span>
            <button type="button" className="ux-btn ux-btn-quiet ux-btn-sm" onClick={async () => { toast((await copy(challenge.url)) ? 'Link copied' : 'Copy failed'); }}>Copy</button>
          </div>
          <p className="ux-help">{challenge.help ?? 'Anyone with the link can play until it expires.'}</p>
        </div>
      ) : null}
    </Sheet>
  );
}
