import { useRef, useState } from 'react'
import { DownloadSimple, UploadSimple, SpinnerGap } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useExportProductsCsv, useImportProductsCsv } from '@/hooks/useProducts'

// Products list page — export catalog to CSV and import products from a file or paste.
export function CsvImportExport() {
  const [importOpen, setImportOpen] = useState(false)
  const [csvText, setCsvText] = useState('')
  const fileRef = useRef(null)

  const exportCsv = useExportProductsCsv()
  const importCsv = useImportProductsCsv()

  // Read chosen CSV file into the import textarea.
  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCsvText(String(reader.result))
    reader.readAsText(file)
    e.target.value = ''
  }

  // Submit pasted or uploaded CSV content to bulk-create/update products.
  function handleImport() {
    if (!csvText.trim()) return
    importCsv.mutate(csvText, {
      onSuccess: () => {
        setImportOpen(false)
        setCsvText('')
      },
    })
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => exportCsv.mutate()}
          disabled={exportCsv.isPending}
        >
          {exportCsv.isPending ? <SpinnerGap size={14} className="animate-spin" /> : <DownloadSimple size={14} />}
          Export CSV
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setImportOpen(true)}>
          <UploadSimple size={14} />
          Import CSV
        </Button>
      </div>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import products from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV with columns: id, name, category, price, stock, sku, status, description. Existing IDs will be updated.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileSelect} />
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              Choose file
            </Button>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Or paste CSV content here…"
              rows={8}
              className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!csvText.trim() || importCsv.isPending} className="gap-1.5">
              {importCsv.isPending && <SpinnerGap size={14} className="animate-spin" />}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
