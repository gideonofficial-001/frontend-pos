import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'
import { Banknote, Smartphone, Check, CreditCard, Layers } from 'lucide-react'

export interface PaymentEntry {
  method: 'CASH' | 'PAYBILL'
  amount: number
  paymentRef?: string
  customerName?: string
}

interface Props {
  total: number
  pendingSaleData?: any
  onConfirm: (payments: PaymentEntry[]) => void
  onClose: () => void
}

type PaymentTab = 'CASH' | 'PAYBILL' | 'SPLIT'

export function PaymentSplitModal({ total, pendingSaleData, onConfirm, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<PaymentTab>('CASH')

  // Cash Tab State
  const [cashTendered, setCashTendered] = useState<string>(String(total))

  // PayBill Tab State
  const [paybillAmount, setPaybillAmount] = useState<string>(String(total))
  const [paybillCustomerName, setPaybillCustomerName] = useState<string>(
    pendingSaleData?.customerName || ''
  )
  const [paybillRef, setPaybillRef] = useState<string>('')

  // Split Tab State
  const [splitPaybillAmount, setSplitPaybillAmount] = useState<string>(String(Math.floor(total / 2)))
  const [splitCashTendered, setSplitCashTendered] = useState<string>(String(Math.ceil(total / 2)))
  const [splitCustomerName, setSplitCustomerName] = useState<string>(
    pendingSaleData?.customerName || ''
  )
  const [splitPaymentRef, setSplitPaymentRef] = useState<string>('')

  // Calculations for CASH
  const numCashTendered = Number(cashTendered) || 0
  const cashChange = Math.max(0, numCashTendered - total)
  const isCashValid = numCashTendered >= total

  // Calculations for PAYBILL
  const numPaybillAmount = Number(paybillAmount) || 0
  const isPaybillValid = numPaybillAmount === total

  // Calculations for SPLIT
  const numSplitPaybill = Number(splitPaybillAmount) || 0
  const numSplitCash = Number(splitCashTendered) || 0
  const splitTotalPaid = numSplitPaybill + numSplitCash
  const splitCashPortionNeeded = Math.max(0, total - numSplitPaybill)
  const splitChange = Math.max(0, numSplitCash - splitCashPortionNeeded)
  const isSplitValid = numSplitPaybill > 0 && splitTotalPaid >= total

  // Handle Confirm Submission
  const handleConfirm = () => {
    if (activeTab === 'CASH') {
      if (!isCashValid) return
      onConfirm([
        {
          method: 'CASH',
          amount: total,
        },
      ])
    } else if (activeTab === 'PAYBILL') {
      if (!isPaybillValid) return
      onConfirm([
        {
          method: 'PAYBILL',
          amount: total,
          customerName: paybillCustomerName.trim() || undefined,
          paymentRef: paybillRef.trim() || undefined,
        },
      ])
    } else if (activeTab === 'SPLIT') {
      if (!isSplitValid) return
      const payments: PaymentEntry[] = [
        {
          method: 'PAYBILL',
          amount: numSplitPaybill,
          customerName: splitCustomerName.trim() || undefined,
          paymentRef: splitPaymentRef.trim() || undefined,
        },
        {
          method: 'CASH',
          amount: Math.min(splitCashPortionNeeded, numSplitCash),
        },
      ]
      onConfirm(payments)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl font-bold flex items-center justify-between">
            <span>Payment Checkout</span>
            <span className="text-primary font-black text-2xl">{formatCurrency(total)}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Select payment method: Cash, PayBill, or Split payment.
          </DialogDescription>
        </DialogHeader>

        {/* Payment Method Switcher Tabs */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-muted rounded-lg text-sm font-semibold mt-1">
          <button
            type="button"
            className={`flex items-center justify-center gap-1.5 py-2 rounded-md transition-all ${
              activeTab === 'CASH'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('CASH')}
          >
            <Banknote className="w-4 h-4 text-emerald-600" />
            Cash
          </button>
          <button
            type="button"
            className={`flex items-center justify-center gap-1.5 py-2 rounded-md transition-all ${
              activeTab === 'PAYBILL'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('PAYBILL')}
          >
            <Smartphone className="w-4 h-4 text-blue-600" />
            PayBill
          </button>
          <button
            type="button"
            className={`flex items-center justify-center gap-1.5 py-2 rounded-md transition-all ${
              activeTab === 'SPLIT'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('SPLIT')}
          >
            <Layers className="w-4 h-4 text-purple-600" />
            Split
          </button>
        </div>

        {/* ── Tab: CASH ── */}
        {activeTab === 'CASH' && (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="cashTendered" className="text-xs font-semibold">
                Cash Tendered (KES) *
              </Label>
              <Input
                id="cashTendered"
                type="number"
                min={total}
                step="10"
                value={cashTendered}
                onChange={(e) => setCashTendered(e.target.value)}
                className="text-lg font-bold h-11"
                autoFocus
              />
            </div>

            {/* Change Display */}
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold">Change to Customer</span>
                <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(cashChange)}
                </p>
              </div>
              <Banknote className="w-6 h-6 text-emerald-600 opacity-60" />
            </div>

            {/* Quick cash shortcut buttons */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[11px] text-muted-foreground font-semibold mr-1 self-center">Exact:</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setCashTendered(String(total))}
              >
                KES {total}
              </Button>
              {[total + 50, total + 100, Math.ceil(total / 500) * 500, Math.ceil(total / 1000) * 1000]
                .filter((v, idx, arr) => v > total && arr.indexOf(v) === idx)
                .slice(0, 3)
                .map((amt) => (
                  <Button
                    key={amt}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setCashTendered(String(amt))}
                  >
                    KES {amt}
                  </Button>
                ))}
            </div>
          </div>
        )}

        {/* ── Tab: PAYBILL ── */}
        {activeTab === 'PAYBILL' && (
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="paybillAmount" className="text-xs font-semibold">
                PayBill Amount (KES) *
              </Label>
              <Input
                id="paybillAmount"
                type="number"
                value={paybillAmount}
                onChange={(e) => setPaybillAmount(e.target.value)}
                className="text-lg font-bold h-11"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="paybillCustomer" className="text-xs font-semibold">
                Customer Name (Optional)
              </Label>
              <Input
                id="paybillCustomer"
                placeholder="Name on PayBill confirmation"
                value={paybillCustomerName}
                onChange={(e) => setPaybillCustomerName(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="paybillRef" className="text-xs font-semibold">
                Reference / Description (Optional)
              </Label>
              <Input
                id="paybillRef"
                placeholder="PayBill reference or transaction code"
                value={paybillRef}
                onChange={(e) => setPaybillRef(e.target.value)}
                className="h-9"
              />
            </div>

            <p className="text-[11px] text-muted-foreground pt-1">
              Direct PayBill entry. No phone number or STK push required.
            </p>
          </div>
        )}

        {/* ── Tab: SPLIT (PayBill + Cash) ── */}
        {activeTab === 'SPLIT' && (
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="splitPaybill" className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                  PayBill Portion (KES) *
                </Label>
                <Input
                  id="splitPaybill"
                  type="number"
                  min="1"
                  max={total}
                  value={splitPaybillAmount}
                  onChange={(e) => {
                    const pb = Number(e.target.value) || 0
                    setSplitPaybillAmount(e.target.value)
                    setSplitCashTendered(String(Math.max(0, total - pb)))
                  }}
                  className="font-bold h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="splitCash" className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  Cash Portion (KES) *
                </Label>
                <Input
                  id="splitCash"
                  type="number"
                  min="0"
                  value={splitCashTendered}
                  onChange={(e) => setSplitCashTendered(e.target.value)}
                  className="font-bold h-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="splitCustomer" className="text-xs font-semibold">
                PayBill Customer Name (Optional)
              </Label>
              <Input
                id="splitCustomer"
                placeholder="Name on PayBill confirmation"
                value={splitCustomerName}
                onChange={(e) => setSplitCustomerName(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="splitRef" className="text-xs font-semibold">
                PayBill Reference (Optional)
              </Label>
              <Input
                id="splitRef"
                placeholder="PayBill reference / transaction code"
                value={splitPaymentRef}
                onChange={(e) => setSplitPaymentRef(e.target.value)}
                className="h-9"
              />
            </div>

            {/* Split Summary Footer */}
            <div className="p-2.5 rounded-md bg-muted/60 text-xs space-y-1">
              <div className="flex justify-between">
                <span>Total Covered:</span>
                <span className={`font-bold ${splitTotalPaid >= total ? 'text-emerald-600' : 'text-destructive'}`}>
                  {formatCurrency(splitTotalPaid)} / {formatCurrency(total)}
                </span>
              </div>
              {splitChange > 0 && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-300 font-semibold">
                  <span>Cash Change:</span>
                  <span>{formatCurrency(splitChange)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dialog Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>

          <Button
            type="button"
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
            disabled={
              (activeTab === 'CASH' && !isCashValid) ||
              (activeTab === 'PAYBILL' && !isPaybillValid) ||
              (activeTab === 'SPLIT' && !isSplitValid)
            }
            onClick={handleConfirm}
          >
            <Check className="w-4 h-4 mr-1.5" />
            Confirm Payment ({formatCurrency(total)})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
