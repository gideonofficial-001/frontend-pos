import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi, branchesApi } from '@/api'
import { useAuthStore } from '@/store'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { printDailyReport } from '@/lib/printDailyReport'
import { Printer, Store, Calendar, FileText, ChevronDown, ChevronUp } from 'lucide-react'

export const ArchivedDailyReportsTab: React.FC = () => {
  const { user } = useAuthStore()
  const isElevated = user?.role === 'SUPER_ADMIN' || user?.role === 'OVERALL_MANAGER'

  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    isElevated ? 'all' : (user?.branchId || '')
  )
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => (await branchesApi.getAll()).data,
    enabled: isElevated,
  })

  const effectiveBranchId = isElevated ? selectedBranchId : user?.branchId

  const { data: archivedReports, isLoading } = useQuery({
    queryKey: ['archived-daily-reports', effectiveBranchId, startDate, endDate],
    queryFn: async () => {
      const res = await reportsApi.getArchivedDailyReports(
        effectiveBranchId,
        startDate || undefined,
        endDate || undefined
      )
      return res.data
    },
  })

  const handlePrintArchived = (report: any) => {
    const retailItems = report.salesItems?.filter((i: any) => i.isRetailSale) || []
    const wholesaleItems = report.salesItems?.filter((i: any) => !i.isRetailSale) || []
    const expenses = report.expenses || []

    const formattedDate = report.reportDate ? new Date(report.reportDate).toISOString().split('T')[0] : 'N/A'

    printDailyReport({
      date: formattedDate,
      branchName: report.branch?.name || 'Branch',
      retailSales: {
        items: retailItems,
        total: Number(report.retailSalesTotal || 0),
        discountTotal: Number(report.retailDiscountTotal || 0),
        itemsCount: report.retailItemsCount || 0,
      },
      wholesaleSales: {
        items: wholesaleItems,
        total: Number(report.wholesaleSalesTotal || 0),
        discountTotal: 0,
        itemsCount: report.wholesaleItemsCount || 0,
      },
      expenses: {
        items: expenses,
        total: Number(report.expenseTotal || 0),
      },
      summary: {
        retailTotal: Number(report.retailSalesTotal || 0),
        wholesaleTotal: Number(report.wholesaleSalesTotal || 0),
        totalDiscount: Number(report.retailDiscountTotal || 0),
        grandTotal: Number(report.grandTotal || 0),
        expenseTotal: Number(report.expenseTotal || 0),
        netTotal: Number(report.netTotal || 0),
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 bg-card p-4 rounded-xl border shadow-sm">
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

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Input
            type="date"
            placeholder="From"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-auto"
          />
          <span className="text-muted-foreground text-xs">to</span>
          <Input
            type="date"
            placeholder="To"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-auto"
          />
        </div>
      </div>

      {/* Reports Table */}
      <Card>
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-600" />
            Archived Daily Statements
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 text-xs">
                <TableHead>DATE</TableHead>
                <TableHead>BRANCH</TableHead>
                <TableHead className="text-right">RETAIL TOTAL</TableHead>
                <TableHead className="text-right">WHOLESALE TOTAL</TableHead>
                <TableHead className="text-right">EXPENSES</TableHead>
                <TableHead className="text-right font-bold">NET TOTAL</TableHead>
                <TableHead className="text-right">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading archived reports…</TableCell></TableRow>
              ) : archivedReports?.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No archived daily reports found.</TableCell></TableRow>
              ) : archivedReports?.map((r: any) => {
                const isExpanded = expandedId === r.id
                const dateFormatted = r.reportDate ? new Date(r.reportDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'

                return (
                  <React.Fragment key={r.id}>
                    <TableRow className="text-xs hover:bg-muted/10 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : r.id)}>
                      <TableCell className="font-bold whitespace-nowrap">{dateFormatted}</TableCell>
                      <TableCell>{r.branch?.name || 'Branch'}</TableCell>
                      <TableCell className="text-right font-medium text-blue-600">{formatCurrency(r.retailSalesTotal)}</TableCell>
                      <TableCell className="text-right font-medium text-purple-600">{formatCurrency(r.wholesaleSalesTotal)}</TableCell>
                      <TableCell className="text-right font-medium text-rose-600">- {formatCurrency(r.expenseTotal)}</TableCell>
                      <TableCell className="text-right font-black text-emerald-700">{formatCurrency(r.netTotal)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => handlePrintArchived(r)}>
                            <Printer className="w-3.5 h-3.5" />
                            Print
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setExpandedId(isExpanded ? null : r.id)}>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow className="bg-muted/20">
                        <TableCell colSpan={7} className="p-4">
                          <div className="space-y-3">
                            <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Detailed Items Snapshot</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Retail Snapshot */}
                              <div className="bg-card p-3 rounded-lg border">
                                <p className="font-semibold text-xs mb-2 text-blue-700">Retail Sales ({r.retailItemsCount} items)</p>
                                <div className="space-y-1 text-xs">
                                  {r.salesItems?.filter((i: any) => i.isRetailSale).map((it: any) => (
                                    <div key={it.id} className="flex justify-between border-b pb-1">
                                      <span>{it.productNameSnapshot} &times; {it.quantity}</span>
                                      <span className="font-medium">{formatCurrency(it.subtotal)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Wholesale Snapshot */}
                              <div className="bg-card p-3 rounded-lg border">
                                <p className="font-semibold text-xs mb-2 text-purple-700">Wholesale Sales ({r.wholesaleItemsCount} items)</p>
                                <div className="space-y-1 text-xs">
                                  {r.salesItems?.filter((i: any) => !i.isRetailSale).map((it: any) => (
                                    <div key={it.id} className="flex justify-between border-b pb-1">
                                      <span>{it.productNameSnapshot} ({it.customerName || 'Client'}) &times; {it.quantity}</span>
                                      <span className="font-medium">{formatCurrency(it.subtotal)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default ArchivedDailyReportsTab
