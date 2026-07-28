/**
 * Shared blog post types + display helpers.
 * Post content is loaded from GET /api/blog (admin-managed).
 */

export type BlogLearnItem = {
  title: string;
  description: string;
};

export type BlogPost = {
  id: number;
  slug: string;
  title: string;
  date: string;
  image: string;
  category: string;
  subtitle: string;
  content: string;
  learnSectionTitle: string;
  learnItems: BlogLearnItem[];
  conclusion: string;
  published?: boolean;
  publishedAt?: string | null;
};

export function formatBlogDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function mapApiBlogPost(raw: Record<string, unknown>): BlogPost {
  const learnRaw = raw.learnItems ?? raw.learn_items ?? [];
  const learnItems = Array.isArray(learnRaw)
    ? learnRaw.map((item) => {
        const row = (item || {}) as Record<string, unknown>;
        return {
          title: String(row.title || ''),
          description: String(row.description || ''),
        };
      })
    : [];

  const publishedAt = (raw.publishedAt ?? raw.published_at ?? null) as string | null;

  return {
    id: Number(raw.id ?? raw._id ?? 0),
    slug: String(raw.slug || ''),
    title: String(raw.title || ''),
    date: formatBlogDate(publishedAt) || formatBlogDate(String(raw.createdAt ?? raw.created_at ?? '')),
    image: String(raw.image || '/images/about/team/team-1.png'),
    category: String(raw.category || ''),
    subtitle: String(raw.subtitle || ''),
    content: String(raw.content || ''),
    learnSectionTitle: String(raw.learnSectionTitle ?? raw.learn_section_title ?? ''),
    learnItems,
    conclusion: String(raw.conclusion || ''),
    published: raw.published !== false,
    publishedAt,
  };
}
