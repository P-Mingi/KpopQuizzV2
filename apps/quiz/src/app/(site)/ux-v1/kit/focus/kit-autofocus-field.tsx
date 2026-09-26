'use client';

import { useEffect, useRef } from 'react';

/** A field its page focuses once on mount (the common pattern: a search or answer
 *  box). Once: a dev server's StrictMode re-runs mount effects, which would re-focus
 *  it and hide a shell that took the focus away. */
export function KitAutofocusField(): React.ReactElement {
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    ref.current?.focus();
  }, []);
  return (
    <div className="ux-field">
      <label htmlFor="kit-focus-field">Search the kit</label>
      <input ref={ref} id="kit-focus-field" className="ux-inp" type="search" data-kit="autofocus-field" />
    </div>
  );
}
