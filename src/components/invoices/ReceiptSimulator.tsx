import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Printer, RotateCcw, Trash2 } from 'lucide-react'

/*
 * ReceiptSimulator
 *
 * A local-only invoice builder. The on-screen view matches the A4 invoice
 * design (navy header, banner, striped item table, total bar, signature
 * lines). Print opens that same layout as an A4 page.
 *
 * Nothing here calls the API, touches inventory, or creates a sale or invoice.
 * Outsourced items exist only in this component's state and disappear on
 * reload or Reset.
 *
 * Usage (in pages/branch/Invoices.tsx):
 *   import { ReceiptSimulator } from '@/components/invoices/ReceiptSimulator'
 *   <ReceiptSimulator />
 */

const NAVY = '#123c7a'
const NAVY_SOFT = '#6b7a90'
const STRIPE = '#e9f0fa'

type LineItem = {
  id: string
  name: string // may contain \n for a second line
  qty: number
  unitPrice: number
  outsourced: boolean
}

type InvoiceState = {
  businessName: string
  subtitle: string
  title: string
  invoiceNo: string
  date: string
  customerName: string
  contact: string
  signature: string
  items: LineItem[]
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

// Seeded from the invoice PDF (Invoice No 001/2026, dated 29/01/2026).
const seedInvoice = (): InvoiceState => ({
  businessName: 'NJUGUSH ELECTRONICS & ELECTRICALS',
  subtitle: 'INVOICE / SALE',
  title: 'INVOICE / SALE',
  invoiceNo: '001/2026',
  date: '29/01/2026',
  customerName: '',
  contact: '',
  signature: '',
  items: [
    { id: 'seed-1', name: '300L CHEST FREEZER', qty: 1, unitPrice: 90000, outsourced: false },
    {
      id: 'seed-2',
      name: '12V DEEP CYCLE GEL BATTERIES\nBATTERY WIRED @ 24V BANK',
      qty: 2,
      unitPrice: 40000,
      outsourced: false,
    },
    {
      id: 'seed-3',
      name: '3KW 24V HYBRID INVERTER\nWITH INBUILT MPPT CHARGER',
      qty: 1,
      unitPrice: 30000,
      outsourced: false,
    },
  ],
})

const formatMoney = (n: number) =>
  n.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

const parseNonNegative = (raw: string) => {
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c],
  )

/*
 * A4 print HTML. The styling reproduces the invoice PDF. Every user-entered
 * string is escaped, because this HTML is written into a new window that
 * shares the app's origin.
 */
function buildInvoiceHtml(inv: InvoiceState): string {
  const grandTotal = inv.items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0)

  const rows = inv.items
    .map((item, index) => {
      const stripe = index % 2 === 1 ? `background:${STRIPE};` : ''
      return `
        <tr style="${stripe}">
          <td class="c">${index + 1}</td>
          <td class="item">${escapeHtml(item.name.trim() || '')}</td>
          <td class="c">${formatMoney(item.qty)}</td>
          <td class="r">${formatMoney(item.unitPrice)}</td>
          <td class="r">${formatMoney(item.qty * item.unitPrice)}</td>
        </tr>`
    })
    .join('')

  const signLine = (label: string, value: string) => `
    <div class="sign">
      <span class="label">${label}:</span>
      <span class="line">${escapeHtml(value.trim())}</span>
    </div>`

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(inv.title)} ${escapeHtml(inv.invoiceNo)}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Helvetica, Arial, sans-serif;
      color: #111;
      font-size: 12px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .brand { text-align: center; color: ${NAVY}; font-weight: 700; font-size: 22px; letter-spacing: 0.2px; }
    .subtitle { text-align: center; color: ${NAVY_SOFT}; font-size: 11px; margin-top: 4px; }
    .banner {
      background: ${NAVY}; color: #fff; text-align: center;
      font-weight: 700; font-size: 22px; padding: 14px 8px; margin-top: 20px;
    }
    .meta { display: flex; justify-content: space-between; font-size: 12px; margin: 12px 4px 8px; }
    .meta b { font-weight: 700; }
    table { width: 100%; border-collapse: collapse; }
    th {
      background: ${NAVY}; color: #fff; font-weight: 700; font-size: 11px;
      padding: 10px 6px; text-align: center; border: 1px solid ${NAVY};
    }
    td {
      border: 1px solid ${NAVY}; padding: 10px 8px; font-size: 12px;
      vertical-align: middle;
    }
    td.c { text-align: center; }
    td.r { text-align: right; }
    td.item { text-align: left; white-space: pre-line; }
    tr { height: 52px; }
    .total-bar {
      background: ${NAVY}; color: #fff; display: flex; justify-content: space-between;
      align-items: center; padding: 14px 16px; font-weight: 700; font-size: 16px; margin-top: 0;
    }
    .total-bar .amount { font-size: 20px; }
    .signs { margin-top: 56px; }
    .sign { display: flex; align-items: flex-end; gap: 12px; margin-bottom: 26px; }
    .sign .label { width: 80px; font-weight: 700; font-size: 12px; color: #111; padding-bottom: 3px; }
    .sign .line { flex: 1; border-bottom: 1px solid ${NAVY}; min-height: 22px; padding: 0 4px 3px; font-size: 12px; }
    .thanks { text-align: center; color: ${NAVY}; font-style: italic; font-size: 12px; margin-top: 40px; }
  </style>
</head>
<body>
  <div class="brand">${escapeHtml(inv.businessName)}</div>
  <div class="subtitle">${escapeHtml(inv.subtitle)}</div>

  <div class="banner">${escapeHtml(inv.title)}</div>

  <div class="meta">
    <span><b>Invoice No:</b> ${escapeHtml(inv.invoiceNo)}</span>
    <span><b>Date:</b> ${escapeHtml(inv.date)}</span>
  </div>

  <table>
    <colgroup>
      <col style="width:8%"><col style="width:45%"><col style="width:9%"><col style="width:18%"><col style="width:20%">
    </colgroup>
    <thead>
      <tr style="height:auto">
        <th>S/N</th><th>ITEM</th><th>QTY</th><th>UNIT PRICE</th><th>TOTAL</th>
      </tr>
    </thead>
    <tbody>${rows}
    </tbody>
  </table>

  <div class="total-bar">
    <span>TOTAL</span>
    <span class="amount">${formatMoney(grandTotal)}</span>
  </div>

  <div class="signs">
    ${signLine('NAME', inv.customerName)}
    ${signLine('CONTACT', inv.contact)}
    ${signLine('SIGN', inv.signature)}
  </div>

  <div class="thanks">Thank you for your business!</div>

  <script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}</script>
