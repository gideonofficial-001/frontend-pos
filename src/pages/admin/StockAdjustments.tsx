import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { stockAdjustmentsApi, branchesApi } from '@/api'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  SlidersHorizontal,
  Search,
  ChevronLeft,
  ChevronRight,
  Building2,
  Calendar,
  Flame,
  Package,
  User,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Clock,
  Eye,
  ArrowUpRight,
  PackageSearch
} from 'lucide-react'
import { StockAdjustmentLog } from '@/types'

const ITEMS_PER_PAGE = 15

export default function StockAdjustments() {
  const [search, setSearch] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [selectedType, setSelectedType] = useState<'ALL' | 'LPG' | 'GENERAL'>('ALL')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRecord, setSelectedRecord] = useState<StockAdjustmentLog | null>(null)

  // Fetch branches for filter dropdown
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await branchesApi.getAll()
      return res.data || []
    },
  })

  // Fetch adjustments
  const { data: adjustments = [], isLoading, refetch } = useQuery<StockAdjustmentLog[]>({
    queryKey: ['stock-adjustments', selectedBranch, startDate, endDate],
    queryFn: async () => {
      const params: any = {}
      if (selectedBranch && selectedBranch !== 'all') {
        params.branchId = selectedBranch
      }
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate

      const res = await stockAdjustmentsApi.getAll(params)
      return res.data || []
    },
  })

  // Client-side filtering by search query & LPG/General
  const filtered = useMemo(() => {
    return adjustments.filter((item) => {
      // Type filter
      if (selectedType === 'LPG' && !item.isLpg) return false
      if (selectedType === 'GENERAL' && item.isLpg) return false

      // Search filter
      if (search.trim()) {
        const query = search.toLowerCase().trim()
        const matchProduct = item.productName?.toLowerCase().includes(query)
        const matchBranch = item.branchName?.toLowerCase().includes(query)
        const matchReason = item.reason?.toLowerCase().includes(query)
        const matchSummary = item.changeSummary?.toLowerCase().includes(query)
        const matchUser = item.performedBy
          ? `${item.performedBy.firstName} ${item.performedBy.lastName}`.toLowerCase().includes(query)
          : false

        if (!matchProduct && !matchBranch && !matchReason && !matchSummary && !matchUser) {
          return false
        }
      }

      return true
    })
  }, [adjustments, search, selectedType])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, selectedBranch, selectedType, startDate, endDate])

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filtered.slice(start, start + ITEMS_PER_PAGE)
  }, [filtered, currentPage])

  // Stats calculation
  const stats = useMemo(() => {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    let todayCount = 0
    let lpgCount = 0

    adjustments.forEach((item) => {
      if (item.createdAt && item.createdAt.toString().startsWith(todayStr)) {
        todayCount++
      }
      if (item.isLpg) {
        lpgCount++
      }
    })

    return {
      total: adjustments.length,
      today: todayCount,
      lpg: lpgCount,
      general: adjustments.length - lpgCount,
    }
  }, [adjustments])

  // Quick Date Helpers
  const setQuickRange = (range: 'today' | '7days' | '30days' | 'clear') => {
    const today = new Date()
    if (range === 'clear') {
      setStartDate('')
      setEndDate('')
      return
    }

    const endStr = today.toISOString().split('T')[0]
    setEndDate(endStr)

    if (range === 'today') {
      setStartDate(endStr)
    } else if (range === '7days') {
      const past = new Date()
      past.setDate(past.getDate() - 7)
      setStartDate(past.toISOString().split('T')[0])
    } else if (range === '30days') {
      const past = new Date()
      past.setDate(past.getDate() - 30)
      setStartDate(past.toISOString().split('T')[0])
    }
  }

  // Format date with day of the week, e.g. "Monday 12:30 PM, Oct 5, 2026"
  const formatAdjustmentDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    const weekday = d.toLocaleDateString('en-KE', { weekday: 'long' })
    const time = d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
    const dateFormatted = d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })
    return `${weekday} ${time}, ${dateFormatted}`
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Stock Adjustments Log</h1>
              <p className="text-sm text-muted-foreground">
                Audit history of manual stock adjustments, refill level changes, and corrections
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/inventory">
              <PackageSearch className="w-4 h-4 mr-2" />
              Go to Inventory
            </Link>
          </Button>
          <Button variant="outline" size="icon" onClick={() => refetch()} title="Refresh records">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Adjustments</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{stats.total}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Today's Adjustments</p>
                <p className="text-2xl font-bold mt-1 text-primary">{stats.today}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">LPG Cylinders</p>
                <p className="text-2xl font-bold mt-1 text-orange-500">{stats.lpg}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center">
                <Flame className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">General Items</p>
                <p className="text-2xl font-bold mt-1 text-emerald-500">{stats.general}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="bg-card border shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Search Input */}
            <div className="relative md:col-span-4">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search product, branch, user, reason..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Branch Filter */}
            <div className="md:col-span-3">
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product Type Filter */}
            <div className="md:col-span-2">
              <Select value={selectedType} onValueChange={(val: any) => setSelectedType(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Type: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="LPG">LPG Only</SelectItem>
                  <SelectItem value="GENERAL">General Items</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Inputs */}
            <div className="md:col-span-3 flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs"
                title="Start Date"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs"
                title="End Date"
              />
            </div>
          </div>

          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-muted-foreground mr-1">Quick Filters:</span>
              <Button
                variant={startDate === new Date().toISOString().split('T')[0] && endDate === new Date().toISOString().split('T')[0] ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setQuickRange('today')}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setQuickRange('7days')}
              >
                Last 7 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setQuickRange('30days')}
              >
                Last 30 Days
              </Button>
              {(startDate || endDate || search || selectedBranch !== 'all' || selectedType !== 'ALL') && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setSearch('')
                    setSelectedBranch('all')
                    setSelectedType('ALL')
                    setQuickRange('clear')
                  }}
                >
                  Reset All Filters
                </Button>
              )}
            </div>

            <div className="text-muted-foreground">
              Found <span className="font-semibold text-foreground">{filtered.length}</span> record{filtered.length === 1 ? '' : 's'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Adjustments Table */}
      <Card className="bg-card border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[180px]">Date & Time</TableHead>
                <TableHead className="w-[150px]">Branch</TableHead>
                <TableHead className="w-[200px]">Product</TableHead>
                <TableHead>Change Details</TableHead>
                <TableHead className="w-[180px]">Reason</TableHead>
                <TableHead className="w-[140px]">Adjusted By</TableHead>
                <TableHead className="w-[50px] text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm">Loading stock adjustment logs...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <SlidersHorizontal className="w-12 h-12 mb-3 opacity-25" />
                      <p className="font-semibold text-foreground">No Stock Adjustments Found</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {search || selectedBranch !== 'all' || startDate || endDate
                          ? 'No adjustment records match your active filters. Try resetting search or date range.'
                          : 'Manual adjustments made in Inventory will automatically appear here.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((item) => {
                  const isPositive =
                    item.newQuantity != null && item.previousQuantity != null
                      ? item.newQuantity > item.previousQuantity
                      : item.type === 'INCREASE'

                  return (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedRecord(item)}
                    >
                      {/* Date & Time */}
                      <TableCell className="align-top py-3">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                            {formatAdjustmentDate(item.createdAt)}
                          </span>
                        </div>
                      </TableCell>

                      {/* Branch */}
                      <TableCell className="align-top py-3">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium text-foreground truncate max-w-[130px]" title={item.branchName}>
                            {item.branchName}
                          </span>
                        </div>
                      </TableCell>

                      {/* Product */}
                      <TableCell className="align-top py-3">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-semibold text-foreground" title={item.productName}>
                              {item.productName}
                            </span>
                            {item.isLpg ? (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 border-orange-500/30 text-orange-500 bg-orange-500/10">
                                <Flame className="w-2.5 h-2.5 mr-0.5" /> LPG
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                General
                              </Badge>
                            )}
                          </div>
                          {item.productCode && (
                            <span className="text-[11px] text-muted-foreground">{item.productCode}</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Change Details */}
                      <TableCell className="align-top py-3">
                        <div className="space-y-1.5">
                          {/* Visual Change Chips */}
                          {item.isLpg && item.previousFull != null && item.newFull != null ? (
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              {/* Refill Change */}
                              <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-md">
                                <span className="font-medium text-orange-600 dark:text-orange-400">Refill:</span>
                                <span className="text-muted-foreground">{item.previousFull}</span>
                                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                <span className="font-bold text-foreground">{item.newFull}</span>
                                {item.newFull - item.previousFull !== 0 && (
                                  <span className={`text-[10px] font-bold ${item.newFull >= item.previousFull ? 'text-emerald-500' : 'text-red-500'}`}>
                                    ({item.newFull - item.previousFull > 0 ? '+' : ''}{item.newFull - item.previousFull})
                                  </span>
                                )}
                              </div>

                              {/* Total Cylinders Change */}
                              {item.previousQuantity != null && item.newQuantity != null && (
                                <div className="flex items-center gap-1.5 bg-muted/60 border px-2 py-0.5 rounded-md">
                                  <span className="font-medium text-muted-foreground">Shells:</span>
                                  <span className="text-muted-foreground">{item.previousQuantity}</span>
                                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                  <span className="font-bold text-foreground">{item.newQuantity}</span>
                                  {item.newQuantity - item.previousQuantity !== 0 && (
                                    <span className={`text-[10px] font-bold ${item.newQuantity >= item.previousQuantity ? 'text-emerald-500' : 'text-red-500'}`}>
                                      ({item.newQuantity - item.previousQuantity > 0 ? '+' : ''}{item.newQuantity - item.previousQuantity})
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Empty Cylinders Change */}
                              {item.previousEmpty != null && item.newEmpty != null && item.previousEmpty !== item.newEmpty && (
                                <div className="flex items-center gap-1.5 bg-slate-500/10 border border-slate-500/20 px-2 py-0.5 rounded-md">
                                  <span className="font-medium text-slate-500">Empty:</span>
                                  <span className="text-muted-foreground">{item.previousEmpty}</span>
                                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                  <span className="font-bold text-foreground">{item.newEmpty}</span>
                                </div>
                              )}
                            </div>
                          ) : item.previousQuantity != null && item.newQuantity != null ? (
                            <div className="flex items-center gap-1.5 bg-muted/60 border px-2 py-0.5 rounded-md w-fit text-xs">
                              <span className="font-medium text-muted-foreground">Quantity:</span>
                              <span className="text-muted-foreground">{item.previousQuantity}</span>
                              <ArrowRight className="w-3 h-3 text-muted-foreground" />
                              <span className="font-bold text-foreground">{item.newQuantity}</span>
                              <span className={`text-[10px] font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                                ({item.newQuantity - item.previousQuantity > 0 ? '+' : ''}{item.newQuantity - item.previousQuantity})
                              </span>
                            </div>
                          ) : (
                            <div className="text-xs font-medium text-foreground">
                              {item.changeSummary || `${item.type}: ${item.quantity}`}
                            </div>
                          )}

                          {/* Secondary Text Description */}
                          {item.changeSummary && item.changeSummary !== item.reason && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1">{item.changeSummary}</p>
                          )}
                        </div>
                      </TableCell>

                      {/* Reason */}
                      <TableCell className="align-top py-3">
                        <span className="text-xs text-muted-foreground font-medium line-clamp-2" title={item.reason}>
                          {item.reason || 'Manual stock update'}
                        </span>
                      </TableCell>

                      {/* Adjusted By */}
                      <TableCell className="align-top py-3">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-foreground">
                            {item.performedBy ? `${item.performedBy.firstName} ${item.performedBy.lastName}` : 'Administrator'}
                          </span>
                          {item.performedBy?.role && (
                            <span className="text-[10px] text-muted-foreground capitalize">
                              {item.performedBy.role.toLowerCase().replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Details trigger */}
                      <TableCell className="align-middle py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedRecord(item)
                          }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
              <span className="font-semibold text-foreground">{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}</span> of{' '}
              <span className="font-semibold text-foreground">{filtered.length}</span> adjustments
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1 || filtered.length === 0}
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
              </Button>
              <span className="text-xs font-medium px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages || filtered.length === 0}
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Record Detail Dialog */}
      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-primary" />
              Stock Adjustment Details
            </DialogTitle>
            <DialogDescription>
              Full breakdown of the recorded inventory change
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-4 pt-2 text-sm">
              {/* Branch & Product Card */}
              <div className="bg-muted/40 p-3 rounded-lg border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Branch:</span>
                  <span className="font-bold text-foreground">{selectedRecord.branchName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Product:</span>
                  <span className="font-bold text-foreground">{selectedRecord.productName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Product Type:</span>
                  <Badge variant={selectedRecord.isLpg ? 'outline' : 'secondary'} className="text-xs">
                    {selectedRecord.isLpg ? 'LPG Cylinder Tracked' : 'General Product'}
                  </Badge>
                </div>
              </div>

              {/* Before vs After Audit Grid */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Stock Comparison
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                    <p className="text-xs font-semibold text-red-500 mb-2">Previous Values</p>
                    {selectedRecord.isLpg ? (
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Refill (Full):</span>
                          <span className="font-bold">{selectedRecord.previousFull ?? '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Shells:</span>
                          <span className="font-bold">{selectedRecord.previousQuantity ?? '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Empty Shells:</span>
                          <span className="font-bold">{selectedRecord.previousEmpty ?? '-'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Quantity:</span>
                        <span className="font-bold">{selectedRecord.previousQuantity ?? '-'}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                    <p className="text-xs font-semibold text-emerald-500 mb-2">New Values</p>
                    {selectedRecord.isLpg ? (
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Refill (Full):</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedRecord.newFull ?? '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Shells:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedRecord.newQuantity ?? '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Empty Shells:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedRecord.newEmpty ?? '-'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Quantity:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedRecord.newQuantity ?? '-'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Change Summary */}
              <div className="p-3 bg-card rounded-lg border space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Summary of Change:</span>
                <p className="text-sm font-semibold text-foreground">{selectedRecord.changeSummary || 'Quantity Adjusted'}</p>
              </div>

              {/* Reason */}
              <div className="p-3 bg-card rounded-lg border space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Reason Provided:</span>
                <p className="text-sm text-foreground">{selectedRecord.reason || 'None specified'}</p>
              </div>

              {/* Performed by & Date */}
              <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t">
                <div>
                  <span>Adjusted by: </span>
                  <span className="font-semibold text-foreground">
                    {selectedRecord.performedBy
                      ? `${selectedRecord.performedBy.firstName} ${selectedRecord.performedBy.lastName}`
                      : 'Administrator'}
                  </span>
                </div>
                <div>{formatAdjustmentDate(selectedRecord.createdAt)}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
