'use client';

import { useState } from 'react';

import { UxButton } from '@/components/ux-v1/button';
import { PhoneButtons } from '@/components/ux-v1/phone-buttons';
import { downloadFile, STORY_KIT_GRADIENT, storyCardFile, storyFormat } from '@/components/ux-v1/story-image';

import type { StoryFormat } from '@/components/ux-v1/story-image';

// Client demos of the v12 kit: the phone answer buttons (open, then locked on the
// tapped answer) and the two story image files (drawn in the browser, saved
// locally: no network, no write).

function Phone({ name, children }: { name: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="ux-kit-phone" data-kit={name}>
      <div className="ux-kit-phone-scr">
        <div className="ux-kit-phone-top"><span>kpopquiz.org/join</span><b>K7Q2P</b></div>
        {children}
      </div>
    </div>
  );
}

export function KitPhones(): React.ReactElement {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="ux-kit-phones">
      <Phone name="phone-open">
        <PhoneButtons onAnswer={setPicked} locked={picked} />
        <div className="ux-kit-phone-foot">
          <span data-kit="phone-status">{picked === null ? 'Tap an answer' : `Locked in: answer ${picked + 1}`}</span>
          {picked === null ? <b>0 pts</b> : <button type="button" className="ux-lnk" onClick={() => setPicked(null)}>Reset</button>}
        </div>
      </Phone>
      <Phone name="phone-locked">
        <PhoneButtons onAnswer={() => undefined} locked={0} />
        <div className="ux-kit-phone-foot"><span>Locked in · 2.4 s</span><b>0 pts</b></div>
      </Phone>
    </div>
  );
}

export function KitStoryFiles(): React.ReactElement {
  const [made, setMade] = useState<string | null>(null);
  const save = async (format: StoryFormat): Promise<void> => {
    const file = await storyCardFile({
      image: null,
      format,
      gradient: STORY_KIT_GRADIENT,
      tag: 'New quiz',
      kicker: 'KATSEYE quiz',
      line1: 'Only real EYEKONS get 8/8',
      cta: 'Play at kpopquiz.org',
    });
    if (!file) { setMade('The browser could not draw the image.'); return; }
    const { width, height } = storyFormat(format);
    downloadFile(file);
    setMade(`${file.name} saved (${width} x ${height}, ${file.size.toLocaleString('en-US')} bytes)`);
  };
  return (
    <div className="ux-kit-row">
      <UxButton variant="ghost" size="sm" icon="img" onClick={() => { void save('story'); }}>Story</UxButton>
      <UxButton variant="ghost" size="sm" icon="img" onClick={() => { void save('square'); }}>Square</UxButton>
      <span className="ux-muted" style={{ fontSize: 14 }} role="status" data-kit="story-file">{made ?? ''}</span>
    </div>
  );
}
