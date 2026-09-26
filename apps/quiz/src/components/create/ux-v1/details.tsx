'use client';

import { useState } from 'react';

import { UxCheckbox } from '@/components/ux-v1/form';
import { Icon } from '@/components/ux-v1/icon';
import { Segmented } from '@/components/ux-v1/segmented';
import { CREATOR_NOTE_MAX } from '@/lib/quiz/creator-note';
import { LANGUAGES } from '@/lib/languages';
import { ACCEPTED_IMAGE_TYPES } from '@/lib/create-draft';
import { DIFFICULTIES, MIN_TITLE, TITLE_MAX, TITLE_PLACEHOLDER } from '@/lib/ux-v1/p5/funnel';
import { DIFFICULTY_HELP, TYPE_ROWS, groupHelp, visibleGroups } from '@/lib/ux-v1/p5/view';

import { GroupField } from './group-field';

import type { DraftDifficulty } from '@/lib/create-draft';
import type { DetailsGate, FunnelGroup } from '@/lib/ux-v1/p5/funnel';
import type { CreateFunnel } from '@/lib/ux-v1/p5/use-create-funnel';

// Step 1 (prototype #cp-1): title, about, the 5 quiz types (native radios), group,
// difficulty, language, cover + rights. Values and rules are the EXISTS funnel's
// (use-create-funnel.ts); `shown` = the gaps found when the fan tried to go on.

const DUP_HINT = 'A quiz with this exact name already exists. Add your angle (era, difficulty, B-sides...) so both can shine. It is not blocked.';

