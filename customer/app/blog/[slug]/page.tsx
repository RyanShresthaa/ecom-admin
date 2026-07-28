import { notFound } from 'next/navigation';
import BlogDetail from '@/features/blog/BlogDetail';
import { mapApiBlogPost } from '@/features/blog/blogData';
import { fetchBlogPostBySlug } from '@/lib/api';

interface Params {
  slug: string;
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  try {
    const raw = await fetchBlogPostBySlug(slug);
    if (!raw) return { title: 'Post not found | Matina Crafts' };
    const post = mapApiBlogPost(raw);
    return {
      title: `${post.title} | Matina Crafts Journal`,
      description: post.subtitle || post.content.substring(0, 150),
    };
  } catch {
    return { title: 'Journal | Matina Crafts' };
  }
}

export default async function BlogDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const raw = await fetchBlogPostBySlug(slug);
  if (!raw) notFound();
  const post = mapApiBlogPost(raw);
  return <BlogDetail post={post} />;
}
