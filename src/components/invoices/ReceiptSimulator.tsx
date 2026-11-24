import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Printer, RotateCcw, Trash2 } from 'lucide-react'
import { usePrinterStore, type PrinterState } from '@/store/printer'

/*
 * ReceiptSimulator
 *
 * A local-only receipt builder. The on-screen view is laid out like the
 * handwritten sheet so it is easy to edit. Printing does not print that
 * layout. It prints a thermal roll receipt built from the same data and the
 * settings in Printer Setup (paper width, scale, font size, store name,
 * tagline, footer). Nothing here calls the API, touches inventory, or creates
 * a sale or invoice. Outsourced items exist only in this component's state.
 *
 * Usage (in pages/branch/Invoices.tsx):
 *   import { ReceiptSimulator } from '@/components/invoices/ReceiptSimulator'
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

const formatMoney2 = (n: number) =>
  n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const parseNonNegative = (raw: string) => {
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c],
  )

/*
 * Builds the thermal roll HTML. Styling mirrors runTestPrint in
 * store/printer.ts so the printout matches the Printer Setup preview.
 * Every user-entered string goes through escapeHtml because this HTML is
 * written into a new window that shares the app's origin.
 */
function buildThermalHtml(receipt: ReceiptState, printer: PrinterState): string {
  const is58mm = printer.paperWidth === '58mm'
  const maxWidthPx = is58mm ? '216px' : '300px'
  const baseFontSize =
    printer.fontSize === 'compact' ? '11px' : printer.fontSize === 'large' ? '14px' : '12px'
  const scale = (printer.printScale || 85) / 100
  const padding = is58mm ? '4px 6px' : '8px 12px'
  const printPadding = is58mm ? '2px 4px' : '6px 8px'

  const grandTotal = receipt.items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0)

  const itemsHtml = receipt.items
    .map((item) => {
      const name = escapeHtml(item.name.trim() || '(no name)')
      return `
        <div class="item">
          <div class="bold">${name}</div>
          <div class="row sub">
            <span>${formatMoney2(item.qty)} x ${formatMoney2(item.unitPrice)}</span>
            <span class="bold">${formatMoney2(item.qty * item.unitPrice)}</span>
          </div>
        </div>`
    })
    .join('')

  const customerLines: string[] = []
  if (printer.showCustomerDetails) {
    if (receipt.customerName.trim())
      customerLines.push(`<div class="row"><span>Customer:</span><span class="bold">${escapeHtml(receipt.customerName.trim())}</span></div>`)
    if (receipt.contact.trim())
      customerLines.push(`<div class="row"><span>Contact:</span><span>${escapeHtml(receipt.contact.trim())}</span></div>`)
  }

  const blankLines = Array.from({ length: printer.feedBlankLines || 2 }).map(() => '<br/>').join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt — ${escapeHtml(receipt.businessName)}</title>
  <style>
    @page { size: ${printer.paperWidth} auto; margin: 0; }
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      padding: ${padding};
      width: ${maxWidthPx};
      max-width: ${maxWidthPx};
      font-family: 'Courier New', Courier, monospace;
      font-size: ${baseFontSize};
      color: #000;
      line-height: 1.25;
      zoom: ${scale};
      -webkit-print-color-adjust: exact;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .title { font-size: 1.25em; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 2px 0; }
    .sub { font-size: 0.85em; color: #333; }
    .dashed { border-top: 1px dashed #000; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; gap: 6px; margin-bottom: 2px; }
    .item { margin-bottom: 4px; }
    .total { font-weight: 900; font-size: 1.1em; }
    .badge { display: inline-block; border: 1px solid #000; padding: 2px 6px; font-weight: bold; font-size: 0.9em; margin: 4px 0; }
    .sign-line { border-bottom: 1px solid #000; height: 18px; margin-top: 10px; }
    @media print { body { margin: 0; padding: ${printPadding}; } }
  </style>
</head>
<body>
  <div class="center">
    <div class="title">${escapeHtml(receipt.businessName)}</div>
    ${printer.storeTagline ? `<div class="sub">${escapeHtml(printer.storeTagline)}</div>` : ''}
    <div class="sub">${escapeHtml(receipt.title)} &middot; ${escapeHtml(receipt.date)}</div>
    <div class="badge">SIMULATION - NOT A SALE</div>
  </div>

  ${customerLines.length ? `<div class="dashed"></div>${customerLines.join('')}` : ''}

  <div class="dashed"></div>
  ${itemsHtml}

  <div class="dashed"></div>
  <div class="row total"><span>TOTAL:</span><span>KES ${formatMoney2(grandTotal)}</span></div>

  ${receipt.signature.trim() ? `<div class="dashed"></div><div class="row"><span>Signed:</span><span>${escapeHtml(receipt.signature.trim())}</span></div><div class="sign-line"></div>` : ''}

  ${printer.footerNote ? `<div class="dashed"></div><div class="center sub">${escapeHtml(printer.footerNote)}</div>` : ''}

  ${blankLines}
  <script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}</script>
</body>
</html>`
}

export function ReceiptSimulator() {
  const [receipt, setReceipt] = useState<ReceiptState>(seedReceipt)
  const printer = usePrinterStore()

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
      items: [...r.items, { id: newId(), name: '', qty: 1, unitPrice: 0, outsourced }],
    }))

  const removeItem = (id: string) =>
    setReceipt((r) => ({ ...r, items: r.items.filter((item) => item.id !== id) }))

  const reset = () => setReceipt(seedReceipt())

  const printThermal = () => {
    const win = window.open('', '_blank', 'width=360,height=640')
    if (!win) return
    win.document.open()
    win.document.write(buildThermalHtml(receipt, printer))
    win.document.close()
  }

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
      `}</style>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => addItem(false)}>
          <Plus className="mr-1 h-4 w-4" /> Add item
        </Button>
        <Button size="sm" variant="outline" onClick={() => addItem(true)}>
          <Plus className="mr-1 h-4 w-4" /> Add outsourced item
        </Button>
        <Button size="sm" variant="ghost" onClick={reset}>
          <RotateCcw className="mr-1 h-4 w-4" /> Reset
        </Button>
        <Button size="sm" onClick={printThermal} className="ml-auto">
          <Printer className="mr-1 h-4 w-4" /> Print thermal receipt
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Prints on a {printer.paperWidth} roll at {printer.printScale}% with {printer.fontSize} text,
        as set in Printer Setup.
        {hasOutsourced && ' Outsourced items are only on this receipt. They are not saved and do not change stock or sales.'}
      </p>

      {/* On-screen editing view, laid out like the handwritten sheet */}
      <div className="receipt-paper mx-auto w-full max-w-[760px] bg-[#f8f6ef] px-8 py-8 shadow-md text-[#1d3c8f]">
        <div className="text-center">
          <input
            aria-label="Business name"
            value={receipt.businessName}
            onChange={(e) => setField('businessName', e.target.value)}
            className="w-full bg-transparent text-center text-xl font-bold tracking-wide outline-none focus:bg-white/60"
          />
          <input
            aria-label="Document title"
            value={receipt.title}
            onChange={(e) => setField('title', e.target.value)}
            className="mt-1 w-full bg-transparent text-center text-lg font-semibold tracking-wide outline-none focus:bg-white/60"
          />
        </div>

        <div className="mt-2 flex justify-end">
          <input
            aria-label="Date"
            value={receipt.date}
            onChange={(e) => setField('date', e.target.value)}
            className="w-36 bg-transparent text-right text-base outline-none focus:bg-white/60"
          />
        </div>

        <table className="mt-4 w-full table-fixed border-collapse text-base">
          <colgroup>
            <col className="w-12" />
            <col />
            <col className="w-16" />
            <col className="w-32" />
            <col className="w-32" />
            <col className="w-10" />
          </colgroup>
          <thead>
            <tr className="h-8 text-left font-semibold">
              <th className="px-1">SN</th>
              <th className="px-1">ITEM</th>
              <th className="px-1 text-center">QTY</th>
              <th className="px-1 text-right">UNIT PRICE</th>
              <th className="px-1 text-right">TOTAL</th>
              <th aria-label="Actions" />
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
                      className="w-full bg-transparent outline-none focus:bg-white/60"
                    />
                    {item.outsourced && (
                      <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-medium uppercase tracking-wide text-amber-800">
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
                      className="w-full bg-transparent text-center outline-none focus:bg-white/60 [appearance:textfield]"
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
                      className="w-full bg-transparent text-right outline-none focus:bg-white/60 [appearance:textfield]"
                    />
                  </td>
                  <td className="px-1 text-right tabular-nums">{formatMoney(lineTotal)}</td>
                  <td className="text-center">
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
              <td />
            </tr>
          </tfoot>
        </table>

        <div className="mt-8 space-y-2 text-base">
          <FooterField label="NAME" value={receipt.customerName} onChange={(v) => setField('customerName', v)} />
          <FooterField label="CONTACT" value={receipt.contact} onChange={(v) => setField('contact', v)} />
          <FooterField label="SIGN" value={receipt.signature} onChange={(v) => setField('signature', v)} />
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
        className="h-8 flex-1 rounded-none border-0 border-b border-[#1d3c8f]/40 bg-transparent px-1 text-[#1d3c8f] shadow-none focus-visible:ring-0"
      />
    </div>
  )
}

export default ReceiptSimulator