export function P5Details({ f, groups, shown }: { f: CreateFunnel; groups: FunnelGroup[]; shown: DetailsGate | null }): React.ReactElement {
  const d = f.data;
  const [dragOver, setDragOver] = useState(false);
  const titleErr = shown !== null && !shown.title && d.title.trim().length < MIN_TITLE;
  const groupErr = shown !== null && !shown.group && !d.group_slug && !d.newGroup;
  const rightsErr = shown !== null && !shown.rights && !!d.cover && !d.coverRights;

  const onFiles = (files: FileList | null): void => {
    const file = files?.[0];
    if (file) void f.pickCover(file);
  };

  return (
    <div className="p5-pane" data-step="1">
      <div className="ux-field">
        <label htmlFor="p5-title">Quiz title <small>{MIN_TITLE} characters or more</small></label>
        <input
          id="p5-title"
          className="ux-inp p5-inp-big"
          value={d.title}
          onChange={(e) => f.setTitle(e.target.value)}
          placeholder={TITLE_PLACEHOLDER}
          maxLength={TITLE_MAX}
          autoComplete="off"
          aria-invalid={titleErr || undefined}
          aria-describedby="p5-title-e"
        />
        <p className={`ux-help${titleErr ? ' p5-err' : f.titleDup ? ' p5-warn' : ''}`} id="p5-title-e" role={titleErr ? 'alert' : undefined}>
          {titleErr ? `Add at least ${MIN_TITLE} characters.` : f.titleDup ? DUP_HINT : null}
        </p>
      </div>

      <div className="ux-field">
        <label htmlFor="p5-about">About your quiz <small className="ux-num">{d.creatorNote.length} / {CREATOR_NOTE_MAX}</small></label>
        <textarea
          id="p5-about"
          className="ux-inp"
          maxLength={CREATOR_NOTE_MAX}
          value={d.creatorNote}
          onChange={(e) => f.setNote(e.target.value)}
          placeholder="e.g. My hardest ARMY quiz yet, focused on the B-sides most fans skip."
          aria-describedby="p5-about-h"
        />
        <p className="ux-help" id="p5-about-h">Shown on your quiz page and in Google results.</p>
      </div>

      <div className="ux-field">
        <div className="ux-flabel" id="p5-type-l">Quiz type <small>Locked once you add questions</small></div>
        <div className="p5-opts" role="radiogroup" aria-labelledby="p5-type-l">
          {TYPE_ROWS.map((t) => {
            const on = d.quiz_type === t.value;
            const off = f.typeLocked && !on;
            return (
              <label key={t.value} className={['p5-opt', on ? 'is-on' : '', off ? 'is-off' : ''].filter(Boolean).join(' ')}>
                <input type="radio" name="p5-type" value={t.value} checked={on} disabled={off} onChange={() => f.setType(t.value)} />
                <span className="p5-rd" aria-hidden="true" />
                <Icon name={t.icon} />
                <span className="p5-opt-t"><b>{t.label}</b><small>{t.desc}</small></span>
                <span className="p5-opt-ex">{t.example}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="ux-field">
        <label htmlFor="p5-group-q">Group <small>{visibleGroups(groups).length} groups</small></label>
        <GroupField
          groups={groups}
          selectedSlug={d.group_slug}
          customGroup={d.newGroup}
          onSelect={f.selectGroup}
          onCreate={f.createGroup}
          onClear={f.clearGroup}
          invalid={groupErr}
          describedBy="p5-group-h"
        />
        <p className={`ux-help${groupErr ? ' p5-err' : ''}`} id="p5-group-h" role={groupErr ? 'alert' : undefined}>
          {groupErr ? 'Pick a group to continue.' : groupHelp(d, groups)}
        </p>
      </div>

      <div className="ux-field">
        <div className="ux-flabel" id="p5-diff-l">Difficulty</div>
        <Segmented<DraftDifficulty> options={DIFFICULTIES} value={d.difficulty} onChange={f.setDifficulty} label="Difficulty" />
        <p className="ux-help">{DIFFICULTY_HELP[d.difficulty]}</p>
      </div>

      <div className="ux-field">
        <label htmlFor="p5-lang">Language</label>
        <div className="p5-select">
          <select id="p5-lang" className="ux-inp" value={d.language} onChange={(e) => f.setLanguage(e.target.value)}>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label === l.native ? l.label : `${l.label} (${l.native})`}</option>
            ))}
          </select>
          <Icon name="chev" className="p5-select-i" />
        </div>
        {d.language !== 'en' ? <p className="ux-help">Quizzes written in English reach a much bigger audience. Choose English to be seen by the most fans.</p> : null}
      </div>

      <div className="ux-field">
        <div className="ux-flabel" id="p5-cover-l">Cover image <small>Recommended · JPG, PNG or WebP up to 5 MB</small></div>
        <div className="p5-covgrid">
          <div className="p5-cov">
            {d.cover ? (
              // A data URL held in the draft until publish (the upload needs a session).
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.cover} alt="Your cover" />
            ) : (
              <span className="p5-cov-empty"><Icon name="img" size="lg" /></span>
            )}
          </div>
          <div className="p5-covside">
            <label
              className={`ux-drop p5-drop${dragOver ? ' is-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); onFiles(e.dataTransfer.files); }}
            >
              <input
                type="file"
                className="ux-sr"
                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                aria-describedby="p5-cover-l"
                onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }}
              />
              <span>
                {f.coverBusy ? <b>Preparing your image...</b> : <b>{d.cover ? 'Replace the cover' : 'Add a cover'}</b>}
                <br />or drop an image here
              </span>
            </label>
            {f.coverError ? <p className="ux-err" role="alert">{f.coverError}</p> : null}
            {d.cover ? (
              <>
                <span id="p5-rights-w" className={rightsErr ? 'p5-rights is-err' : 'p5-rights'}>
                  <UxCheckbox checked={d.coverRights} onChange={f.setRights} name="p5-rights">
                    I have the right to use this image (it is mine, royalty-free, or licensed).
                  </UxCheckbox>
                </span>
                {rightsErr ? <p className="ux-err" role="alert">Confirm you have the right to use your cover image to continue.</p> : null}
                {f.publishError && f.step === 1 ? <p className="ux-err" role="alert">{f.publishError}</p> : null}
                <button type="button" className="ux-lnk p5-remove" onClick={f.removeCover}>Remove cover</button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
