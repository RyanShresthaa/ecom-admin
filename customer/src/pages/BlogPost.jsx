import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { renderBlogBody } from '@/lib/blogContent'

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function renderBody(text) {
  return renderBlogBody(text)
}

export default function BlogPost() {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.blogPost(slug)
        if (!cancelled) setPost(res.data)
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) return <p className="muted">Loading…</p>
  if (error || !post) return <p className="error">{error || 'Post not found'}</p>

  return (
    <article className="blog-article">
      <Link to="/blog" className="blog-back muted">
        ← All posts
      </Link>
      {post.coverImage ? (
        <img src={post.coverImage} alt="" className="blog-article-cover" />
      ) : null}
      <header className="blog-article-header">
        <time className="blog-date">{formatDate(post.publishedAt || post.createdAt)}</time>
        <h1>{post.title}</h1>
        {post.excerpt ? <p className="blog-lead">{post.excerpt}</p> : null}
      </header>
      <div className="blog-article-body">{renderBody(post.body)}</div>
    </article>
  )
}
