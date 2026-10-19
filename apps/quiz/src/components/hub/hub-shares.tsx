import { Panel } from '@/components/ux-v1/panel';
import { ht } from '@/lib/site/hub/copy';
import { SHARES_HIDES, SHARES_SEES } from '@/lib/site/hub/network-page';

/**
 * "What your passport shares": what the other sites see, then what they never see. One component, two pages: the home of
 * the hub and its /privacy page render this same block from the same copy keys, so they read word for word the same.
 */
export function HubShares(): React.ReactElement {
  return (
    <div className="hub-h1-shares" data-hub-shares="">
      <Panel title={ht('home.sharesTitle')} titleAs="h2" icon="shield">
        <div className="hub-h1-shares-cols">
          <div>
            <h3 className="hub-h1-shares-h">{ht('shares.seesTitle')}</h3>
            <ul className="hub-h1-shares-list hub-h1-shares-sees">
              {SHARES_SEES.map((k) => <li key={k}>{ht(k)}</li>)}
            </ul>
          </div>
          <div>
            <h3 className="hub-h1-shares-h">{ht('shares.hidesTitle')}</h3>
            <ul className="hub-h1-shares-list hub-h1-shares-hides">
              {SHARES_HIDES.map((k) => <li key={k}>{ht(k)}</li>)}
            </ul>
          </div>
        </div>
      </Panel>
    </div>
  );
}
