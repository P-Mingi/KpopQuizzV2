// Run O1, lot (c), lane B6: the browser side of the network layer that every page of a site with a NET flag on runs once
// after hydration: the Web Analytics filter and the via-catcher. Loaded by a dynamic import from ThemeInit, so a build
// with the flags off never downloads it (and no kpop route reaches a new client module).
import { catchVia, installAnalyticsFilter } from './via';

export function bootNetwork(): void {
  installAnalyticsFilter();
  catchVia();
}
