import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { usePrinterStore } from '@/store/printer'
import { printFinalReportReceipt } from '@/lib/printFinalReportReceipt'
import {
  Printer,
  Copy,
  Receipt,
  CheckCircle2,
  Banknote,
  Smartphone,
  MinusCircle,
  Equal,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'

export interface FinalReportReceiptSimulationProps {
  branchName: string
  date: string
  retailTotal: number
  wholesaleTotal: number
  netSales: number
  paybillTotal: number
  difference1: number
  expenseTotal: number
  pettyCashTotal?: number
  regularExpenseTotal?: number
  difference2: number
  amountToBeSubmittedCash: number
  cashierName?: string
  isLoading?: boolean
}

export const FinalReportReceiptSimulation: React.FC<FinalReportReceiptSimulationProps> = ({
  branchName,
  date,
  retailTotal,
  wholesaleTotal,
  netSales,
  paybillTotal,
  difference1,
  expenseTotal,
  pettyCashTotal = 0,
  regularExpenseTotal = 0,
  difference2,
  amountToBeSubmittedCash,
  cashierName,
  isLoading = false,
}) => {
  const printerStore = usePrinterStore()
  const [selectedPaperWidth, setSelectedPaperWidth] = useState<'58mm' | '80mm'>(
    printerStore.paperWidth || '58mm'
  )

  const is58mm = selectedPaperWidth === '58mm'
  const receiptWidthPx = is58mm ? 250 : 330
  const storeName = printerStore.storeName || 'NJUGUSH ENT'
  const branchLabel = branchName ? branchName.toUpperCase() : 'STORE'
  const formattedDate = date || new Date().toISOString().split('T')[0]

  const handlePrint = () => {
    printFinalReportReceipt({
      storeName,
      branchName,
      date: formattedDate,
      retailTotal,
      wholesaleTotal,
      netSales,
      paybillTotal,
      difference1,
      expenseTotal,
      pettyCashTotal,
      regularExpenseTotal,
      difference2,
      amountToBeSubmittedCash,
      cashierName,
      paperWidth: selectedPaperWidth,
      printScale: printerStore.printScale || 85,
    })
  }

  const handleCopy = () => {
    const text = [
      `${storeName} (${branchLabel}).     ${formattedDate}`,
      `> Final Report`,
      ``,
      `Net sales (retail + wholesale): ${formatCurrency(netSales)}`,
      `Amount paid to pay bill: - ${formatCurrency(paybillTotal)}`,
      `---------------------------------`,
      `{Difference 1}: ${formatCurrency(difference1)}`,
      `Day's Expenses (petty cash inclusive): - ${formatCurrency(expenseTotal)}`,
      `---------------------------------`,
      `{Difference 2}: ${formatCurrency(difference2)}`,
      ``,
      `Amount to be submitted cash = ${formatCurrency(amountToBeSubmittedCash)}`,
      cashierName ? `Submitted by: ${cashierName}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    navigator.clipboard.writeText(text)
    toast.success('Final report summary copied to clipboard!')
  }

  return (
    <Card className="border-primary/20 shadow-lg bg-card/60 backdrop-blur-sm overflow-hidden">
      <CardHeader className="border-b bg-muted/30 pb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/20 text-primary border-primary/30 uppercase text-[10px] tracking-wider font-bold">
                Live Receipt Simulation
              </Badge>
              <Badge variant="outline" className="font-mono text-xs">
                {selectedPaperWidth}
              </Badge>
            </div>
            <CardTitle className="text-lg font-bold flex items-center gap-2 mt-1.5">
              <Receipt className="w-5 h-5 text-primary" />
              End of Day Cash Submission Receipt
            </CardTitle>
            <CardDescription className="text-xs">
              Live thermal receipt emulation showing the exact physical cash amount to be submitted for {formattedDate}.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-muted rounded-lg p-0.5 border text-xs">
              <button
                type="button"
                onClick={() => setSelectedPaperWidth('58mm')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  selectedPaperWidth === '58mm'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                58mm
              </button>
              <button
                type="button"
                onClick={() => setSelectedPaperWidth('80mm')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  selectedPaperWidth === '80mm'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                80mm
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5 text-xs h-8"
              disabled={isLoading}
            >
              <Copy className="w-3.5 h-3.5" /> Copy
            </Button>

            <Button
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
              disabled={isLoading}
            >
              <Printer className="w-3.5 h-3.5" /> Print Thermal Receipt
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Breakdown Cards & Formula Explanation */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-muted/40 rounded-xl p-4 border space-y-3">
              <h4 className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Banknote className="w-4 h-4 text-emerald-600" />
                Cash Reconciliation Breakdown
              </h4>

              <div className="space-y-2.5 text-sm">
                {/* 1. Net Sales */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-card border">
                  <div>
                    <p className="font-semibold text-xs text-muted-foreground uppercase">1. Net Sales Today</p>
                    <p className="text-xs text-muted-foreground">
                      Retail ({formatCurrency(retailTotal)}) + Wholesale ({formatCurrency(wholesaleTotal)})
                    </p>
                  </div>
                  <span className="font-bold text-base">{formatCurrency(netSales)}</span>
                </div>

                {/* 2. Amount paid to paybill */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-card border">
                  <div>
                    <p className="font-semibold text-xs text-purple-600 dark:text-purple-400 uppercase flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5" />
                      2. Less: Amount Paid to Pay Bill / M-Pesa
                    </p>
                    <p className="text-xs text-muted-foreground">Direct digital collections credited to till</p>
                  </div>
                  <span className="font-bold text-base text-purple-600 dark:text-purple-400">
                    - {formatCurrency(paybillTotal)}
                  </span>
                </div>

                {/* Difference 1 */}
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-blue-900 dark:text-blue-200">
                    <Equal className="w-3.5 h-3.5 text-blue-600" />
                    <span>Difference 1 (Cash from Sales):</span>
                  </div>
                  <span className="font-black text-sm text-blue-900 dark:text-blue-100">
                    {formatCurrency(difference1)}
                  </span>
                </div>

                {/* 3. Day's Expenses */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-card border">
                  <div>
                    <p className="font-semibold text-xs text-rose-600 dark:text-rose-400 uppercase flex items-center gap-1">
                      <MinusCircle className="w-3.5 h-3.5" />
                      3. Less: Day's Expenses
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Petty cash inclusive {pettyCashTotal > 0 ? `(Petty: ${formatCurrency(pettyCashTotal)})` : ''}
                    </p>
                  </div>
                  <span className="font-bold text-base text-rose-600 dark:text-rose-400">
                    - {formatCurrency(expenseTotal)}
                  </span>
                </div>

                {/* Difference 2 */}
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900 dark:text-amber-200">
                    <Equal className="w-3.5 h-3.5 text-amber-600" />
                    <span>Difference 2:</span>
                  </div>
                  <span className="font-black text-sm text-amber-900 dark:text-amber-100">
                    {formatCurrency(difference2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Grand Amount to be submitted cash box */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-2 border-emerald-500/40 shadow-sm space-y-1">
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Amount To Be Submitted Cash
              </p>
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(amountToBeSubmittedCash)}
                </span>
                <Badge variant="outline" className="border-emerald-600 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-xs font-mono font-bold">
                  {formattedDate}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                This is the exact net physical cash balance to count and hand over at closing.
              </p>
            </div>
          </div>

          {/* Right Column: Physical Thermal Receipt Simulation */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full text-center pb-2">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                Physical Receipt Preview
              </span>
            </div>

            {/* Thermal paper roll container */}
            <div className="relative p-2 bg-gradient-to-b from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg shadow-inner border border-slate-300 dark:border-slate-700">
              <div
                className="bg-white text-black font-mono shadow-2xl border-2 border-dashed border-slate-400 p-4 rounded-sm text-xs transition-all overflow-hidden selection:bg-slate-200"
                style={{
                  width: `${receiptWidthPx}px`,
                  lineHeight: '1.3',
                }}
              >
                {/* Header matching exact user spec: NJUGUSH ENT (STORE NAME).     {DATE} */}
                <div className="text-center space-y-0.5 border-b border-dashed border-slate-400 pb-2 mb-2">
                  <p className="font-black text-sm uppercase tracking-wide">
                    {storeName} ({branchLabel}).
                  </p>
                  <p className="text-[11px] text-slate-700 font-semibold">{formattedDate}</p>
                  <p className="font-bold text-[12px] pt-1 text-slate-900">&gt; Final Report</p>
                </div>

                {/* Net Sales */}
                <div className="space-y-1 pt-1 text-[11px]">
                  <div className="font-bold flex justify-between items-baseline">
                    <span className="text-[10px]">Net sales(retail + wholesale)</span>
                  </div>
                  <div className="flex justify-between items-baseline font-bold pl-2">
                    <span className="text-slate-600 text-[10px]">Total:</span>
                    <span>{formatCurrency(netSales)}</span>
                  </div>

                  {/* Amount paid to pay bill */}
                  <div className="flex justify-between items-baseline pt-1">
                    <span className="text-[10px]">Amount paid to pay bill</span>
                    <span className="font-bold">- {formatCurrency(paybillTotal)}</span>
                  </div>
                </div>

                {/* Difference 1 */}
                <div className="border-t border-dashed border-slate-400 my-2 pt-1">
                  <div className="flex justify-between items-baseline font-bold text-[11px]">
                    <span className="text-slate-700">{`{Difference 1}`}</span>
                    <span className="font-black">{formatCurrency(difference1)}</span>
                  </div>
                </div>

                {/* Day's Expenses */}
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[10px]">Day's Expenses(petty cash inclusive)</span>
                    <span className="font-bold">- {formatCurrency(expenseTotal)}</span>
                  </div>
                </div>

                {/* Difference 2 */}
                <div className="border-t border-dashed border-slate-400 my-2 pt-1">
                  <div className="flex justify-between items-baseline font-bold text-[11px]">
                    <span className="text-slate-700">{`{Difference 2}`}</span>
                    <span className="font-black">{formatCurrency(difference2)}</span>
                  </div>
                </div>

                {/* Amount to be submitted cash */}
                <div className="border-t-2 border-b-2 border-slate-900 py-2 my-2 text-center bg-slate-50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-800">
                    Amount to be submitted cash =
                  </p>
                  <p className="font-black text-sm sm:text-base mt-0.5 text-slate-900">
                    {formatCurrency(amountToBeSubmittedCash)}
                  </p>
                </div>

                {/* Footer details */}
                {cashierName && (
                  <div className="text-center text-[9px] text-slate-600 mt-2">
                    Attendant: {cashierName}
                  </div>
                )}

                <div className="text-center text-[8px] text-slate-400 mt-2 tracking-widest uppercase">
                  -- NJUGUSH POS CUT --
                </div>
              </div>
            </div>

            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              className="mt-3 gap-1.5 text-xs border-dashed w-full max-w-[280px]"
            >
              <Printer className="w-3.5 h-3.5" /> Print Slip on POS Printer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
