import BlogDisplay from '@/features/blog/BlogDisplay';
import { mapApiBlogPost, type BlogPost } from '@/features/blog/blogData';
import { fetchBlogPosts } from '@/lib/api';

export default async function BlogPage() {
  let posts: BlogPost[] = [];
  try {
    const rows = await fetchBlogPosts();
    posts = rows.map(mapApiBlogPost);
  } catch {
    posts = [];
  }

  return (
    <div>
      <BlogDisplay posts={posts} />
    </div>
  );
}
