import { SectionHeader } from '@/components/ux-v1/section-header';
import { t, tPlural } from '@/lib/anime/copy';

import type { StoryMapNode } from '@/lib/anime/series-model';

function Node({ node }: { node: StoryMapNode }): React.ReactElement {
  return (
    <li className="anime-o2-arc-node" data-ord={node.ord}>
      <span className="anime-o2-arc-name">{node.name}</span>
      <span className="anime-o2-arc-kind">{node.kindLabel}</span>
      {node.range ? <span className="anime-o2-arc-range">{node.range}</span> : null}
      {node.mangaOnly ? <span className="anime-o2-arc-flag">{t('hub.arcMangaOnly')}</span> : null}
      {node.animeOnly ? <span className="anime-o2-arc-flag">{t('hub.arcAnimeOnly')}</span> : null}
      {node.quizzes > 0 ? <span className="anime-o2-arc-quizzes">{tPlural('hub.arcQuizzes', node.quizzes)}</span> : null}
      {node.children.length > 0 ? (
        <ol className="anime-o2-arc-list">{node.children.map((c) => <Node key={c.ord} node={c} />)}</ol>
      ) : null}
    </li>
  );
}

/**
 * A2, the story map: the arcs in story order (sagas hold their arcs), each with its kind, its episode or chapter range,
 * a "manga only" or "anime only" flag and the number of quizzes that cover it. The quizzes themselves are listed by arc
 * in the quizzes section (HubQuizzes `grouping`). Server component.
 */
export function StoryMap({ nodes }: { readonly nodes: readonly StoryMapNode[] }): React.ReactElement | null {
  if (nodes.length === 0) return null;
  return (
    <section className="ux-sec anime-o2-map" aria-labelledby="anime-o2-map-h" data-testid="story-map">
      <SectionHeader id="anime-o2-map-h" title={t('hub.storyMap')} icon="layers" />
      <ol className="anime-o2-arc-list">{nodes.map((n) => <Node key={n.ord} node={n} />)}</ol>
    </section>
  );
}
