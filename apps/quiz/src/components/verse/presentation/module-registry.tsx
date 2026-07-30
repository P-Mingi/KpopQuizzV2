// W-CUSTOM - the runtime module registry: config type -> renderer. Merges the core
// (W2) modules with the feature modules. Modules may be sync or async server
// components; an async one (spotlight, poll) fetches its own min-gated data. A type
// with no renderer here is skipped (safe for forward config).

import { MODULE_RENDERERS as CORE } from './space-home-modules';
import { CountdownModule, QuoteModule, SpotlightModule, PollModule } from './feature-modules';
import { MusicModule, SocialEmbedModule, DiscordModule } from './media-modules';

import type { Space } from '@/lib/verse/space';
import type { ModulePlacement } from '@/lib/verse/presentation/types';

export interface ModuleProps { space: Space; placement: ModulePlacement }
export type ModuleComponent = (props: ModuleProps) => React.ReactNode | Promise<React.ReactNode>;

export const ALL_MODULES: Record<string, ModuleComponent> = {
  ...CORE,
  countdown: CountdownModule,
  quote: QuoteModule,
  spotlight: SpotlightModule,
  poll: PollModule,
  music: MusicModule,
  social_embed: SocialEmbedModule,
  discord: DiscordModule,
};
