import { useEffect, useState } from 'react'
import { SpinnerGap } from '@phosphor-icons/react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateCustomer } from '@/hooks/useCustomers'

function randomPassword() {
  const base = `Cust${Math.random().toString(36).slice(2, 8)}`
  return `${base}A1!`
}

export function CreateCustomerDialog({ open, onOpenChange }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const createCustomer = useCreateCustomer()

  useEffect(() => {
    if (open) {
      setName('')
      setEmail('')
      setPhone('')
      setPassword(randomPassword())
    }
  }, [open])

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !password) return
    createCustomer.mutate(
      {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add customer</DialogTitle>
            <DialogDescription>
              Creates a buyer account in the database. They can sign in to the store with this email
              and password.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customer-name">Full name</Label>
            <Input
              id="customer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customer-email">Email</Label>
            <Input
              id="customer-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customer-phone">Phone (optional)</Label>
            <Input
              id="customer-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+977…"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="customer-password">Password</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setPassword(randomPassword())}
              >
                Generate
              </Button>
            </div>
            <Input
              id="customer-password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <p className="text-[11px] text-muted-foreground">
              Must include uppercase, lowercase, and a number (min 8 characters).
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCustomer.isPending} className="gap-1.5">
              {createCustomer.isPending && <SpinnerGap size={14} className="animate-spin" />}
              Create customer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
