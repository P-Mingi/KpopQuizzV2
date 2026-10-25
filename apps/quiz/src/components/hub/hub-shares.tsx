import { Panel } from '@/components/ux-v1/panel';
import { ht } from '@/lib/site/hub/copy';
import { POLICY_CLASS, SHARES_HIDES, SHARES_SEES } from '@/lib/site/hub/network-page';

/**
 * "What your passport shares": what the other sites see, then what they never see. One component, two pages: the home of
 * the hub and its /privacy page render this same block from the same copy keys, so they read word for word the same.
 * `variant="home"` is the look of the new home (its own two columns, inside the passport card); the default is the panel of the privacy page.
 */
export function HubShares({ variant = 'panel' }: { variant?: 'panel' | 'home' } = {}): React.ReactElement {
  if (variant === 'home') {
    // The new home (docs/o1/design/fanquiz-hub/): the same keys in the design's two columns, inside the passport card, no panel and no title.
    return (
      <div className="hub-h2-shares-cols" data-hub-shares="">
        <div className="hub-h2-shares-col">
          <h3 className="hub-h2-shares-h hub-h2-shares-h-ok">{ht('shares.seesTitle')}</h3>
          <ul className="hub-h2-shares-list">
            {SHARES_SEES.map((k) => <li key={k}>{ht(k)}</li>)}
          </ul>
        </div>
        <div className="hub-h2-shares-col">
          <h3 className="hub-h2-shares-h hub-h2-shares-h-no">{ht('shares.hidesTitle')}</h3>
          <ul className="hub-h2-shares-list">
            {SHARES_HIDES.map((k) => <li key={k}>{ht(k)}</li>)}
          </ul>
        </div>
      </div>
    );
  }
  return (
    <div className={`${POLICY_CLASS}-shares`} data-hub-shares="">
      <Panel title={ht('home.sharesTitle')} titleAs="h2" icon="shield">
        <div className={`${POLICY_CLASS}-shares-cols`}>
          <div>
            <h3 className={`${POLICY_CLASS}-shares-h`}>{ht('shares.seesTitle')}</h3>
            <ul className={`${POLICY_CLASS}-shares-list ${POLICY_CLASS}-shares-sees`}>
              {SHARES_SEES.map((k) => <li key={k}>{ht(k)}</li>)}
            </ul>
          </div>
          <div>
            <h3 className={`${POLICY_CLASS}-shares-h`}>{ht('shares.hidesTitle')}</h3>
            <ul className={`${POLICY_CLASS}-shares-list ${POLICY_CLASS}-shares-hides`}>
              {SHARES_HIDES.map((k) => <li key={k}>{ht(k)}</li>)}
            </ul>
          </div>
        </div>
      </Panel>
    </div>
  );
}
