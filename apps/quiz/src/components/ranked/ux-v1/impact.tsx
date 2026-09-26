import { Icon } from '@/components/ux-v1/icon';
import { impactView } from '@/lib/ranked/view';

import { TierChip } from './tiers';

import type { SubmitState } from './use-ranked-run';

// "Season impact" under a ranked result (DESIGN-SPEC 15.4, prototype #btend
// ranked): the tier before -> after chips on a promotion (else the current tier),
// and one sentence on what the run did, all from the server's submit answer (the
// engine's applyRun). Rendered in P6's BtResults `slot`. Server-safe markup.

export function RankedImpact({ submit }: { submit: SubmitState }): React.ReactElement {
  if (submit.kind === 'saving' || submit.kind === 'idle') {
    return <p className="p7-impact-note" role="status">Saving your run to the season</p>;
  }
  if (submit.kind === 'failed') {
    return (
      <p className="p7-impact-note" role="status">
        Could not reach the server. Your answers are saved and this run will be recorded.
      </p>
    );
  }
  const r = submit.result;
  const v = impactView(r.impact, r.ladder);
  return (
    <div className="p7-impact">
      <div className="p7-imp-chips">
        {v.moved ? (
          <>
            <TierChip tier={v.before} />
            <Icon name="arrow" className="p7-imp-arrow" label="to" />
            <TierChip tier={v.after} gain />
          </>
        ) : (
          <TierChip tier={v.after} />
        )}
      </div>
      <p className="p7-imp-text">
        {v.lead}<b className="ux-num">{v.score}</b>{v.tail}
        {v.ladder ? <> {v.ladder}</> : null}
      </p>
    </div>
  );
}
