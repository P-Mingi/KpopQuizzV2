import Image from 'next/image';
import Link from 'next/link';

import { SERIES_ART } from '@/lib/ux-v1/a0/group-photos';

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
        <Link key={g.slug} href={`/${g.slug}-quiz`} className={SERIES_ART.avatar ? 'p1-gitem anime-o2-art-item' : 'p1-gitem'}>
          <span className={`p1-gav${g.photo || SERIES_ART.avatar ? '' : ' is-ini'}`} aria-hidden="true">
            {/* A fixed 80 x 80 image (C3-008): next/image gives it 1x / 2x candidates
                (96 / 220 w). With fill + sizes="80px" a DPR 3 phone needs 240 w, finds
                no image size between 220 and the first device size and loads 640 w. */}
            {g.photo ? <Image src={g.photo} alt="" width={80} height={80} className="p1-img p1-img-fix" /> : SERIES_ART.avatar ? SERIES_ART.avatar(g.slug, g.name) : g.initials}
          </span>
          <span className={SERIES_ART.avatar ? 'p1-gn anime-o2-art-name' : 'p1-gn'}>{g.name}</span>
          <span className={`p1-gc ux-num${g.isNew ? ' is-new' : ''}`}>
            {g.isNew ? 'New quiz' : `${g.quizzes} ${g.quizzes === 1 ? 'quiz' : 'quizzes'}`}
          </span>
        </Link>
      ))}
    </div>
  );
}
