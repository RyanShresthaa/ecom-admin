import { useCallback, useEffect, useState } from 'react'
import { Storefront, ArrowSquareOut } from '@phosphor-icons/react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SHARED_TOKEN_KEY, getSharedApiBase, sharedApi } from '@/lib/sharedApi'

// Live store page — connect to the shared customer catalog API and toggle product visibility.
export default function LiveStorePage() {
  const [staff, setStaff] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [products, setProducts] = useState([])
  const [health, setHealth] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Live store page — check API health and restore staff session from local storage.
  const load = useCallback(async () => {
    setError('')
    try {
      const h = await sharedApi.health()
      setHealth(h)
    } catch (e) {
      setHealth(null)
      setError(e.message)
    }

    const token = localStorage.getItem(SHARED_TOKEN_KEY)
    if (!token) {
      setStaff(null)
      setProducts([])
      return
    }
    try {
      const me = await sharedApi.me()
      const user = me.data || me
      // Live store page — only Admin and Seller roles may manage the customer catalog.
      if (user.role !== 'Admin' && user.role !== 'Seller') {
        localStorage.removeItem(SHARED_TOKEN_KEY)
        setStaff(null)
        setError('Staff login required (Admin or Seller). Customer accounts cannot manage the catalog.')
        return
      }
      setStaff(user)
      const list = await sharedApi.products({})
      setProducts(list.data || [])
    } catch (e) {
      localStorage.removeItem(SHARED_TOKEN_KEY)
      setStaff(null)
      setError(e.message)
    }
  }, [])

  // Live store page — fetch health and catalog on mount and after auth changes.
  useEffect(() => {
    load()
  }, [load])

  // Live store page — sign in as Admin/Seller and store the shared API token.
  async function connect(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await sharedApi.login(email, password)
      const token = res.data?.accesstoken
      if (!token) throw new Error('No access token')
      localStorage.setItem(SHARED_TOKEN_KEY, token)
      toast.success('Connected to shared store API')
      await load()
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  // Live store page — clear the stored token and reset connected staff state.
  function disconnect() {
    localStorage.removeItem(SHARED_TOKEN_KEY)
    setStaff(null)
    setProducts([])
  }

  // Live store page — flip a product's publish flag on the shared customer catalog.
  async function togglePublished(product) {
    const isLive = product.publish !== false
    try {
      await sharedApi.updateProduct({
        _id: product.id || product._id,
        publish: !isLive,
      })
      toast.success(isLive ? 'Hidden from customers' : 'Published to customers')
      await load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live store"
        description="Same database as the customer shop. Changes here appear on localhost:5174."
        actions={
          <Button variant="outline" asChild>
            <a href="http://localhost:5174" target="_blank" rel="noreferrer">
              Open customer shop
              <ArrowSquareOut className="ml-2 h-4 w-4" />
            </a>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Storefront className="h-5 w-5" />
            Shared API
          </CardTitle>
          <CardDescription>
            Endpoint: <code className="text-xs">{getSharedApiBase()}</code>
            {health ? (
              <span className="ml-2 text-emerald-600">
                · {health.status} · DB {health.database}
              </span>
            ) : (
              <span className="ml-2 text-amber-600">· offline — run npm run dev:api</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Same shared DB as <strong>Products</strong> and the customer shop. Sign in on the main
            admin login first — this page reuses that staff session.
          </p>

          {!staff ? (
            <form className="grid max-w-md gap-3" onSubmit={connect}>
              <div className="space-y-1.5">
                <Label htmlFor="shared-email">Staff email (Admin / Seller)</Label>
                <Input
                  id="shared-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shared-pass">Password</Label>
                <Input
                  id="shared-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={busy}>
                {busy ? 'Connecting…' : 'Connect staff session'}
              </Button>
            </form>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">
                Connected as <strong>{staff.name || staff.email}</strong> ({staff.role})
              </p>
              <Button variant="outline" onClick={disconnect}>
                Disconnect
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {staff && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer-visible catalog</CardTitle>
            <CardDescription>Toggle publish — customers only see published products.</CardDescription>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <p className="text-sm text-muted-foreground">No products in shared DB yet.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {products.map((p) => (
                  <li key={p.id || p._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ${Number(p.price || 0).toFixed(2)} ·{' '}
                        {p.publish !== false ? 'Published' : 'Hidden'}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => togglePublished(p)}>
                      {p.publish !== false ? 'Unpublish' : 'Publish'}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
