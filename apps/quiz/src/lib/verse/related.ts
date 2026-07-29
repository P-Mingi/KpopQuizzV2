// W3K.8 - related-graph. Builds the auto-navbox links for a group from the category
// hubs it belongs to (sibling groups in the same generation / label / country). Pure
// derivation from existing data; interlinks the graph for crawlers and readers.
import { hubsForGroup, hubGroups } from '@/lib/verse/tags';

export interface RelatedSection { title: string; slug: string; groups: Array<{ name: string; slug: string }>; }

const CAP = 12;

/** Sibling groups grouped by shared category, self excluded. Empty sections dropped. */
export async function relatedForGroup(group: { slug: string; generation: string | null; record_label: string | null; origin_country: string | null }): Promise<RelatedSection[]> {
  const hubs = await hubsForGroup(group);
  const sections = await Promise.all(hubs.map(async (h) => {
    const siblings = (await hubGroups(h))
      .filter((g) => g.slug !== group.slug)
      .slice(0, CAP)
      .map((g) => ({ name: g.name, slug: g.slug }));
    return { title: h.label, slug: h.slug, groups: siblings } as RelatedSection;
  }));
  return sections.filter((s) => s.groups.length > 0);
}
