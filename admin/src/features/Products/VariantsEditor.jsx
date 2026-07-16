import { Plus, Trash } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const COLORS = ['Black', 'White', 'Navy', 'Gray', 'Red', 'Blue', 'Green', 'Brown']

// Product detail page — editable table for size/color/SKU/stock variant rows.
export function VariantsEditor({ variants = [], onChange, readOnly = false }) {
  // Update one field on a variant row by index.
  function updateVariant(index, field, value) {
    const next = variants.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    onChange(next)
  }

  // Append a new variant with default size, color, and zero stock.
  function addVariant() {
    const id = `VAR-NEW-${Date.now()}`
    onChange([
      ...variants,
      { id, size: 'M', color: 'Black', sku: '', stock: 0, price: null },
    ])
  }

  // Remove a variant row by index.
  function removeVariant(index) {
    onChange(variants.filter((_, i) => i !== index))
  }

  if (!variants.length && readOnly) {
    return <p className="text-sm text-muted-foreground">No variants for this product.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {variants.length > 0 && (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Size</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Stock</TableHead>
                {!readOnly && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((variant, index) => (
                <TableRow key={variant.id}>
                  <TableCell>
                    {readOnly ? (
                      variant.size
                    ) : (
                      <Select value={variant.size} onValueChange={(v) => updateVariant(index, 'size', v)}>
                        <SelectTrigger className="h-8 w-[80px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SIZES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    {readOnly ? (
                      variant.color
                    ) : (
                      <Select value={variant.color} onValueChange={(v) => updateVariant(index, 'color', v)}>
                        <SelectTrigger className="h-8 w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COLORS.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    {readOnly ? (
                      <span className="font-mono text-xs">{variant.sku}</span>
                    ) : (
                      <Input
                        value={variant.sku}
                        onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                        className="h-8 font-mono text-xs"
                        placeholder="SKU"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {readOnly ? (
                      variant.stock
                    ) : (
                      <Input
                        type="number"
                        min="0"
                        value={variant.stock}
                        onChange={(e) => updateVariant(index, 'stock', Number(e.target.value))}
                        className="h-8 w-20"
                      />
                    )}
                  </TableCell>
                  {!readOnly && (
                    <TableCell>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeVariant(index)}>
                        <Trash size={14} className="text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!readOnly && (
        <Button type="button" variant="outline" size="sm" className="w-fit gap-1.5" onClick={addVariant}>
          <Plus size={14} />
          Add variant
        </Button>
      )}
    </div>
  )
}
