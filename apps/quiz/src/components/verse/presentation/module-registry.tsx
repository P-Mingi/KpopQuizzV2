// W-CUSTOM - the runtime module registry: config type -> renderer. Merges the core
// (W2) modules with the feature modules. Modules may be sync or async server
// components; an async one (spotlight, poll) fetches its own min-gated data. A type
// with no renderer here is skipped (safe for forward config).

import { MODULE_RENDERERS as CORE } from './space-home-modules';
import { CountdownModule, QuoteModule, SpotlightModule, PollModule } from './feature-modules';
import { MusicModule, SocialEmbedModule, DiscordModule } from './media-modules';
import { IntroModule, VitalsStrip, StoryModule, GoDeeperModule, CollectionsModule, CommunityModule, CompletenessModule } from './canonical-modules';

import type { Space } from '@/lib/verse/space';
import type { ModulePlacement } from '@/lib/verse/presentation/types';

export interface ModuleProps { space: Space; placement: ModulePlacement }
export type ModuleComponent = (props: ModuleProps) => React.ReactNode | Promise<React.ReactNode>;

export const ALL_MODULES: Record<string, ModuleComponent> = {
  ...CORE,
  // V-SPACE-FLOW - the canonical-order modules (universe doc 3a)
  intro: IntroModule,
  vitals: VitalsStrip,
  story: StoryModule,
  go_deeper: GoDeeperModule,
  collections: CollectionsModule,
  community: CommunityModule,
  completeness: CompletenessModule,
  countdown: CountdownModule,
  quote: QuoteModule,
  spotlight: SpotlightModule,
  poll: PollModule,
  music: MusicModule,
  social_embed: SocialEmbedModule,
  discord: DiscordModule,
};
