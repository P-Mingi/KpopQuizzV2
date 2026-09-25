'use client';

import { Icon } from './icon';
import { Sheet } from './sheet';
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
  /** Saves the 1080 x 1920 story image (page-provided). Hidden when absent. */
  onStoryImage?: () => void | Promise<void>;
  /** Story image as a File for navigator.share where files are supported. */
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
 * block. Bottom sheet on phones. Writes nothing; sharing stays client-side.
 */
export function ShareSheet({ open, onClose, title = 'Share your score', preview, url, text, onStoryImage, storyFile, challenge, inline }: ShareSheetProps): React.ReactElement | null {
  const toast = useUxToast();

  const copyLink = async (): Promise<void> => { toast((await copy(url)) ? 'Link copied' : 'Copy failed. Long-press the link to copy it.'); };
  const discord = async (): Promise<void> => {
    const msg = `${text ? `${text} ` : ''}${url}`;
    toast((await copy(msg)) ? 'Copied a Discord-ready message' : 'Copy failed');
  };
  const more = async (): Promise<void> => {
    const data: ShareData = text ? { title, text, url } : { title, url };
    try {
      const file = storyFile ? await storyFile() : null;
      if (file && navigator.canShare?.({ files: [file] })) data.files = [file];
    } catch { /* share without the image */ }
    if (typeof navigator.share === 'function') {
      try { await navigator.share(data); } catch { /* cancelled */ }
      return;
    }
    await copyLink();
  };

  return (
    <Sheet open={open} onClose={onClose} title={title} width={520} inline={inline}>
      {preview ? (
        <div className="ux-minicard">
          <span className="ux-minicard-pv">
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny run preview, any host */}
            {preview.image ? <img src={preview.image} alt="" /> : null}
          </span>
          <div><b>{preview.line1}</b>{preview.line2 ? <p>{preview.line2}</p> : null}</div>
        </div>
      ) : null}
      <div className="ux-shgrid">
        <button type="button" className="ux-shbtn" onClick={() => { void copyLink(); }}><i><Icon name="link" /></i>Copy link</button>
        {onStoryImage ? <button type="button" className="ux-shbtn" onClick={() => { void onStoryImage(); }}><i><Icon name="img" /></i>Story image</button> : null}
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
