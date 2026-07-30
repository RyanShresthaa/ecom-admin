import { notFound, redirect } from 'next/navigation';
import { fetchBlogPostBySlug } from '@/lib/api';

interface Params {
  slug: string;
}

/**
 * Legacy compatibility:
 * Some old links point to `/<blog-slug>` instead of `/blog/<blog-slug>`.
 * If the slug matches a blog post, redirect to the canonical blog URL.
 */
export default async function LegacySlugRedirectPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const post = await fetchBlogPostBySlug(slug);
  if (post) {
    redirect(`/blog/${slug}`);
  }
  notFound();
}
