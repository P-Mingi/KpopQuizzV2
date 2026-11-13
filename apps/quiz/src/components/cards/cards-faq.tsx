// Bunnyverse Cards, lot 3 point C5: a short "how it works" and the questions people ask, on /cards. A server component: the text is in the
// HTML the server sends, under real headings (h2 sections, h3 questions). Every answer states what the code does; no FAQPage JSON-LD (the
// page is closed to search engines and the markup would promise a rich result it cannot have).
import Link from 'next/link';

import { CAP, PACK_SIZE, PERIOD_S, SHARD_PACK_COST } from '@/lib/cards/rules';

import { REMOVAL_PROMISE } from './report-form';

export function CardsFaq(): React.ReactElement {
  return (
    <section className="faq" aria-labelledby="faq-how">
      <h2 className="h2" id="faq-how">How it works</h2>
      <ol className="faq-steps">
        <li><b>Get a pack.</b> You hold up to {CAP} packs. A new one arrives every {PERIOD_S / 60} minutes, and at midnight, Paris time, the stack fills up again.</li>
        <li><b>Open it.</b> Each pack holds {PACK_SIZE} cards. Tap the pack to tear it, then tap each card to turn it over.</li>
        <li><b>Fill your binder.</b> A card you already have is a copy. Recycle the extras for shards, and {SHARD_PACK_COST} shards open another pack.</li>
      </ol>

      <h2 className="h2" id="faq-q">Questions</h2>
      <div className="faq-list">
        <h3>Is it free?</h3>
        <p>Yes. Bunnyverse Cards is free to play. Packs are never sold, and cards cannot be bought or sold.</p>

        <h3>Are there ads?</h3>
        <p>The only ads are optional rewarded ads on bunnyverse.org. When one is available you can watch it to open a pack right away. You never have to: the timer brings a pack every {PERIOD_S / 60} minutes either way.</p>

        <h3>Where do the photos come from?</h3>
        <p>
          From free licences, such as Wikimedia Commons and other free photo sources. Every card credits its photographer, the licence and the source, on the card page and
          in the <Link href="/credits#cards">photo credits</Link>. If a photo should not be there, <Link href="/cards/report">report it</Link>. {REMOVAL_PROMISE}
        </p>

        <h3>Why do I need an account?</h3>
        <p>To keep what you open. Your account holds your packs, your shards and your binder, and the bonus packs you earn from quizzes and Kpopdle. You can try one demo pack without an account: it is not saved.</p>
      </div>
    </section>
  );
}
