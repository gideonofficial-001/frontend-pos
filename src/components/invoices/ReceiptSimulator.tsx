import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Printer, RotateCcw, Trash2 } from 'lucide-react'

/*
 * ReceiptSimulator
 *
 * A local-only receipt builder that mirrors the handwritten invoice sheet.
 * Everything lives in component state. Nothing here calls the API, touches
 * inventory, or creates a sale or invoice. Outsourced items are only for
 * drawing up the receipt. They disappear on reload or Reset.
 *
 * Usage (in pages/branch/Invoices.tsx):
 *   import { ReceiptSimulator } from '@/components/invoices/ReceiptSimulator'
 *   ...
 *   <ReceiptSimulator />
 */

type LineItem = {
  id: string
  name: string
  qty: number
  unitPrice: number
  outsourced: boolean
}

type ReceiptState = {
  businessName: string
  title: string
  date: string
  customerName: string
  contact: string
  signature: string
  items: LineItem[]
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

// Starting content, taken from the handwritten sheet dated 29/10/2026.
const seedReceipt = (): ReceiptState => ({
  businessName: 'NJUGUSH ELECTRONICS & ELECTRICALS',
  title: 'INVOICE SALE',
  date: '29/10/2026',
  customerName: '',
  contact: '',
  signature: '',
  items: [
    { id: 'seed-1', name: '300L CHEST FREEZER', qty: 1, unitPrice: 90000, outsourced: false },
    { id: 'seed-2', name: '12V DEEP CYCLE GEL BAT. WIRED & 24V BANK', qty: 2, unitPrice: 40000, outsourced: false },
    { id: 'seed-3', name: '3.3KW 24V HYBRID INVERTER WITH INBUILT MPPT CHARGER', qty: 1, unitPrice: 30000, outsourced: false },
  ],
})

const formatMoney = (n: number) =>
  n.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

const parseNonNegative = (raw: string) => {
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export function ReceiptSimulator() {
  const [receipt, setReceipt] = useState<ReceiptState>(seedReceipt)

  const grandTotal = useMemo(
    () => receipt.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0),
    [receipt.items],
  )

  const hasOutsourced = receipt.items.some((item) => item.outsourced)

  const setField = <K extends keyof ReceiptState>(key: K, value: ReceiptState[K]) =>
    setReceipt((r) => ({ ...r, [key]: value }))

  const updateItem = (id: string, patch: Partial<LineItem>) =>
    setReceipt((r) => ({
      ...r,
      items: r.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }))

  const addItem = (outsourced: boolean) =>
    setReceipt((r) => ({
      ...r,
      items: [
        ...r.items,
        { id: newId(), name: '', qty: 1, unitPrice: 0, outsourced },
      ],
    }))

  const removeItem = (id: string) =>
    setReceipt((r) => ({ ...r, items: r.items.filter((item) => item.id !== id) }))

  const reset = () => setReceipt(seedReceipt())

  return (
    <div className="space-y-4">
      <style>{`
        .receipt-paper {
          background-image: repeating-linear-gradient(
            to bottom,
            transparent 0,
            transparent 31px,
            #b9dcc4 31px,
            #b9dcc4 32px
          );
        }
        @media print {
          @page { margin: 12mm; }
          .receipt-paper { background-image: none; }
        }
      `}</style>

      {/* Controls: screen only */}
      <div className="print:hidden flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => addItem(false)}>
          <Plus className="mr-1 h-4 w-4" /> Add item
        </Button>
        <Button size="sm" variant="outline" onClick={() => addItem(true)}>
          <Plus className="mr-1 h-4 w-4" /> Add outsourced item
        </Button>
        <Button size="sm" variant="ghost" onClick={reset}>
          <RotateCcw className="mr-1 h-4 w-4" /> Reset
        </Button>
        <Button size="sm" onClick={() => window.print()} className="ml-auto">
          <Printer className="mr-1 h-4 w-4" /> Print
        </Button>
      </div>

      {hasOutsourced && (
        <p className="print:hidden text-xs text-muted-foreground">
          Outsourced items are only on this receipt. They are not saved, do not
          change stock, and are not recorded as sales.
        </p>
      )}

      {/* The receipt */}
      <div className="receipt-paper mx-auto w-full max-w-[760px] bg-[#f8f6ef] px-8 py-8 shadow-md print:max-w-none print:shadow-none text-[#1d3c8f]">
        {/* Header */}
        <div className="text-center">
          <input
            aria-label="Business name"
            value={receipt.businessName}
            onChange={(e) => setField('businessName', e.target.value)}
            className="w-full bg-transparent text-center text-xl font-bold tracking-wide outline-none focus:bg-white/60 print:focus:bg-transparent"
          />
          <input
            aria-label="Document title"
            value={receipt.title}
            onChange={(e) => setField('title', e.target.value)}
            className="mt-1 w-full bg-transparent text-center text-lg font-semibold tracking-wide outline-none focus:bg-white/60 print:focus:bg-transparent"
          />
        </div>

        <div className="mt-2 flex justify-end">
          <label className="flex items-center gap-2 text-base">
            <span className="sr-only">Date</span>
            <input
              aria-label="Date"
              value={receipt.date}
              onChange={(e) => setField('date', e.target.value)}
              className="w-36 bg-transparent text-right text-base outline-none focus:bg-white/60 print:focus:bg-transparent"
            />
          </label>
        </div>

        {/* Line items */}
        <table className="mt-4 w-full table-fixed border-collapse text-base">
          <colgroup>
            <col className="w-12" />
            <col />
            <col className="w-16" />
            <col className="w-32" />
            <col className="w-32" />
            <col className="w-10 print:hidden" />
          </colgroup>
          <thead>
            <tr className="h-8 text-left font-semibold">
              <th className="px-1">SN</th>
              <th className="px-1">ITEM</th>
              <th className="px-1 text-center">QTY</th>
              <th className="px-1 text-right">UNIT PRICE</th>
              <th className="px-1 text-right">TOTAL</th>
              <th className="print:hidden" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {receipt.items.map((item, index) => {
              const lineTotal = item.qty * item.unitPrice
              return (
                <tr key={item.id} className="h-8 align-middle">
                  <td className="px-1 align-top pt-1">{index + 1}.</td>
                  <td className="px-1">
                    <input
                      aria-label={`Item ${index + 1} name`}
                      value={item.name}
                      placeholder={item.outsourced ? 'Outsourced item name' : ''}
                      onChange={(e) => updateItem(item.id, { name: e.target.value })}
                      className="w-full bg-transparent outline-none focus:bg-white/60 print:focus:bg-transparent"
                    />
                    {item.outsourced && (
                      <span className="print:hidden ml-1 rounded bg-amber-100 px-1 text-[10px] font-medium uppercase tracking-wide text-amber-800">
                        outsourced
                      </span>
                    )}
                  </td>
                  <td className="px-1">
                    <input
                      aria-label={`Item ${index + 1} quantity`}
                      type="number"
                      min={0}
                      inputMode="decimal"
                      value={item.qty}
                      onChange={(e) => updateItem(item.id, { qty: parseNonNegative(e.target.value) })}
                      className="w-full bg-transparent text-center outline-none focus:bg-white/60 print:focus:bg-transparent [appearance:textfield]"
                    />
                  </td>
                  <td className="px-1">
                    <input
                      aria-label={`Item ${index + 1} unit price`}
                      type="number"
                      min={0}
                      inputMode="decimal"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, { unitPrice: parseNonNegative(e.target.value) })}
                      className="w-full bg-transparent text-right outline-none focus:bg-white/60 print:focus:bg-transparent [appearance:textfield]"
                    />
                  </td>
                  <td className="px-1 text-right tabular-nums">{formatMoney(lineTotal)}</td>
                  <td className="print:hidden text-center">
                    <button
                      type="button"
                      aria-label={`Remove item ${index + 1}`}
                      onClick={() => removeItem(item.id)}
                      className="rounded p-1 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="h-8 font-bold">
              <td colSpan={4} className="px-1 text-right">Total</td>
              <td className="px-1 text-right tabular-nums">{formatMoney(grandTotal)}</td>
              <td className="print:hidden" />
            </tr>
          </tfoot>
        </table>

        {/* Footer fields */}
        <div className="mt-8 space-y-2 text-base">
          <FooterField
            label="NAME"
            value={receipt.customerName}
            onChange={(v) => setField('customerName', v)}
          />
          <FooterField
            label="CONTACT"
            value={receipt.contact}
            onChange={(v) => setField('contact', v)}
          />
          <FooterField
            label="SIGN"
            value={receipt.signature}
            onChange={(v) => setField('signature', v)}
          />
        </div>
      </div>
    </div>
  )
}

function FooterField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex items-end gap-2">
      <span className="w-24 shrink-0 font-semibold">{label}:</span>
      <Input
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 flex-1 rounded-none border-0 border-b border-[#1d3c8f]/40 bg-transparent px-1 text-[#1d3c8f] shadow-none focus-visible:ring-0 print:border-[#1d3c8f]/40"
      />
    </div>
  )
}

export default ReceiptSimulator
