// Run O1, lot (d), lane H1: the body of fanquiz.org/privacy, DRAFT. It renders PRIVACY_SECTIONS (lib/site/hub/network-page.ts),
// every string a copy key privacy.* (copy/hub/h1.ts), the names from the registry. Shown with a visible "Draft" banner until the
// owner validates the text (docs/o1/reports/H1/privacy-draft.md). The "What your passport shares" block is the one of the
// network page.
import { HubShares } from '@/components/hub/hub-shares';
import { UxPage } from '@/components/ux-v1/page';
import { HUB_EMAIL, ht } from '@/lib/site/hub/copy';
import { PRIVACY_PAGE, PRIVACY_SECTIONS } from '@/lib/site/hub/network-page';

import type { PrivacyBlock, PrivacyKey, PrivacySection } from '@/lib/site/hub/network-page';

/** A copy line with the hub mailbox turned into a mailto link. */
function Text({ k }: { k: PrivacyKey }): React.ReactElement {
  const parts = ht(k).split(HUB_EMAIL);
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 ? <a href={`mailto:${HUB_EMAIL}`}>{HUB_EMAIL}</a> : null}
        </span>
      ))}
    </>
  );
}

function Block({ block }: { block: PrivacyBlock }): React.ReactElement {
  if (block.kind === 'shares') return <HubShares />;
  if (block.kind === 'list') return <ul className="hub-h1-prose-list">{block.keys.map((k) => <li key={k}><Text k={k} /></li>)}</ul>;
  return <p className="hub-h1-prose"><Text k={block.key} /></p>;
}

function Section({ section }: { section: PrivacySection }): React.ReactElement {
  return (
    <section className="ux-sec hub-h1-policy">
      <h2 className="hub-h1-policy-h">{ht(section.title)}</h2>
      {section.blocks.map((b, i) => <Block key={i} block={b} />)}
    </section>
  );
}

export function HubPrivacy(): React.ReactElement {
  return (
    <UxPage width="text" className="hub-h1-privacy">
      <div className="hub-h1-draft" role="note" data-hub-draft="">
        <strong>Draft</strong>
        <span>{ht(PRIVACY_PAGE.draftBanner)}</span>
      </div>

      <div className="ux-ph">
        <h1>{ht(PRIVACY_PAGE.h1)}</h1>
        <p>{ht(PRIVACY_PAGE.lede)}</p>
        <p>{ht(PRIVACY_PAGE.updated)}</p>
      </div>

      {PRIVACY_SECTIONS.map((section) => <Section key={section.title} section={section} />)}
    </UxPage>
  );
}
