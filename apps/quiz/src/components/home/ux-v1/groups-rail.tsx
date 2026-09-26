import Image from 'next/image';
import Link from 'next/link';

import type { RailGroup } from '@/lib/ux-v1/p1/home-data';

/**
 * Groups rail (16.7: 10 groups, 80px avatars, "New quiz" as a word, never a dot
 * alone). Each group is a real link to its hub /{slug}-quiz. The count is the real
 * number of PUBLISHED quizzes (16.10). Photos from public/idols via next/image; a
 * group without a photo gets neutral initials.
 */
export function GroupsRail({ groups }: { groups: RailGroup[] }): React.ReactElement {
  return (
    <div className="p1-grail">
      {groups.map((g) => (
        <Link key={g.slug} href={`/${g.slug}-quiz`} className="p1-gitem">
          <span className={`p1-gav${g.photo ? '' : ' is-ini'}`} aria-hidden="true">
            {g.photo ? <Image src={g.photo} alt="" fill sizes="80px" className="p1-img" /> : g.initials}
          </span>
          <span className="p1-gn">{g.name}</span>
          <span className={`p1-gc ux-num${g.isNew ? ' is-new' : ''}`}>
            {g.isNew ? 'New quiz' : `${g.quizzes} ${g.quizzes === 1 ? 'quiz' : 'quizzes'}`}
          </span>
        </Link>
      ))}
    </div>
  );
}
