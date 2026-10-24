// Run O1, lot (d), lane H1: the body of fanquiz.org/privacy, also served by the otakuquiz.org build (canonical fanquiz.org). It renders
// PRIVACY_SECTIONS (lib/site/hub/network-page.ts), every string a copy key privacy.* (copy/hub/h1.ts), the names from the registry.
// While the network is closed (INDEXING_OPEN false) it carries a visible "Draft" banner and no date; once it is open it has neither
// the banner nor a draft look, and prints the launch date (NET_LAUNCH_DATE). The "What your passport shares" block is the one of the
// network page.
import { HubShares } from '@/components/hub/hub-shares';
import { UxPage } from '@/components/ux-v1/page';
import { HUB_EMAIL, ht } from '@/lib/site/hub/copy';
import { POLICY_CLASS, PRIVACY_PAGE, PRIVACY_SECTIONS, signInItems } from '@/lib/site/hub/network-page';
import { formatLaunchDate, INDEXING_OPEN } from '@/lib/site/indexing';

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
  if (block.kind === 'signins') return <ul className={`${POLICY_CLASS}-prose-list`}>{signInItems().map((item) => <li key={item.id}>{item.text}</li>)}</ul>;
  if (block.kind === 'list') return <ul className={`${POLICY_CLASS}-prose-list`}>{block.keys.map((k) => <li key={k}><Text k={k} /></li>)}</ul>;
  return <p className={`${POLICY_CLASS}-prose`}><Text k={block.key} /></p>;
}

function Section({ section }: { section: PrivacySection }): React.ReactElement {
  return (
    <section className={`ux-sec ${POLICY_CLASS}-policy`}>
      <h2 className={`${POLICY_CLASS}-policy-h`}>{ht(section.title)}</h2>
      {section.blocks.map((b, i) => <Block key={i} block={b} />)}
    </section>
  );
}

export function HubPrivacy(): React.ReactElement {
  // Closed: a draft, no date. Open: no banner, and the date line when NET_LAUNCH_DATE is a real date (the build fails without it,
  // see generateMetadata of the page).
  const draft = !INDEXING_OPEN;
  const date = INDEXING_OPEN ? formatLaunchDate(process.env.NET_LAUNCH_DATE) : null;
  return (
    <UxPage width="text" className={`${POLICY_CLASS}-privacy`}>
      {draft ? (
        <div className={`${POLICY_CLASS}-draft`} role="note" data-hub-draft="">
          <strong>Draft</strong>
          <span>{ht(PRIVACY_PAGE.draftBanner)}</span>
        </div>
      ) : null}

      <div className="ux-ph">
        <h1>{ht(PRIVACY_PAGE.h1)}</h1>
        <p>{ht(PRIVACY_PAGE.lede)}</p>
        {date ? <p>{ht(PRIVACY_PAGE.updated)}</p> : null}
      </div>

      {PRIVACY_SECTIONS.map((section) => <Section key={section.title} section={section} />)}
    </UxPage>
  );
}
