import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, Flame, Package } from 'lucide-react'

export interface DailySalesSummary {
  refill: { quantity: number; revenue: number }
  completeSet: { quantity: number; revenue: number }
  emptyShell: { quantity: number; revenue: number }
  general: { quantity: number; revenue: number }
  totalRevenue: number
  totalDiscount: number
  netRevenue: number
}

interface DailySalesSummaryTableProps {
  summary?: DailySalesSummary
  isLoading?: boolean
}

export const DailySalesSummaryTable: React.FC<DailySalesSummaryTableProps> = ({
  summary,
  isLoading = false,
}) => {
  const refill = summary?.refill || { quantity: 0, revenue: 0 }
  const completeSet = summary?.completeSet || { quantity: 0, revenue: 0 }
  const emptyShell = summary?.emptyShell || { quantity: 0, revenue: 0 }
  const general = summary?.general || { quantity: 0, revenue: 0 }
  const totalRevenue = summary?.totalRevenue || 0
  const totalDiscount = summary?.totalDiscount || 0
  const netRevenue = summary?.netRevenue || 0

  return (
    <Card className="col-span-1 sm:col-span-2 xl:col-span-2 shadow-sm border overflow-hidden">
      <CardHeader className="bg-muted/40 py-3 px-4 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold tracking-wide flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            TODAY'S SALES SUMMARY
          </CardTitle>
          <span className="text-[11px] font-medium text-muted-foreground uppercase">
            Live Daily
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-muted-foreground animate-pulse">
            Loading sales summary...
          </div>
        ) : (
          <div className="divide-y divide-border text-xs sm:text-sm">
            {/* Header row */}
            <div className="grid grid-cols-12 px-4 py-2 bg-muted/20 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">
              <span className="col-span-6">Product Category</span>
              <span className="col-span-3 text-center">Quantity</span>
              <span className="col-span-3 text-right">Revenue</span>
            </div>

            {/* Refill */}
            <div className="grid grid-cols-12 px-4 py-2.5 items-center hover:bg-muted/10 transition-colors">
              <span className="col-span-6 flex items-center gap-1.5 font-medium">
                <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                Refill (LPG)
              </span>
              <span className="col-span-3 text-center font-semibold text-foreground">
                {refill.quantity} units
              </span>
              <span className="col-span-3 text-right font-medium">
                {formatCurrency(refill.revenue)}
              </span>
            </div>

            {/* Complete Set */}
            <div className="grid grid-cols-12 px-4 py-2.5 items-center hover:bg-muted/10 transition-colors">
              <span className="col-span-6 flex items-center gap-1.5 font-medium">
                <Flame className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                Complete Set
              </span>
              <span className="col-span-3 text-center font-semibold text-foreground">
                {completeSet.quantity} units
              </span>
              <span className="col-span-3 text-right font-medium">
                {formatCurrency(completeSet.revenue)}
              </span>
            </div>

            {/* Empty Shell */}
            <div className="grid grid-cols-12 px-4 py-2.5 items-center hover:bg-muted/10 transition-colors">
              <span className="col-span-6 flex items-center gap-1.5 font-medium">
                <Flame className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                Empty Shell
              </span>
              <span className="col-span-3 text-center font-semibold text-foreground">
                {emptyShell.quantity} units
              </span>
              <span className="col-span-3 text-right font-medium">
                {formatCurrency(emptyShell.revenue)}
              </span>
            </div>

            {/* General Products */}
            <div className="grid grid-cols-12 px-4 py-2.5 items-center hover:bg-muted/10 transition-colors">
              <span className="col-span-6 flex items-center gap-1.5 font-medium">
                <Package className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                General Products
              </span>
              <span className="col-span-3 text-center font-semibold text-foreground">
                {general.quantity} units
              </span>
              <span className="col-span-3 text-right font-medium">
                {formatCurrency(general.revenue)}
              </span>
            </div>

            {/* Summary Totals */}
            <div className="bg-muted/30 px-4 py-2.5 space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-semibold">TOTAL REVENUE (Gross):</span>
                <span className="font-semibold">{formatCurrency(totalRevenue)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">Less: Discounts:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  - {formatCurrency(totalDiscount)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm pt-1 border-t border-border font-bold">
                <span className="text-foreground uppercase tracking-wide">NET REVENUE:</span>
                <span className="text-emerald-700 dark:text-emerald-400 text-base font-black">
                  {formatCurrency(netRevenue)}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default DailySalesSummaryTable
