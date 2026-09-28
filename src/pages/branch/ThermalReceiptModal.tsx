import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { Printer, CheckCircle2 } from 'lucide-react'

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
  if (!receipt) return null

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=380,height=600')
    if (!win) return

    const itemRows = receipt.items
      .map(
        (i) => `
      <tr>
        <td style="padding:4px 0;border-bottom:1px dashed #eee;">
          <div>${i.name}</div>
          <div style="font-size:11px;color:#666;">${i.quantity} × ${Number(i.unitPrice).toLocaleString()}${i.discount ? ` (-${Number(i.discount).toLocaleString()})` : ''}</div>
        </td>
        <td style="padding:4px 0;text-align:right;vertical-align:bottom;border-bottom:1px dashed #eee;font-weight:bold;">
          KES ${Number(i.total).toLocaleString()}
        </td>
      </tr>`,
      )
      .join('')

    const paymentRows = receipt.payments
      .map(
        (p) => `
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:2px;">
        <span>${p.method}${p.mpesaRef ? ` (${p.mpesaRef})` : ''}</span>
        <strong>KES ${Number(p.amount).toLocaleString()}</strong>
      </div>`,
      )
      .join('')

    win.document.write(`<!DOCTYPE html><html><head>
      <title>Receipt — ${receipt.saleCode}</title>
      <style>
        body { font-family: monospace, -apple-system, sans-serif; padding: 12px; max-width: 320px; margin: auto; font-size: 12px; color: #111; line-height: 1.3; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .title { font-size: 16px; margin: 0; font-weight: 900; text-transform: uppercase; }
        .sub { font-size: 11px; color: #555; margin-top: 2px; }
        .divider { border-top: 1px dashed #777; margin: 8px 0; }
        .flex { display: flex; justify-content: space-between; }
        table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        @media print { body { padding: 0; } }
      </style>
    </head><body>
      <div class="center">
        <h1 class="title">NJUGUSH ENTERPRISES</h1>
        <div class="sub">${receipt.branchName}</div>
        <div class="sub">${receipt.date}</div>
        <div class="bold" style="margin-top:4px;">SALE #${receipt.saleCode}</div>
      </div>

      ${receipt.customerName ? `
      <div class="divider"></div>
      <div class="sub">Customer: <strong>${receipt.customerName}</strong></div>
      ${receipt.customerPhone ? `<div class="sub">Phone: ${receipt.customerPhone}</div>` : ''}
      ` : ''}

      <div class="divider"></div>
      <table>
        <tbody>${itemRows}</tbody>
      </table>

      <div class="divider"></div>
      <div class="flex"><span>Subtotal:</span><span>KES ${receipt.subtotal.toLocaleString()}</span></div>
      ${receipt.totalDiscount > 0 ? `<div class="flex" style="color:#16a34a;"><span>Discount:</span><span>- KES ${receipt.totalDiscount.toLocaleString()}</span></div>` : ''}
      <div class="flex bold" style="font-size:14px;margin-top:4px;"><span>TOTAL:</span><span>KES ${receipt.total.toLocaleString()}</span></div>

      <div class="divider"></div>
      <div class="bold" style="font-size:11px;margin-bottom:2px;">PAID VIA:</div>
      ${paymentRows}

      <div class="divider"></div>
      <div class="center sub">Served by: ${receipt.cashierName}</div>
      <div class="center bold" style="margin-top:8px;">Thank you for your business!</div>
      <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()};</script>
    </body></html>`)
    win.document.close()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
            <DialogTitle>Sale Completed — #{receipt.saleCode}</DialogTitle>
          </div>
        </DialogHeader>

        {/* Thermal Preview Box */}
        <div className="p-4 bg-muted/40 rounded-xl border border-dashed font-mono text-xs space-y-3 max-h-[50vh] overflow-y-auto">
          <div className="text-center space-y-0.5">
            <p className="font-bold text-sm tracking-wider">NJUGUSH ENTERPRISES</p>
            <p className="text-muted-foreground">{receipt.branchName}</p>
            <p className="text-[11px] text-muted-foreground">{receipt.date}</p>
            <p className="font-bold pt-1">SALE REF: {receipt.saleCode}</p>
          </div>

          {receipt.customerName && (
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

          <div className="border-t border-dashed pt-2 text-center text-muted-foreground text-[11px]">
            Cashier: {receipt.cashierName}
          </div>
        </div>

        <DialogFooter className="flex sm:justify-between gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
          <Button onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Printer className="w-4 h-4 mr-2" /> Print Receipt (58/80mm)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
