export interface ArticleFaq {
  question: string;
  answer: string;
}

export interface ArticleLink {
  label: string;
  href: string;
}

export interface ArticleSection {
  heading: string;
  content: string;
}

export type ArticleCategory =
  | 'comparison'
  | 'guide'
  | 'data'
  | 'listicle'
  | 'roundup';

export interface ArticleMeta {
  slug: string;
  title: string;
  description: string;
  category: ArticleCategory;
  publishedAt: string;
  updatedAt: string;
  coverAlt: string;
  ogImage?: string;
  tags: string[];
  relatedLinks: ArticleLink[];
  faq: ArticleFaq[];
}
