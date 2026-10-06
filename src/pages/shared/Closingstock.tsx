import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { closingStockApi, branchesApi, branchClosingsApi } from '@/api'
import { useAuthStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, Clock, Printer, Store,
  Banknote, PackageCheck, AlertCircle, FileText, Check, AlertTriangle, ShieldCheck
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = (d: Date) =>
  d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

const fmtShort = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

const toISODate = (d: Date) => d.toISOString().split('T')[0]

const buildWeek = (anchorDate: Date): Date[] => {
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(anchorDate)
    d.setDate(anchorDate.getDate() - i)
    days.push(d)
  }
  return days
}

export default function ClosingStock() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'OVERALL_MANAGER'

  // Tab switching
  const [activeTab, setActiveTab] = useState<'reconciliation' | 'snapshots'>('reconciliation')

  // Selected branch
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    user?.role === 'BRANCH_MANAGER' ? (user.branchId || '') : ''
  )

  // Reconciliation form states
  const [openingCashInput, setOpeningCashInput] = useState<string>('')
  const [closingCashInput, setClosingCashInput] = useState<string>('')
  const [closingNotesInput, setClosingNotesInput] = useState<string>('')

  // Snapshots states
  const [anchor, setAnchor] = useState<Date>(() => {
    const t = new Date(); t.setHours(0, 0, 0, 0); return t
  })
  const [jumpDate, setJumpDate] = useState('')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const today = useMemo(() => { const t = new Date(); t.setHours(0,0,0,0); return t }, [])
  const week  = useMemo(() => buildWeek(anchor), [anchor])
  const startDate = toISODate(week[6])
  const endDate   = toISODate(week[0])

  // ── Branches Query ────────────────────────────────────────────────────────
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn:  () => branchesApi.getAll().then(r => r.data),
    enabled:  isAdmin,
  })

  // ── Today Summary Query (Cash drawer reconciliation) ──────────────────────
  const { data: todaySummary, isLoading: loadingTodaySummary } = useQuery({
    queryKey: ['branch-closing-today', selectedBranchId],
    queryFn:  () => branchClosingsApi.getTodaySummary(selectedBranchId).then(r => r.data),
    enabled:  !!selectedBranchId,
  })

  // ── History Query (Past closings) ─────────────────────────────────────────
  const { data: closingHistory = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['branch-closing-history', selectedBranchId],
    queryFn:  () => branchClosingsApi.getHistory({ branchId: selectedBranchId }).then(r => r.data),
    enabled:  !!selectedBranchId,
  })

  // ── Submit Closing Mutation ───────────────────────────────────────────────
  const submitClosingMutation = useMutation({
    mutationFn: (data: { branchId: string; openingCash: number; closingCash: number; notes?: string }) =>
      branchClosingsApi.submitClosing(data),
    onSuccess: () => {
      toast.success('Branch daily closing submitted successfully!')
      setClosingCashInput('')
      setClosingNotesInput('')
      queryClient.invalidateQueries({ queryKey: ['branch-closing-today', selectedBranchId] })
      queryClient.invalidateQueries({ queryKey: ['branch-closing-history', selectedBranchId] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit branch closing')
    },
  })

  // ── Snapshots Query ───────────────────────────────────────────────────────
  const { data: snapshotDates = [] } = useQuery({
    queryKey: ['closing-stock-dates', selectedBranchId, startDate, endDate],
    queryFn:  () => closingStockApi.getDates(selectedBranchId, startDate, endDate).then(r => r.data),
    enabled:  !!selectedBranchId && activeTab === 'snapshots',
  })

  const snapshotMap = useMemo(() => {
    const m = new Map<string, any>()
    snapshotDates.forEach((s: any) => { m.set(toISODate(new Date(s.date)), s) })
    return m
  }, [snapshotDates])

  const { data: snapshot } = useQuery({
    queryKey: ['closing-stock-snapshot', selectedBranchId, selectedDate],
    queryFn:  () => closingStockApi.getSnapshot(selectedBranchId, selectedDate!).then(r => r.data),
    enabled:  !!selectedBranchId && !!selectedDate && activeTab === 'snapshots',
  })

  // Navigation for snapshots
  const goBack = () => {
    const d = new Date(anchor); d.setDate(d.getDate() - 7); setAnchor(d)
  }
  const goForward = () => {
    const d = new Date(anchor); d.setDate(d.getDate() + 7)
    if (d <= today) setAnchor(d)
  }
  const handleJump = () => {
    if (!jumpDate) return
    const d = new Date(jumpDate); d.setHours(0,0,0,0)
    if (d > today) { toast.error('Cannot navigate to a future date'); return }
    setAnchor(d)
    setJumpDate('')
  }
  const canGoForward = anchor < today

  // Print handler for snapshots
  const handlePrint = () => {
    if (!snapshot) return
    const win = window.open('', '_blank', 'width=800,height=600')
    if (!win) return

    const categorySections = snapshot.categories.map((cat: any) => {
      const isLpg = cat.name.toUpperCase().includes('LPG')
      const rows = cat.items.map((item: any) => isLpg
        ? `<tr><td>${item.productName}</td><td>${item.productCode}</td><td class="num blue">${item.fullCylinders ?? 0}</td><td class="num amber">${item.emptyCylinders ?? 0}</td></tr>`
        : `<tr><td>${item.productName}</td><td>${item.productCode}</td><td class="num" colspan="2">${item.quantity}</td></tr>`
      ).join('')

      const totalFull  = isLpg ? cat.items.reduce((s: number, i: any) => s + (i.fullCylinders || 0), 0) : null
      const totalEmpty = isLpg ? cat.items.reduce((s: number, i: any) => s + (i.emptyCylinders || 0), 0) : null
      const totalQty   = !isLpg ? cat.items.reduce((s: number, i: any) => s + i.quantity, 0) : null

      return `
        <div class="category">
          <h3>${cat.name}</h3>
          <table>
            <thead><tr><th>Product</th><th>Code</th>${isLpg ? '<th class="blue">Full (Refills)</th><th class="amber">Empty (Shells)</th>' : '<th colspan="2">Quantity</th>'}</tr></thead>
            <tbody>${rows}</tbody>
            <tfoot><tr class="total"><td colspan="2">TOTAL</td>${isLpg ? `<td class="num blue">${totalFull}</td><td class="num amber">${totalEmpty}</td>` : `<td class="num" colspan="2">${totalQty}</td>`}</tr></tfoot>
          </table>
        </div>`
    }).join('')

    win.document.write(`<!DOCTYPE html><html><head>
      <title>Midnight Closing Stock — ${fmtShort(new Date(snapshot.date))}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:20px;max-width:900px;margin:auto;font-size:12px}
        h1{text-align:center;margin:0;font-size:18px;text-transform:uppercase}
        h2{text-align:center;color:#444;font-size:13px;margin:4px 0 0}
        .meta{text-align:center;color:#666;font-size:11px;margin:8px 0 24px}
        .category{margin-bottom:28px}
        .category h3{font-size:14px;font-weight:bold;color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:4px;margin-bottom:8px;text-transform:uppercase}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th{background:#0f172a;color:white;padding:6px 8px;text-align:left}
        td{padding:5px 8px;border-bottom:1px solid #eee}
        tr:nth-child(even){background:#f9fafb}
        .num{text-align:center;font-weight:bold}
        .blue{color:#1d4ed8}
        .amber{color:#d97706}
        tfoot .total td{border-top:2px solid #0f172a;font-weight:bold;background:#f1f5f9;padding:6px 8px}
        @media print{@page{margin:1cm;size:portrait}body{padding:0}}
      </style>
    </head><body>
      <h1>NJUGUSH ENTERPRISES</h1>
      <h2>Midnight Closing Stock Report — ${snapshot.branchName}</h2>
      <div class="meta">Business Date: <strong>${fmt(new Date(snapshot.date))}</strong> &nbsp;|&nbsp; Captured at Midnight: ${new Date(snapshot.recordedAt).toLocaleString('en-GB')} &nbsp;|&nbsp; ${snapshot.totalProducts} products</div>
      ${categorySections}
      <div style="text-align:center;margin-top:24px;font-size:10px;color:#999;border-top:1px dashed #ccc;padding-top:12px">
        Printed ${new Date().toLocaleString('en-GB')} &nbsp;·&nbsp; Automated Snapshot
      </div>
      <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script>
    </body></html>`)
    win.document.close()
  }

  // Branch not selected guard for admin
  if (isAdmin && !selectedBranchId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Closing & Reconciliation</h1>
          <p className="text-muted-foreground">Select a branch to view cash drawer reconciliations or midnight stock records</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches?.map((b: any) => (
            <Card key={b.id} className="cursor-pointer hover:border-primary transition-colors bg-card"
              onClick={() => setSelectedBranchId(b.id)}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Store className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold">{b.name}</p>
                  <p className="text-xs text-muted-foreground">{b.code}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const activeBranch = branches?.find((b: any) => b.id === selectedBranchId)

  // Reconciliation calculations
  const calc = todaySummary?.calculated || {
    openingCash: 0,
    cashSales: 0,
    mpesaSales: 0,
    invoiceSales: 0,
    totalExpenses: 0,
    totalRefunds: 0,
    expectedCash: 0,
  }

  const isClosedToday = todaySummary?.existingClosing?.status === 'CLOSED'
  const activeOpeningCash = openingCashInput !== '' ? Number(openingCashInput) : calc.openingCash
  const activeExpectedCash = Math.round((activeOpeningCash + calc.cashSales - calc.totalExpenses - calc.totalRefunds) * 100) / 100
  const activeClosingCash = closingCashInput !== '' ? Number(closingCashInput) : null
  const activeVariance = activeClosingCash !== null ? Math.round((activeClosingCash - activeExpectedCash) * 100) / 100 : 0

  const handleClosingSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (activeClosingCash === null || isNaN(activeClosingCash)) {
      toast.error('Please enter the actual physical cash counted in the drawer')
      return
    }

    if (activeVariance !== 0 && !closingNotesInput.trim()) {
      toast.error(`A note explaining the cash variance of ${formatCurrency(activeVariance)} is required`)
      return
    }

    submitClosingMutation.mutate({
      branchId: selectedBranchId,
      openingCash: activeOpeningCash,
      closingCash: activeClosingCash,
      notes: closingNotesInput.trim() || undefined,
    })
  }

  return (
    <div className="space-y-6 pb-12">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button onClick={() => setSelectedBranchId('')} className="p-1 hover:bg-muted rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-2xl font-bold">Branch Closing & Reconciliation</h1>
          </div>
          {activeBranch && (
            <p className="text-muted-foreground ml-7">
              {activeBranch.name} &bull; Operational Cash Drawer & Stock Snapshots
            </p>
          )}
        </div>

        {/* Branch switcher for admin */}
        {isAdmin && (
          <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
            <SelectTrigger className="w-52">
              <Store className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {branches?.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 border-b pb-1 overflow-x-auto scrollbar-none">
        <Button
          variant={activeTab === 'reconciliation' ? 'default' : 'ghost'}
          className="gap-2 shrink-0 text-xs sm:text-sm"
          onClick={() => setActiveTab('reconciliation')}
        >
          <Banknote className="w-4 h-4" />
          Cash Drawer Reconciliation
        </Button>
        <Button
          variant={activeTab === 'snapshots' ? 'default' : 'ghost'}
          className="gap-2 shrink-0 text-xs sm:text-sm"
          onClick={() => setActiveTab('snapshots')}
        >
          <PackageCheck className="w-4 h-4" />
          Midnight Inventory Snapshots
        </Button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: CASH DRAWER RECONCILIATION & CLOSING                            */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6">

          {/* Today's Reconciliation Card */}
          <Card className="border-primary/20 shadow-md">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-emerald-600" />
                  Today's Cash Drawer Reconciliation — {fmt(today)}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Reconciles physical cash in drawer against sales cash receipts, approved expenses, and refunds.
                </p>
              </div>
              {isClosedToday ? (
                <Badge className="bg-emerald-600 text-white gap-1 px-3 py-1 text-xs self-start sm:self-center shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" /> CLOSED FOR TODAY
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-300 dark:border-emerald-500/40 gap-1 px-3 py-1 text-xs self-start sm:self-center shrink-0">
                  <Clock className="w-3.5 h-3.5" /> OPEN / IN PROGRESS
                </Badge>
              )}
            </CardHeader>

            <CardContent className="space-y-6">
              {loadingTodaySummary ? (
                <p className="text-center py-8 text-muted-foreground">Loading today's cash records...</p>
              ) : (
                <>
                  {/* Key Financial Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
                    <div className="p-3 rounded-lg border bg-muted/20">
                      <p className="text-xs text-muted-foreground font-semibold uppercase">Opening Cash</p>
                      <p className="text-base sm:text-lg font-bold mt-1">{formatCurrency(activeOpeningCash)}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Start of day float</p>
                    </div>
                    <div className="p-3 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
                      <p className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold uppercase">Cash Received</p>
                      <p className="text-base sm:text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-1">+{formatCurrency(calc.cashSales)}</p>
                      <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400 mt-0.5">Sales & invoices</p>
                    </div>
                    <div className="p-3 rounded-lg border bg-amber-50/50 dark:bg-emerald-950/20 border-amber-200 dark:border-emerald-800">
                      <p className="text-xs text-amber-800 dark:text-emerald-300 font-semibold uppercase">Expenses Paid</p>
                      <p className="text-base sm:text-lg font-bold text-amber-700 dark:text-emerald-300 mt-1">-{formatCurrency(calc.totalExpenses)}</p>
                      <p className="text-[11px] text-amber-700/80 dark:text-emerald-400 mt-0.5">Approved payouts</p>
                    </div>
                    <div className="p-3 rounded-lg border bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                      <p className="text-xs text-red-800 dark:text-red-300 font-semibold uppercase">Refunds Given</p>
                      <p className="text-base sm:text-lg font-bold text-red-700 dark:text-red-300 mt-1">-{formatCurrency(calc.totalRefunds)}</p>
                      <p className="text-[11px] text-red-700/80 dark:text-red-400 mt-0.5">Approved returns</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1 lg:col-span-1 p-3 rounded-lg border bg-slate-900 text-white">
                      <p className="text-xs text-slate-300 font-semibold uppercase">Expected in Drawer</p>
                      <p className="text-lg font-black text-white mt-1">{formatCurrency(activeExpectedCash)}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Float + Inflows - Outflows</p>
                    </div>
                  </div>

                  {/* Non-cash Reference Badges */}
                  <div className="flex flex-wrap gap-3 p-3 bg-muted/30 rounded-lg text-xs">
                    <span className="font-semibold text-muted-foreground">Other Revenue Handled Today (Excluded from Cash Drawer):</span>
                    <Badge variant="secondary" className="gap-1 font-mono">
                      M-Pesa Payments: <strong>{formatCurrency(calc.mpesaSales)}</strong> (Safaricom Till/Paybill)
                    </Badge>
                    <Badge variant="secondary" className="gap-1 font-mono">
                      Invoice Debt Issued: <strong>{formatCurrency(calc.invoiceSales)}</strong> (Credit Uncollected)
                    </Badge>
                  </div>

                  {/* If Already Closed Today */}
                  {isClosedToday ? (
                    <div className="p-5 border rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-600 space-y-3">
                      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-bold text-base">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        Cash Reconciliation Completed & Submitted
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm pt-2">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Expected Closing Cash</p>
                          <p className="font-bold text-foreground text-base mt-0.5">{formatCurrency(Number(todaySummary?.existingClosing?.expectedCash || 0))}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Actual Cash Counted</p>
                          <p className="font-bold text-foreground text-base mt-0.5">{formatCurrency(Number(todaySummary?.existingClosing?.closingCash || 0))}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Variance</p>
                          <p className={`font-bold text-base mt-0.5 ${
                            Number(todaySummary?.existingClosing?.variance || 0) === 0
                              ? 'text-emerald-600'
                              : Number(todaySummary?.existingClosing?.variance || 0) < 0
                              ? 'text-red-600'
                              : 'text-amber-600'
                          }`}>
                            {formatCurrency(Number(todaySummary?.existingClosing?.variance || 0))}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Closed By</p>
                          <p className="font-semibold text-foreground text-sm mt-0.5">
                            {todaySummary?.existingClosing?.submittedBy
                              ? `${todaySummary.existingClosing.submittedBy.firstName} ${todaySummary.existingClosing.submittedBy.lastName}`
                              : 'Manager'}
                          </p>
                        </div>
                      </div>
                      {todaySummary?.existingClosing?.notes && (
                        <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800/60">
                          <p className="text-xs text-muted-foreground font-semibold uppercase">Reconciliation Reason / Notes:</p>
                          <p className="text-sm font-medium mt-0.5 text-foreground">{todaySummary.existingClosing.notes}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Submission Form */
                    <form onSubmit={handleClosingSubmit} className="space-y-4 p-5 border rounded-xl bg-card">
                      <h3 className="font-bold text-sm uppercase tracking-wide text-foreground">
                        Count & Submit Closing Cash
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground">Opening Cash Float (KES)</label>
                          <Input
                            type="number"
                            min={0}
                            placeholder={String(calc.openingCash)}
                            value={openingCashInput}
                            onChange={(e) => setOpeningCashInput(e.target.value)}
                            className="h-10 text-sm font-mono"
                          />
                          <p className="text-[11px] text-muted-foreground">Float from previous closing or start of day</p>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground">
                            Actual Cash Counted in Drawer (KES) <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="number"
                            min={0}
                            required
                            placeholder="Count all physical notes and coins"
                            value={closingCashInput}
                            onChange={(e) => setClosingCashInput(e.target.value)}
                            className="h-10 text-base font-bold font-mono focus-visible:ring-emerald-500"
                          />
                          <p className="text-[11px] text-muted-foreground">Count all cash physically present in drawer</p>
                        </div>
                      </div>

                      {/* Live Variance Calculation Display */}
                      {activeClosingCash !== null && (
                        <div className={`p-3.5 sm:p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          activeVariance === 0
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-600 text-emerald-800 dark:text-emerald-200'
                            : activeVariance < 0
                            ? 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-600 text-red-800 dark:text-red-200'
                            : 'bg-amber-50 dark:bg-emerald-950/30 border-amber-300 dark:border-emerald-600 text-amber-800 dark:text-emerald-200'
                        }`}>
                          <div className="flex items-center gap-2.5">
                            {activeVariance === 0 ? (
                              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-5 h-5 shrink-0" />
                            )}
                            <div>
                              <p className="font-bold text-sm">
                                {activeVariance === 0
                                  ? 'Cash Drawer Perfectly Balanced'
                                  : activeVariance < 0
                                  ? `Cash Shortfall: ${formatCurrency(Math.abs(activeVariance))}`
                                  : `Cash Overage: +${formatCurrency(activeVariance)}`}
                              </p>
                              <p className="text-xs opacity-80 mt-0.5">
                                Expected: {formatCurrency(activeExpectedCash)} &bull; Counted: {formatCurrency(activeClosingCash)}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="font-mono text-sm font-black px-3 py-1 self-start sm:self-center shrink-0">
                            Variance: {formatCurrency(activeVariance)}
                          </Badge>
                        </div>
                      )}

                      {/* Variance Explanation Note (Mandatory if variance != 0) */}
                      {activeVariance !== 0 && (
                        <div className="space-y-1.5 p-3 rounded-lg border border-amber-300 dark:border-emerald-500/40 bg-amber-50/50 dark:bg-emerald-950/20">
                          <label className="text-xs font-bold text-amber-900 dark:text-emerald-300 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-emerald-400" />
                            Variance Explanation Reason <span className="text-red-500">*</span>
                          </label>
                          <Input
                            required
                            placeholder="e.g. KES 200 short — customer change error; or unrecorded minor expense..."
                            value={closingNotesInput}
                            onChange={(e) => setClosingNotesInput(e.target.value)}
                            className="h-10 text-sm bg-card"
                          />
                          <p className="text-[11px] text-amber-800 dark:text-emerald-400">
                            A specific audit reason is required for any cash discrepancy before drawer can be closed.
                          </p>
                        </div>
                      )}

                      {/* General Notes if variance == 0 */}
                      {activeVariance === 0 && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground">Closing Notes (Optional)</label>
                          <Input
                            placeholder="Optional notes for manager/admin reference..."
                            value={closingNotesInput}
                            onChange={(e) => setClosingNotesInput(e.target.value)}
                            className="h-10 text-sm"
                          />
                        </div>
                      )}

                      <div className="pt-2 flex justify-end">
                        <Button
                          type="submit"
                          disabled={submitClosingMutation.isPending || activeClosingCash === null}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-6 shadow-sm"
                        >
                          {submitClosingMutation.isPending ? 'Submitting Closing...' : 'Submit Daily Cash Closing'}
                        </Button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Past Closings History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Branch Cash Reconciliation History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <p className="text-center py-6 text-muted-foreground">Loading history...</p>
              ) : closingHistory.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground">No past closing records found for this branch.</p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Opening</TableHead>
                        <TableHead className="text-right">Cash Received</TableHead>
                        <TableHead className="text-right">M-Pesa</TableHead>
                        <TableHead className="text-right">Expenses</TableHead>
                        <TableHead className="text-right">Expected</TableHead>
                        <TableHead className="text-right">Actual Counted</TableHead>
                        <TableHead className="text-right">Variance</TableHead>
                        <TableHead>Closed By</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {closingHistory.map((rec: any) => {
                        const varianceNum = Number(rec.variance || 0)
                        return (
                          <TableRow key={rec.id}>
                            <TableCell className="font-semibold text-xs whitespace-nowrap">
                              {fmt(new Date(rec.date))}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                                {rec.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">{formatCurrency(Number(rec.openingCash))}</TableCell>
                            <TableCell className="text-right font-mono text-xs text-emerald-600 font-bold">+{formatCurrency(Number(rec.cashSales))}</TableCell>
                            <TableCell className="text-right font-mono text-xs text-muted-foreground">{formatCurrency(Number(rec.mpesaSales))}</TableCell>
                            <TableCell className="text-right font-mono text-xs text-amber-600">-{formatCurrency(Number(rec.totalExpenses))}</TableCell>
                            <TableCell className="text-right font-mono text-xs font-bold">{formatCurrency(Number(rec.expectedCash))}</TableCell>
                            <TableCell className="text-right font-mono text-xs font-bold">{formatCurrency(Number(rec.closingCash))}</TableCell>
                            <TableCell className={`text-right font-mono text-xs font-bold ${
                              varianceNum === 0 ? 'text-emerald-600' : varianceNum < 0 ? 'text-red-600' : 'text-amber-600'
                            }`}>
                              {formatCurrency(varianceNum)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {rec.submittedBy ? `${rec.submittedBy.firstName} ${rec.submittedBy.lastName}` : '—'}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-xs truncate" title={rec.notes}>
                              {rec.notes || '—'}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: MIDNIGHT INVENTORY SNAPSHOTS                                    */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'snapshots' && (
        <div className="space-y-6">

          {/* Navigation Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-card border rounded-xl shadow-sm">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goBack} className="gap-1">
                <ArrowLeft className="w-4 h-4" /> Earlier
              </Button>
              <Button variant="outline" size="sm" onClick={goForward} disabled={!canGoForward} className="gap-1">
                Later <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setAnchor(today)} disabled={anchor.getTime() === today.getTime()}>
                Today
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="date"
                max={toISODate(today)}
                value={jumpDate}
                onChange={(e) => setJumpDate(e.target.value)}
                className="w-36 sm:w-40 h-8 text-xs"
              />
              <Button variant="secondary" size="sm" onClick={handleJump} disabled={!jumpDate}>
                Go to Date
              </Button>
            </div>
          </div>

          {/* 7-day strip */}
          <div className="flex sm:grid sm:grid-cols-7 gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {week.map((day) => {
              const iso = toISODate(day)
              const snap = snapshotMap.get(iso)
              const isToday = iso === toISODate(today)
              const isSelected = iso === selectedDate

              return (
                <Card
                  key={iso}
                  className={`cursor-pointer transition-all border text-center min-w-[76px] flex-shrink-0 sm:min-w-0 flex-1 ${
                    isSelected ? 'ring-2 ring-primary border-primary bg-primary/5' : 'hover:border-primary/50 bg-card'
                  }`}
                  onClick={() => setSelectedDate(snap ? iso : null)}
                >
                  <CardContent className="p-2.5 sm:p-3">
                    <p className="text-[11px] text-muted-foreground font-semibold uppercase">{fmtShort(day)}</p>
                    <p className="text-base font-bold my-1">{day.getDate()}</p>
                    {snap ? (
                      <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0 gap-1 mx-auto">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Captured
                      </Badge>
                    ) : isToday ? (
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 dark:border-emerald-500/40 px-1.5 py-0">
                        Tonight
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground opacity-50 block">No record</span>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Selected Date Detail View */}
          {selectedDate && snapshot && (
            <Card className="border-primary/20 shadow-md">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3">
                <div>
                  <CardTitle className="text-lg">
                    Midnight Snapshot — {fmt(new Date(snapshot.date))}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Captured automatically at {new Date(snapshot.recordedAt).toLocaleTimeString()} &bull; {snapshot.totalProducts} total products tracked
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 self-start sm:self-center shrink-0">
                  <Printer className="w-4 h-4" /> Print Report
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {snapshot.categories.map((cat: any) => {
                  const isLpg = cat.name.toUpperCase().includes('LPG')
                  return (
                    <div key={cat.id} className="space-y-2">
                      <h4 className="font-bold text-sm text-foreground uppercase tracking-wide border-b pb-1">
                        {cat.name}
                      </h4>
                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product Name</TableHead>
                              <TableHead>Code</TableHead>
                              {isLpg ? (
                                <>
                                  <TableHead className="text-right">Full (Refills)</TableHead>
                                  <TableHead className="text-right">Empty (Shells)</TableHead>
                                </>
                              ) : (
                                <TableHead className="text-right">Quantity</TableHead>
                              )}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cat.items.map((item: any) => (
                              <TableRow key={item.productId}>
                                <TableCell className="font-medium text-xs">{item.productName}</TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">{item.productCode}</TableCell>
                                {isLpg ? (
                                  <>
                                    <TableCell className="text-right font-bold text-blue-600 font-mono text-xs">{item.fullCylinders ?? 0}</TableCell>
                                    <TableCell className="text-right font-bold text-amber-600 font-mono text-xs">{item.emptyCylinders ?? 0}</TableCell>
                                  </>
                                ) : (
                                  <TableCell className="text-right font-bold font-mono text-xs">{item.quantity}</TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {!selectedDate && (
            <div className="text-center py-12 border rounded-xl bg-card text-muted-foreground">
              <PackageCheck className="w-10 h-10 mx-auto opacity-30 mb-2" />
              <p className="text-sm">Click any captured date in the weekly bar above to inspect its midnight inventory snapshot.</p>
            </div>
          )}

        </div>
      )}

    </div>
  )
}
