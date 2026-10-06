import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { Printer, CheckCircle2, SlidersHorizontal } from 'lucide-react'
import { usePrinterStore } from '@/store/printer'

interface PaymentDetail {
  method: string
  amount: number
  mpesaRef?: string
}

interface ReceiptData {
  saleCode: string
  date: string
  branchName: string
  cashierName: string
  customerName?: string
  customerPhone?: string
  saleType: string
  items: Array<{
    name: string
    quantity: number
    unitPrice: number
    discount?: number
    total: number
  }>
  subtotal: number
  totalDiscount: number
  total: number
  payments: PaymentDetail[]
}

interface Props {
  receipt: ReceiptData | null
  onClose: () => void
}

export function ThermalReceiptModal({ receipt, onClose }: Props) {
  const printerStore = usePrinterStore()
  const autoPrintedRef = useRef(false)

  const handlePrint = () => {
    if (!receipt) return

    const {
      paperWidth = '58mm',
      printScale = 85,
      fontSize = 'compact',
      storeName = 'NJUGUSH ENTERPRISES',
      storeTagline = 'Quality LPG Gas & Electronics',
      footerNote = 'Thank you for your business! Goods once sold cannot be returned without original receipt.',
      feedBlankLines = 3,
      showCashierName = true,
      showCustomerDetails = true,
    } = printerStore

    const is58mm = paperWidth === '58mm'
    const maxWidthPx = is58mm ? '216px' : '300px'
    const baseFontSize =
      fontSize === 'compact' ? '11px' : fontSize === 'large' ? '14px' : '12px'
    const scaleFactor = (printScale || 85) / 100

    const win = window.open('', '_blank', 'width=380,height=600')
    if (!win) return

    const itemRows = receipt.items
      .map(
        (i) => `
      <tr>
        <td style="padding:3px 0;border-bottom:1px dashed #bbb;">
          <div style="font-weight:600;">${i.name}</div>
          <div style="font-size:0.85em;color:#444;">
            ${i.quantity} × ${Number(i.unitPrice).toLocaleString()}${i.discount ? ` (-${Number(i.discount).toLocaleString()})` : ''}
          </div>
        </td>
        <td style="padding:3px 0;text-align:right;vertical-align:bottom;border-bottom:1px dashed #bbb;font-weight:bold;white-space:nowrap;">
          ${Number(i.total).toLocaleString()}
        </td>
      </tr>`,
      )
      .join('')

    const paymentRows = receipt.payments
      .map(
        (p) => `
      <div style="display:flex;justify-content:space-between;font-size:0.9em;margin-top:2px;">
        <span>${p.method}${p.mpesaRef ? ` (${p.mpesaRef})` : ''}</span>
        <strong>KES ${Number(p.amount).toLocaleString()}</strong>
      </div>`,
      )
      .join('')

    const blankLinesHtml = Array.from({ length: feedBlankLines || 2 })
      .map(() => '<br/>')
      .join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt — ${receipt.saleCode}</title>
  <style>
    @page {
      size: ${paperWidth} auto;
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: ${is58mm ? '4px 6px' : '8px 12px'};
      width: ${maxWidthPx};
      max-width: ${maxWidthPx};
      font-family: 'Courier New', Courier, monospace, monospace;
      font-size: ${baseFontSize};
      color: #000;
      line-height: 1.25;
      zoom: ${scaleFactor};
      -webkit-print-color-adjust: exact;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .title {
      font-size: 1.2em;
      margin: 0;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .sub {
      font-size: 0.85em;
      color: #222;
      margin-top: 2px;
    }
    .dashed {
      border-top: 1px dashed #000;
      margin: 5px 0;
    }
    .double {
      border-top: 1px double #000;
      border-bottom: 1px double #000;
      height: 3px;
      margin: 5px 0;
    }
    .flex {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
    }
    @media print {
      body {
        margin: 0;
        padding: ${is58mm ? '2px 4px' : '6px 8px'};
      }
    }
  </style>
</head>
<body>
  <div class="center">
    <div class="title">${storeName}</div>
    ${storeTagline ? `<div class="sub">${storeTagline}</div>` : ''}
    <div class="sub">${receipt.branchName}</div>
    <div class="sub">${receipt.date}</div>
    <div class="dashed"></div>
    <div class="bold" style="font-size: 1.05em;">RECEIPT #${receipt.saleCode}</div>
  </div>

  ${
    showCustomerDetails && receipt.customerName
      ? `
  <div class="dashed"></div>
  <div class="sub">Customer: <strong style="color:#000;">${receipt.customerName}</strong></div>
  ${receipt.customerPhone ? `<div class="sub">Phone: ${receipt.customerPhone}</div>` : ''}
  `
      : ''
  }

  <div class="dashed"></div>
  <table>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="dashed"></div>
  <div class="flex"><span>Subtotal:</span><span>KES ${receipt.subtotal.toLocaleString()}</span></div>
  ${
    receipt.totalDiscount > 0
      ? `<div class="flex"><span>Discount:</span><span>- KES ${receipt.totalDiscount.toLocaleString()}</span></div>`
      : ''
  }
  <div class="flex bold" style="font-size:1.15em;margin-top:3px;">
    <span>TOTAL:</span>
    <span>KES ${receipt.total.toLocaleString()}</span>
  </div>

  <div class="dashed"></div>
  <div class="bold" style="font-size:0.9em;margin-bottom:2px;">PAYMENT:</div>
  ${paymentRows}

  ${
    showCashierName
      ? `
  <div class="dashed"></div>
  <div class="flex sub"><span>Cashier:</span><span>${receipt.cashierName}</span></div>
  `
      : ''
  }

  ${
    footerNote
      ? `
  <div class="dashed"></div>
  <div class="center sub" style="margin-top:4px;">
    ${footerNote}
  </div>
  `
      : ''
  }

  ${blankLinesHtml}

  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
</body>
</html>`

    win.document.write(html)
    win.document.close()
  }

  // Auto print once if autoPrintOnSale is enabled in printer settings
  useEffect(() => {
    if (receipt && printerStore.autoPrintOnSale && !autoPrintedRef.current) {
      autoPrintedRef.current = true
      handlePrint()
    }
  }, [receipt, printerStore.autoPrintOnSale])

  if (!receipt) return null

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
              <DialogTitle>Sale Completed — #{receipt.saleCode}</DialogTitle>
            </div>
            <Badge variant="outline" className="text-[11px] font-mono">
              {printerStore.paperWidth} &bull; {printerStore.printScale}%
            </Badge>
          </div>
        </DialogHeader>

        {/* Thermal Preview Box */}
        <div className="p-4 bg-muted/40 rounded-xl border border-dashed font-mono text-xs space-y-3 max-h-[50vh] overflow-y-auto">
          <div className="text-center space-y-0.5">
            <p className="font-bold text-sm tracking-wider">{printerStore.storeName || 'NJUGUSH ENTERPRISES'}</p>
            {printerStore.storeTagline && (
              <p className="text-[11px] text-muted-foreground">{printerStore.storeTagline}</p>
            )}
            <p className="text-muted-foreground">{receipt.branchName}</p>
            <p className="text-[11px] text-muted-foreground">{receipt.date}</p>
            <p className="font-bold pt-1">SALE REF: {receipt.saleCode}</p>
          </div>

          {printerStore.showCustomerDetails && receipt.customerName && (
            <div className="border-t border-dashed pt-2 text-[11px] text-muted-foreground">
              Client: <span className="font-bold text-foreground">{receipt.customerName}</span>
              {receipt.customerPhone && ` (${receipt.customerPhone})`}
            </div>
          )}

          <div className="border-t border-dashed pt-2 space-y-1.5">
            {receipt.items.map((i, idx) => (
              <div key={idx} className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-foreground">{i.name}</p>
                  <p className="text-muted-foreground text-[10px]">
                    {i.quantity} × {formatCurrency(i.unitPrice)}
                    {i.discount ? ` (-${formatCurrency(i.discount)})` : ''}
                  </p>
                </div>
                <p className="font-bold">{formatCurrency(i.total)}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed pt-2 space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal:</span>
              <span>{formatCurrency(receipt.subtotal)}</span>
            </div>
            {receipt.totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discounts:</span>
                <span>- {formatCurrency(receipt.totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm text-foreground pt-1 border-t border-dashed">
              <span>TOTAL DUE:</span>
              <span>{formatCurrency(receipt.total)}</span>
            </div>
          </div>

          <div className="border-t border-dashed pt-2 space-y-1">
            <p className="font-bold text-[11px]">PAYMENTS:</p>
            {receipt.payments.map((p, idx) => (
              <div key={idx} className="flex justify-between items-center text-[11px]">
                <span className="text-muted-foreground">
                  {p.method} {p.mpesaRef && <span className="font-mono text-primary font-bold">({p.mpesaRef})</span>}
                </span>
                <span className="font-bold">{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </div>

          {printerStore.showCashierName && (
            <div className="border-t border-dashed pt-2 text-center text-muted-foreground text-[11px]">
              Cashier: {receipt.cashierName}
            </div>
          )}

          {printerStore.footerNote && (
            <div className="border-t border-dashed pt-2 text-center text-muted-foreground text-[10px] italic">
              {printerStore.footerNote}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Done
            </Button>
            <Link to="/printer-setup">
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Printer Setup
              </Button>
            </Link>
          </div>
          <Button onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Printer className="w-4 h-4 mr-2" />
            Print Receipt ({printerStore.paperWidth})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
