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
import { Separator } from '@/components/ui/separator'
import { useCreateCustomer } from '@/hooks/useCustomers'

// Generate a random password that meets minimum complexity requirements.
function randomPassword() {
  const base = `Cust${Math.random().toString(36).slice(2, 8)}`
  return `${base}A1!`
}

const EMPTY_ADDRESS = {
  addressLine: '',
  city: '',
  state: '',
  pincode: '',
  country: 'Nepal',
}

// Customers list page — modal form to create a new buyer account with optional address.
export function CreateCustomerDialog({ open, onOpenChange }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [address, setAddress] = useState(EMPTY_ADDRESS)
  const createCustomer = useCreateCustomer()

  // Reset form fields and generate a fresh password each time the dialog opens.
  useEffect(() => {
    if (open) {
      setName('')
      setEmail('')
      setPhone('')
      setPassword(randomPassword())
      setAddress(EMPTY_ADDRESS)
    }
  }, [open])

  // Update a single shipping-address field without replacing the whole object.
  function patchAddress(key, value) {
    setAddress((prev) => ({ ...prev, [key]: value }))
  }

  // Validate required fields and submit the new customer to the API.
  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !password) return
    createCustomer.mutate(
      {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        addressLine: address.addressLine.trim(),
        city: address.city.trim(),
        state: address.state.trim(),
        pincode: address.pincode.trim(),
        country: address.country.trim(),
      },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add customer</DialogTitle>
            <DialogDescription>
              Creates a buyer account with optional shipping address. They can sign in to the store
              with this email and password.
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
            <Label htmlFor="customer-phone">Phone</Label>
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

          <Separator />

          <div className="flex flex-col gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">Shipping address</p>
              <p className="text-xs text-muted-foreground">Optional — used for checkout and delivery.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="customer-address-line">Street address</Label>
              <Input
                id="customer-address-line"
                value={address.addressLine}
                onChange={(e) => patchAddress('addressLine', e.target.value)}
                placeholder="House / street / landmark"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="customer-city">City</Label>
                <Input
                  id="customer-city"
                  value={address.city}
                  onChange={(e) => patchAddress('city', e.target.value)}
                  placeholder="Kathmandu"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="customer-state">State / province</Label>
                <Input
                  id="customer-state"
                  value={address.state}
                  onChange={(e) => patchAddress('state', e.target.value)}
                  placeholder="Bagmati"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="customer-pincode">Postal / ZIP code</Label>
                <Input
                  id="customer-pincode"
                  value={address.pincode}
                  onChange={(e) => patchAddress('pincode', e.target.value)}
                  placeholder="44600"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="customer-country">Country</Label>
                <Input
                  id="customer-country"
                  value={address.country}
                  onChange={(e) => patchAddress('country', e.target.value)}
                  placeholder="Nepal"
                />
              </div>
            </div>
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
