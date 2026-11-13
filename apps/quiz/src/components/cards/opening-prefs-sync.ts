// KpopCards (agent C): ties the two switches (lib/cards/opening-prefs) to the server's prefs (POST /api/cards/prefs, file 107). Call once
// where the api and the lobby state live (the provider): `syncPrefs(api, state.prefs)`. The server's values load into the store without being
// sent back; a switch turned in the top bar is saved with one call. A failed save is quiet: the local value stays.
import { applyServerPrefs, setPrefsSink } from '@/lib/cards/opening-prefs';

import type { KpopCardsApi, Prefs } from '@/lib/kpopcards/contract';

export function syncPrefs(api: Pick<KpopCardsApi, 'prefs'> | null, server: Pick<Prefs, 'sound' | 'vibration'> | null): () => void {
  if (server) applyServerPrefs({ sound: server.sound, vibration: server.vibration });
  if (!api) { setPrefsSink(null); return () => undefined; }
  setPrefsSink((p) => { void api.prefs({ sound: p.sound, vibration: p.vibration }).catch(() => undefined); });
  return () => setPrefsSink(null);
}
