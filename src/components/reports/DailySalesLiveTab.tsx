import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reportsApi, branchesApi } from '@/api'
import { useAuthStore } from '@/store'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { printDailyReport } from '@/lib/printDailyReport'
import { Printer, Archive, Calendar, Store, ArrowDownRight, ArrowUpRight, DollarSign, ShoppingBag, Receipt } from 'lucide-react'
import { toast } from 'sonner'

export const DailySalesLiveTab: React.FC = () => {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const isElevated = user?.role === 'SUPER_ADMIN' || user?.role === 'OVERALL_MANAGER'

  const todayStr = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState<string>(todayStr)
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    isElevated ? 'all' : (user?.branchId || '')
  )

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => (await branchesApi.getAll()).data,
    enabled: isElevated,
  })

  const effectiveBranchId = isElevated ? selectedBranchId : user?.branchId

  const { data: report, isLoading, refetch } = useQuery({
    queryKey: ['daily-report-live', effectiveBranchId, date],
    queryFn: async () => {
      const res = await reportsApi.getLiveDailySales(effectiveBranchId, date)
      return res.data
    },
  })

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const branchToArchive = effectiveBranchId === 'all' ? (branches?.[0]?.id || '') : effectiveBranchId
      if (!branchToArchive || branchToArchive === 'all') {
        throw new Error('Please select a specific branch to archive.')
      }
      return (await reportsApi.archiveDailyReport(branchToArchive, date)).data
    },
    onSuccess: () => {
      toast.success('Daily report archived successfully!')
      queryClient.invalidateQueries({ queryKey: ['archived-daily-reports'] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to archive report')
    },
  })

  const branchName =
    effectiveBranchId === 'all'
      ? 'All Branches'
      : (branches?.find((b: any) => b.id === effectiveBranchId)?.name || user?.branchId || 'Branch')

  const handlePrint = () => {
    if (!report) return
    printDailyReport({
      date,
      branchName,
      retailSales: report.retailSales,
      wholesaleSales: report.wholesaleSales,
      expenses: report.expenses,
      summary: report.summary,
    })
  }

  const summary = report?.summary || {
    retailTotal: 0,
    wholesaleTotal: 0,
    totalDiscount: 0,
    grandTotal: 0,
    expenseTotal: 0,
    netTotal: 0,
  }

  return (
    <div className="space-y-6">
      {/* Filters & Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Branch filter */}
          {isElevated && (
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger className="w-48 border">
                <Store className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Select Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches?.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Date filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-auto"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={isLoading || !report}
            className="gap-2"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </Button>

          <Button
            onClick={() => archiveMutation.mutate()}
            disabled={archiveMutation.isPending || isLoading || effectiveBranchId === 'all'}
            className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Archive className="w-4 h-4" />
            {archiveMutation.isPending ? 'Archiving…' : 'Archive Day Report'}
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase">Retail Sales</p>
          <p className="text-xl font-black mt-1 text-blue-900 dark:text-blue-100">{formatCurrency(summary.retailTotal)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{report?.retailSales?.itemsCount || 0} items sold</p>
        </Card>

        <Card className="p-4 bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
          <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase">Wholesale Sales</p>
          <p className="text-xl font-black mt-1 text-purple-900 dark:text-purple-100">{formatCurrency(summary.wholesaleTotal)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{report?.wholesaleSales?.itemsCount || 0} items sold</p>
        </Card>

        <Card className="p-4 bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800">
          <p className="text-xs font-semibold text-rose-700 dark:text-rose-300 uppercase">Expenses Today</p>
          <p className="text-xl font-black mt-1 text-rose-900 dark:text-rose-100">- {formatCurrency(summary.expenseTotal)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{report?.expenses?.items?.length || 0} approved entries</p>
        </Card>

        <Card className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase">Net Daily Balance</p>
          <p className="text-xl font-black mt-1 text-emerald-800 dark:text-emerald-200">{formatCurrency(summary.netTotal)}</p>
          {summary.totalDiscount > 0 && (
            <p className="text-[11px] text-emerald-600 mt-0.5">- {formatCurrency(summary.totalDiscount)} discounts</p>
          )}
        </Card>
      </div>

      {/* Retail Sales Section */}
      <Card>
        <CardHeader className="py-3 px-4 border-b bg-muted/20">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-blue-600" />
              1. Retail Sales Breakdown
            </CardTitle>
            <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">
              Total: {formatCurrency(summary.retailTotal)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 text-xs">
                <TableHead>PRODUCT</TableHead>
                <TableHead className="text-right">MARKED</TableHead>
                <TableHead className="text-right">SELLING</TableHead>
                <TableHead className="text-center">QTY</TableHead>
                <TableHead className="text-right">DISCOUNT</TableHead>
                <TableHead className="text-right font-bold">SUBTOTAL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Loading retail transactions…</TableCell></TableRow>
              ) : report?.retailSales?.items?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No retail sales recorded for this date.</TableCell></TableRow>
              ) : report?.retailSales?.items?.map((item: any) => (
                <TableRow key={item.id} className="text-xs hover:bg-muted/10">
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatCurrency(item.markedPrice)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(item.sellingPrice)}</TableCell>
                  <TableCell className="text-center font-bold">{item.quantity}</TableCell>
                  <TableCell className="text-right text-emerald-600">
                    {item.discount > 0 ? `- ${formatCurrency(item.discount)}` : '-'}
                  </TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(item.subtotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Wholesale Sales Section */}
      <Card>
        <CardHeader className="py-3 px-4 border-b bg-muted/20">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Receipt className="w-4 h-4 text-purple-600" />
              2. Wholesale Sales Breakdown
            </CardTitle>
            <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50">
              Total: {formatCurrency(summary.wholesaleTotal)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 text-xs">
                <TableHead>PRODUCT</TableHead>
                <TableHead>CLIENT</TableHead>
                <TableHead className="text-right">MARKED</TableHead>
                <TableHead className="text-right">SELLING</TableHead>
                <TableHead className="text-center">QTY</TableHead>
                <TableHead className="text-right">DISCOUNT</TableHead>
                <TableHead className="text-right font-bold">SUBTOTAL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Loading wholesale transactions…</TableCell></TableRow>
              ) : report?.wholesaleSales?.items?.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No wholesale sales recorded for this date.</TableCell></TableRow>
              ) : report?.wholesaleSales?.items?.map((item: any) => (
                <TableRow key={item.id} className="text-xs hover:bg-muted/10">
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell className="text-muted-foreground italic">{item.customerName || 'Walk-in'}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatCurrency(item.markedPrice)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(item.sellingPrice)}</TableCell>
                  <TableCell className="text-center font-bold">{item.quantity}</TableCell>
                  <TableCell className="text-right text-emerald-600">
                    {item.discount > 0 ? `- ${formatCurrency(item.discount)}` : '-'}
                  </TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(item.subtotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Expenses Breakdown */}
      <Card>
        <CardHeader className="py-3 px-4 border-b bg-muted/20">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-rose-600" />
              3. Expenses Incurred Today
            </CardTitle>
            <Badge variant="outline" className="text-rose-700 border-rose-300 bg-rose-50">
              Total: {formatCurrency(summary.expenseTotal)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 text-xs">
                <TableHead>CATEGORY</TableHead>
                <TableHead>DESCRIPTION</TableHead>
                <TableHead className="text-right font-bold">AMOUNT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">Loading expenses…</TableCell></TableRow>
              ) : report?.expenses?.items?.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">No expenses recorded for this date.</TableCell></TableRow>
              ) : report?.expenses?.items?.map((exp: any) => (
                <TableRow key={exp.id} className="text-xs hover:bg-muted/10">
                  <TableCell className="font-medium">{exp.category}</TableCell>
                  <TableCell className="text-muted-foreground">{exp.description || '-'}</TableCell>
                  <TableCell className="text-right font-bold text-rose-600">{formatCurrency(exp.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default DailySalesLiveTab