</body>
</html>`
}

export function ReceiptSimulator() {
  const [inv, setInv] = useState<InvoiceState>(seedInvoice)

  const grandTotal = useMemo(
    () => inv.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0),
    [inv.items],
  )

  const hasOutsourced = inv.items.some((item) => item.outsourced)

  const setField = <K extends keyof InvoiceState>(key: K, value: InvoiceState[K]) =>
    setInv((r) => ({ ...r, [key]: value }))

  const updateItem = (id: string, patch: Partial<LineItem>) =>
    setInv((r) => ({
      ...r,
      items: r.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }))

  const addItem = (outsourced: boolean) =>
    setInv((r) => ({
      ...r,
      items: [...r.items, { id: newId(), name: '', qty: 1, unitPrice: 0, outsourced }],
    }))

  const removeItem = (id: string) =>
    setInv((r) => ({ ...r, items: r.items.filter((item) => item.id !== id) }))

  const reset = () => setInv(seedInvoice())

  const printInvoice = () => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.open()
    win.document.write(buildInvoiceHtml(inv))
    win.document.close()
  }

  return (
    <div className="w-full min-w-0 space-y-4 overflow-hidden">
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <Button size="sm" variant="outline" onClick={() => addItem(false)} className="w-full sm:w-auto">
          <Plus className="mr-1 h-4 w-4" /> Add item
        </Button>
        <Button size="sm" variant="outline" onClick={() => addItem(true)} className="w-full sm:w-auto">
          <Plus className="mr-1 h-4 w-4" /> Add outsourced item
        </Button>
        <Button size="sm" variant="ghost" onClick={reset} className="w-full sm:w-auto">
          <RotateCcw className="mr-1 h-4 w-4" /> Reset
        </Button>
        <Button size="sm" onClick={printInvoice} className="col-span-2 sm:col-span-1 sm:ml-auto">
          <Printer className="mr-1 h-4 w-4" /> Print A4 invoice
        </Button>
      </div>

      {hasOutsourced && (
        <p className="text-xs text-muted-foreground">
          Outsourced items are only on this invoice. They are not saved and do not change stock or sales.
        </p>
      )}

      {/* On-screen invoice, laid out like the A4 design */}
      <div
        className="mx-auto w-full min-w-0 max-w-[794px] bg-white px-4 py-6 text-[#111] shadow-md sm:px-10 sm:py-10"
        style={{ colorScheme: 'light' }}
      >
        <div className="text-center">
          <input
            aria-label="Business name"
            value={inv.businessName}
            onChange={(e) => setField('businessName', e.target.value)}
            style={{ color: NAVY }}
            className="w-full min-w-0 bg-transparent text-center text-lg font-bold outline-none focus:bg-blue-50 sm:text-[22px]"
          />
          <input
            aria-label="Subtitle"
            value={inv.subtitle}
            onChange={(e) => setField('subtitle', e.target.value)}
            style={{ color: NAVY_SOFT }}
            className="mt-1 w-full min-w-0 bg-transparent text-center text-xs outline-none focus:bg-blue-50"
          />
        </div>

        <div className="mt-5" style={{ background: NAVY }}>
          <input
            aria-label="Document title"
            value={inv.title}
            onChange={(e) => setField('title', e.target.value)}
            className="w-full bg-transparent px-2 py-3 text-center text-lg font-bold text-white outline-none placeholder:text-white/60 sm:text-[22px]"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs sm:text-sm">
          <label className="flex items-center gap-1">
            <span className="font-bold text-[#111]">Invoice No:</span>
            <input
              aria-label="Invoice number"
              value={inv.invoiceNo}
              onChange={(e) => setField('invoiceNo', e.target.value)}
              className="w-28 bg-transparent text-[#111] outline-none focus:bg-blue-50"
            />
          </label>
          <label className="flex items-center gap-1">
            <span className="font-bold text-[#111]">Date:</span>
            <input
              aria-label="Date"
              value={inv.date}
              onChange={(e) => setField('date', e.target.value)}
              className="w-28 bg-transparent text-right text-[#111] outline-none focus:bg-blue-50"
            />
          </label>
        </div>

        <div className="mt-2 w-full overflow-x-auto">
          <table className="min-w-[560px] w-full border-collapse text-xs sm:text-sm" style={{ borderColor: NAVY }}>
            <colgroup>
              <col style={{ width: '8%' }} />
              <col style={{ width: '45%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '40px' }} />
            </colgroup>
            <thead>
              <tr style={{ background: NAVY, color: '#fff' }}>
                <th className="border px-2 py-2 text-center text-xs font-bold" style={{ borderColor: NAVY }}>S/N</th>
                <th className="border px-2 py-2 text-center text-xs font-bold" style={{ borderColor: NAVY }}>ITEM</th>
                <th className="border px-2 py-2 text-center text-xs font-bold" style={{ borderColor: NAVY }}>QTY</th>
                <th className="border px-2 py-2 text-center text-xs font-bold" style={{ borderColor: NAVY }}>UNIT PRICE</th>
                <th className="border px-2 py-2 text-center text-xs font-bold" style={{ borderColor: NAVY }}>TOTAL</th>
                <th className="border-0" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {inv.items.map((item, index) => {
                const lineTotal = item.qty * item.unitPrice
                return (
                  <tr key={item.id} className="text-[#111]" style={{ background: index % 2 === 1 ? STRIPE : '#fff' }}>
                    <td className="border px-2 py-2 text-center align-middle" style={{ borderColor: NAVY }}>
                      {index + 1}
                    </td>
                    <td className="border px-2 py-2 align-middle" style={{ borderColor: NAVY }}>
                      <textarea
                        aria-label={`Item ${index + 1} name`}
                        rows={2}
                        value={item.name}
                        placeholder={item.outsourced ? 'Outsourced item name' : ''}
                        onChange={(e) => updateItem(item.id, { name: e.target.value })}
                        className="w-full resize-none bg-transparent text-[#111] placeholder:text-[#9aa3b2] outline-none focus:bg-white/70"
                      />
                      {item.outsourced && (
                        <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-medium uppercase tracking-wide text-amber-800">
                          outsourced
                        </span>
                      )}
                    </td>
                    <td className="border px-2 py-2 text-center align-middle" style={{ borderColor: NAVY }}>
                      <input
                        aria-label={`Item ${index + 1} quantity`}
                        type="number"
                        min={0}
                        inputMode="decimal"
                        value={item.qty}
                        onChange={(e) => updateItem(item.id, { qty: parseNonNegative(e.target.value) })}
                        className="w-full bg-transparent text-center text-[#111] outline-none focus:bg-white/70 [appearance:textfield]"
                      />
                    </td>
                    <td className="border px-2 py-2 text-right align-middle" style={{ borderColor: NAVY }}>
                      <input
                        aria-label={`Item ${index + 1} unit price`}
                        type="number"
                        min={0}
                        inputMode="decimal"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, { unitPrice: parseNonNegative(e.target.value) })}
                        className="w-full bg-transparent text-right text-[#111] outline-none focus:bg-white/70 [appearance:textfield]"
                      />
                    </td>
                    <td className="border px-2 py-2 text-right align-middle tabular-nums" style={{ borderColor: NAVY }}>
                      {formatMoney(lineTotal)}
                    </td>
                    <td className="border-0 text-center">
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
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 text-white" style={{ background: NAVY }}>
          <span className="text-base font-bold sm:text-lg">TOTAL</span>
          <span className="text-lg font-bold tabular-nums sm:text-xl">{formatMoney(grandTotal)}</span>
        </div>

        <div className="mt-12 space-y-6 text-xs sm:text-sm">
          <FooterField label="NAME" value={inv.customerName} onChange={(v) => setField('customerName', v)} />
          <FooterField label="CONTACT" value={inv.contact} onChange={(v) => setField('contact', v)} />
          <FooterField label="SIGN" value={inv.signature} onChange={(v) => setField('signature', v)} />
        </div>

        <p className="mt-10 text-center text-xs italic sm:text-sm" style={{ color: NAVY }}>
          Thank you for your business!
        </p>
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
    <div className="flex items-end gap-3">
      <span className="w-20 shrink-0 font-bold sm:w-24">{label}:</span>
      <Input
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ borderColor: NAVY, color: '#111' }}
        className="h-8 min-w-0 flex-1 rounded-none border-0 border-b bg-transparent px-1 text-[#111] shadow-none focus-visible:ring-0"
      />
    </div>
  )
}

export default ReceiptSimulator
