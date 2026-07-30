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

function isLikelyImageRef(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (!v) return false;
  if (v.startsWith('http://') || v.startsWith('https://')) return true;
  if (v.startsWith('/')) return true;
  if (v.startsWith('data:image/')) return true;
  return false;
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
  const image = isLikelyImageRef(raw.image) ? raw.image : '/images/about/team/team-1.png';

  return {
    id: Number(raw.id ?? raw._id ?? 0),
    slug: String(raw.slug || ''),
    title: String(raw.title || ''),
    date: formatBlogDate(publishedAt) || formatBlogDate(String(raw.createdAt ?? raw.created_at ?? '')),
    image,
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
