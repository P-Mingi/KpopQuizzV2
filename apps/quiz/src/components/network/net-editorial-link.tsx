// Run O1, lot (c), lane B6: the editorial cross-site link (link-allowlist.md): a plain <a> to the canonical url of the other
// site, followed, no query, no rel. No hook, no state: it renders the same on the server and in the browser, so an anonymous
// page carries it in its HTML. Allowed only where link-allowlist.json lists it.
import { editorialHref } from '@/lib/network/links';

import type { SiteId } from '@/lib/site/types';

export interface NetEditorialLinkProps {
  readonly dst: SiteId;
  readonly path: string;
  readonly className?: string | undefined;
  readonly children: React.ReactNode;
}

export function NetEditorialLink({ dst, path, className, children }: NetEditorialLinkProps): React.ReactElement {
  return <a className={className} href={editorialHref(dst, path)}>{children}</a>;
}
