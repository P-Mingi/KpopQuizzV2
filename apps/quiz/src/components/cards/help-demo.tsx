'use client';

// KpopCards: the demo box of the Help page (the prototype's #help-demo-box): "No account yet? Open one demo pack." Drawn only for a signed-out visitor on a
// server that can draw a demo pack, who has not opened their one demo on this device.
import { useEffect, useState } from 'react';

import { useCards } from './cards-provider';
import { demoUsed } from './demo-store';
import { OpenDemo } from './open-demo';

export function HelpDemo(): React.ReactElement | null {
  const { status, demo } = useCards();
  const [used, setUsed] = useState(true);
  useEffect(() => { setUsed(demoUsed()); }, []);
  if (status !== 'guest' || !demo || used) return null;
  return (
    <div className="demo" id="help-demo-box">
      <p><b>No account yet?</b> Open one demo pack. Sign in with your Bunnyverse passport to keep the 5 cards.</p>
      <OpenDemo className="btn-primary" id="help-demo" />
    </div>
  );
}
