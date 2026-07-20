import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function Blog() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.blogList()
        if (!cancelled) setPosts(res.data || [])
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <p className="muted">Loading blog…</p>
  if (error) return <p className="error">{error}</p>

  return (
    <div className="blog-page">
      <header className="blog-hero">
        <h1>Stories from Matina</h1>
        <p className="muted">Craft, makers, and notes from our workshop.</p>
      </header>

      {!posts.length ? (
        <p className="muted">No posts yet — check back soon.</p>
      ) : (
        <ul className="blog-grid">
          {posts.map((post) => (
            <li key={post.id}>
              <Link to={`/blog/${post.slug}`} className="blog-card">
                {post.coverImage ? (
                  <img src={post.coverImage} alt="" className="blog-card-cover" />
                ) : (
                  <div className="blog-card-cover blog-card-cover--empty" />
                )}
                <div className="blog-card-body">
                  <time className="blog-date">{formatDate(post.publishedAt || post.createdAt)}</time>
                  <h2>{post.title}</h2>
                  <p>{post.excerpt}</p>
                  <span className="blog-read-more">Read article →</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
