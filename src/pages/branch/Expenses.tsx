import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { expensesApi, usersApi, branchesApi } from '@/api'
import { useAuthStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { UserRole } from '@/types'
import {
  Receipt,
  Plus,
  Coins,
  Check,
  X,
  Building2,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit,
  ExternalLink,
  ShieldCheck,
  Filter,
  ArrowUpDown,
  Sparkles,
} from 'lucide-react'

const regularExpenseCategories = [
  { value: 'FUEL', label: 'Fuel' },
  { value: 'UTILITIES', label: 'Utilities (Electricity, Water, Internet)' },
  { value: 'REPAIRS', label: 'Repairs & Maintenance' },
  { value: 'MISCELLANEOUS', label: 'Miscellaneous' },
  { value: 'OTHER', label: 'Other Operational Expenses' },
]

export default function Expenses() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const isAdmin = user?.role === UserRole.SUPER_ADMIN
  const isBranchManager = user?.role === UserRole.BRANCH_MANAGER
  const isManagement = isAdmin

  // State
  const [activeTab, setActiveTab] = useState<'expenses' | 'petty-cash'>('expenses')
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    isBranchManager ? (user?.branchId || '') : 'ALL'
  )
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Create Expense Modal
  const [showCreate, setShowCreate] = useState(false)
  const [newExpense, setNewExpense] = useState({
    branchId: isBranchManager ? (user?.branchId || '') : '',
    amount: '',
    category: '',
    description: '',
    receiptUrl: '',
  })

  // Reject Expense Modal
  const [rejectDialogExpense, setRejectDialogExpense] = useState<any>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  // Petty Cash Configuration Modal
  const [editPettyCashUser, setEditPettyCashUser] = useState<any>(null)
  const [pettyCashAmountInput, setPettyCashAmountInput] = useState<string>('')

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await branchesApi.getAll()
      return res.data || []
    },
    enabled: isManagement,
  })

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ['expenses', selectedBranchId],
    queryFn: async () => {
      const branchParam = selectedBranchId === 'ALL' ? undefined : selectedBranchId
      const res = await expensesApi.getAll({ branchId: branchParam })
      return res.data || []
    },
  })

  const { data: pettyCashAllocations = [], isLoading: loadingAllocations } = useQuery({
    queryKey: ['petty-cash-allocations'],
    queryFn: async () => {
      const res = await usersApi.getPettyCashAllocations()
      return res.data || []
    },
    enabled: isManagement,
  })

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: any) => expensesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      setShowCreate(false)
      setNewExpense({
        branchId: isBranchManager ? (user?.branchId || '') : '',
        amount: '',
        category: '',
        description: '',
        receiptUrl: '',
      })
      toast.success('Operational expense submitted for Admin approval')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to submit expense')
    },
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => expensesApi.approve(id),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      toast.success(`Expense ${data.data?.expenseCode || ''} approved successfully`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to approve expense')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      expensesApi.reject(id, reason),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      setRejectDialogExpense(null)
      setRejectionReason('')
      toast.success(`Expense ${data.data?.expenseCode || ''} rejected`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reject expense')
    },
  })

  const setPettyCashMutation = useMutation({
    mutationFn: ({ userId, dailyPettyCash }: { userId: string; dailyPettyCash: number }) =>
      usersApi.setPettyCash(userId, dailyPettyCash),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['petty-cash-allocations'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      setEditPettyCashUser(null)
      toast.success(`Daily petty cash allowance updated for ${res.data?.firstName || 'user'}`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update petty cash allowance')
    },
  })

  // ── Derived Metrics ──────────────────────────────────────────────────────────
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e: any) => {
      // Status filter
      if (statusFilter === 'PENDING' && e.status !== 'PENDING') return false
      if (statusFilter === 'APPROVED' && e.status !== 'APPROVED') return false
      if (statusFilter === 'REJECTED' && e.status !== 'REJECTED') return false
      if (statusFilter === 'PETTY_CASH' && e.category !== 'PETTY_CASH') return false

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const code = (e.expenseCode || '').toLowerCase()
        const desc = (e.description || '').toLowerCase()
        const branchName = (e.branch?.name || '').toLowerCase()
        const userName = `${e.user?.firstName || ''} ${e.user?.lastName || ''}`.toLowerCase()
        return code.includes(q) || desc.includes(q) || branchName.includes(q) || userName.includes(q)
      }
      return true
    })
  }, [expenses, statusFilter, searchQuery])

  const stats = useMemo(() => {
    const totalCount = expenses.length
    const totalAmount = expenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0)

    const pendingExpenses = expenses.filter((e: any) => e.status === 'PENDING')
    const pendingCount = pendingExpenses.length
    const pendingAmount = pendingExpenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0)

    const approvedExpenses = expenses.filter((e: any) => e.status === 'APPROVED')
    const approvedAmount = approvedExpenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0)

    const pettyCashExpenses = expenses.filter((e: any) => e.category === 'PETTY_CASH')
    const pettyCashTotal = pettyCashExpenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0)

    // Petty Cash Pool across configured managers
    const totalConfiguredPettyCash = pettyCashAllocations.reduce(
      (sum: number, u: any) => sum + Number(u.dailyPettyCash || 0),
      0
    )

    return {
      totalCount,
      totalAmount,
      pendingCount,
      pendingAmount,
      approvedAmount,
      pettyCashTotal,
      totalConfiguredPettyCash,
    }
  }, [expenses, pettyCashAllocations])

  // Helper for Status Badges
  const renderStatusBadge = (expense: any) => {
    if (expense.category === 'PETTY_CASH') {
      return (
        <Badge variant="outline" className="border-blue-400 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 gap-1 text-[11px] font-semibold">
          <CheckCircle2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
          Auto-Approved
        </Badge>
      )
    }

    switch (expense.status) {
      case 'APPROVED':
        return (
          <Badge variant="success" className="gap-1 text-[11px] font-semibold">
            <CheckCircle2 className="w-3 h-3" />
            Approved
          </Badge>
        )
      case 'PENDING':
        return (
          <Badge variant="warning" className="gap-1 text-[11px] font-semibold">
            <Clock className="w-3 h-3" />
            Pending Approval
          </Badge>
        )
      case 'REJECTED':
        return (
          <Badge variant="destructive" className="gap-1 text-[11px] font-semibold">
            <XCircle className="w-3 h-3" />
            Rejected
          </Badge>
        )
      default:
        return <Badge>{expense.status}</Badge>
    }
  }

  // Handle Create Expense Submission
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const branchToUse = isManagement ? newExpense.branchId : user?.branchId
    if (!branchToUse) {
      toast.error('Please select a branch for this expense')
      return
    }

    if (!newExpense.category) {
      toast.error('Please select an expense category')
      return
    }

    if (!newExpense.amount || Number(newExpense.amount) <= 0) {
      toast.error('Please enter a valid expense amount')
      return
    }

    createMutation.mutate({
      branchId: branchToUse,
      category: newExpense.category,
      amount: Number(newExpense.amount),
      description: newExpense.description.trim(),
      receiptUrl: newExpense.receiptUrl.trim() || undefined,
    })
  }

  // Handle Reject Submit
  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejecting this expense')
      return
    }
    rejectMutation.mutate({
      id: rejectDialogExpense.id,
      reason: rejectionReason.trim(),
    })
  }

  // Quick Preset Helper for Petty Cash Modal
  const setQuickPettyCash = (amount: number) => {
    setPettyCashAmountInput(String(amount))
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Expenses & Petty Cash</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isAdmin
              ? 'Review branch operational expenses, approve deductions, and configure daily petty cash allowances'
              : 'Submit operational expenses and monitor your daily constant petty cash'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Branch Selector for Super Admin & Overall Manager */}
          {isManagement && (
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger className="w-full sm:w-48 bg-card">
                <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Filter branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Branches</SelectItem>
                {branches.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button onClick={() => setShowCreate(true)} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            Submit Expense
          </Button>
        </div>
      </div>

      {/* ── Metric Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Total Incurred</span>
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-2xl font-black">{formatCurrency(stats.totalAmount)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stats.totalCount} total expense {stats.totalCount === 1 ? 'record' : 'records'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm transition-shadow border-amber-200 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/10">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-400">
                Pending Approval
              </span>
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-2xl font-black text-amber-700 dark:text-amber-300">
                {formatCurrency(stats.pendingAmount)}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="warning" className="text-[10px] px-1.5 py-0 h-4">
                  {stats.pendingCount} pending
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {isAdmin ? 'requires your review' : 'awaiting Admin'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm transition-shadow border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/10">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-400">
                Approved Deductions
              </span>
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                {formatCurrency(stats.approvedAmount)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Deducted from drawer reconciliation</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm transition-shadow border-blue-200 dark:border-blue-900/50 bg-blue-50/20 dark:bg-blue-950/10">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-blue-700 dark:text-blue-400">
                {isManagement ? 'Daily Petty Cash Pool' : 'Your Daily Petty Cash'}
              </span>
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                <Coins className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-2xl font-black text-blue-700 dark:text-blue-300">
                {formatCurrency(
                  isManagement
                    ? stats.totalConfiguredPettyCash
                    : Number(user?.dailyPettyCash || 0)
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isManagement
                  ? `${pettyCashAllocations.filter((u: any) => Number(u.dailyPettyCash) > 0).length} managers allocated`
                  : 'Auto-deducted on active sales days'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Daily Petty Cash Banner Callout ── */}
      <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-blue-50/20 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-blue-950/10">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0 mt-0.5">
                <Coins className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-base text-blue-950 dark:text-blue-100">
                    Daily Constant Petty Cash Policy
                  </h3>
                  <Badge variant="outline" className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 text-[10px]">
                    Auto-Approved
                  </Badge>
                  <Badge variant="outline" className="border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 text-[10px]">
                    Zero-Sales Safe
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                  Fixed daily operational allowance set individually for each branch manager by the Super Admin. It is automatically deducted during daily cash drawer reconciliation. 
                  <strong className="text-foreground ml-1">
                    If a branch records no sales on any given day, the deduction is automatically skipped.
                  </strong> All other operational expenses (fuel, repairs, etc.) require individual Admin approval.
                </p>
              </div>
            </div>

            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100/50 shrink-0 self-start md:self-center"
                onClick={() => setActiveTab('petty-cash')}
              >
                <Edit className="w-3.5 h-3.5 mr-1.5" />
                Configure Allocations
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Main Tab Navigation ── */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-2">
          <TabsList className="bg-muted">
            <TabsTrigger value="expenses" className="gap-2">
              <Receipt className="w-4 h-4" />
              Expenses Log
              {stats.pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                  {stats.pendingCount}
                </span>
              )}
            </TabsTrigger>
            {isManagement && (
              <TabsTrigger value="petty-cash" className="gap-2">
                <Coins className="w-4 h-4" />
                Petty Cash Allocations
                <Badge variant="secondary" className="ml-1 text-[10px] py-0 px-1">
                  Admin
                </Badge>
              </TabsTrigger>
            )}
          </TabsList>

          {activeTab === 'expenses' && (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:w-60">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search code, desc, branch..."
                  className="pl-8 h-9 text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-9 text-xs">
                  <Filter className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending Only</SelectItem>
                  <SelectItem value="APPROVED">Approved Only</SelectItem>
                  <SelectItem value="REJECTED">Rejected Only</SelectItem>
                  <SelectItem value="PETTY_CASH">Petty Cash Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* ── Tab 1: Expenses Log ── */}
        <TabsContent value="expenses" className="space-y-4 mt-0">
          {loadingExpenses ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading operational expenses...
            </div>
          ) : filteredExpenses.length === 0 ? (
            <Card className="text-center py-16 text-muted-foreground border-dashed">
              <CardContent>
                <Receipt className="w-12 h-12 mx-auto mb-3 opacity-25" />
                <h3 className="font-semibold text-foreground text-base">No expenses found</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  {searchQuery || statusFilter !== 'ALL'
                    ? 'No expenses match your search or status filter. Try clearing the filters.'
                    : 'No operational expenses have been recorded yet for the selected branch.'}
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  {(searchQuery || statusFilter !== 'ALL') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('')
                        setStatusFilter('ALL')
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                  <Button size="sm" onClick={() => setShowCreate(true)}>
                    <Plus className="w-4 h-4 mr-1.5" />
                    Submit Expense
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredExpenses.map((expense: any) => {
                const isPetty = expense.category === 'PETTY_CASH'
                const isPending = expense.status === 'PENDING'

                return (
                  <Card
                    key={expense.id}
                    className={`transition-all hover:shadow-md ${
                      isPending
                        ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/10 dark:bg-amber-950/10'
                        : isPetty
                        ? 'border-blue-200 dark:border-blue-900/60'
                        : ''
                    }`}
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-sm text-foreground">
                              {expense.expenseCode}
                            </span>

                            {renderStatusBadge(expense)}

                            {expense.branch && (
                              <Badge variant="outline" className="text-[11px] gap-1 font-medium bg-muted/40">
                                <Building2 className="w-3 h-3 text-muted-foreground" />
                                {expense.branch.name}
                              </Badge>
                            )}

                            {isPetty ? (
                              <Badge
                                variant="outline"
                                className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 bg-blue-50/60 dark:bg-blue-950/30 text-[10px]"
                              >
                                Daily Constant Petty Cash
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">
                                {expense.category}
                              </Badge>
                            )}
                          </div>

                          <p className="text-sm font-medium text-foreground">{expense.description}</p>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                            <span>
                              Recorded: <strong>{formatDate(expense.createdAt)}</strong>
                            </span>
                            {expense.user && (
                              <span>
                                By: <strong>{expense.user.firstName} {expense.user.lastName}</strong>
                              </span>
                            )}
                            {expense.approvedBy && expense.status === 'APPROVED' && (
                              <span className="text-emerald-700 dark:text-emerald-400">
                                Approved by: <strong>{expense.approvedBy.firstName} {expense.approvedBy.lastName}</strong>
                              </span>
                            )}
                            {expense.receiptUrl && (
                              <a
                                href={expense.receiptUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:underline"
                              >
                                <ExternalLink className="w-3 h-3" />
                                View Receipt
                              </a>
                            )}
                          </div>

                          {/* Rejection notice */}
                          {expense.status === 'REJECTED' && expense.rejectionReason && (
                            <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2 mt-2">
                              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold">Rejection Reason:</span> {expense.rejectionReason}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right side: Amount & Admin Quick Actions */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 shrink-0">
                          <p className="text-xl sm:text-2xl font-black text-foreground">
                            {formatCurrency(expense.amount)}
                          </p>

                          {/* Approve / Reject Actions for Super Admin */}
                          {isAdmin && isPending && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive text-xs gap-1"
                                onClick={() => {
                                  setRejectDialogExpense(expense)
                                  setRejectionReason('')
                                }}
                              >
                                <X className="w-3.5 h-3.5" />
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1"
                                disabled={approveMutation.isPending}
                                onClick={() => approveMutation.mutate(expense.id)}
                              >
                                <Check className="w-3.5 h-3.5" />
                                Approve
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Tab 2: Petty Cash Allocations (Admin Module) ── */}
        {isManagement && (
          <TabsContent value="petty-cash" className="space-y-4 mt-0">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Coins className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      Individual Daily Petty Cash Allocations
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Set and maintain daily constant petty cash per branch manager. Reconciled during daily drawer closing only when sales exist.
                    </CardDescription>
                  </div>
                  {isAdmin && (
                    <Badge variant="outline" className="border-blue-400 text-blue-700 dark:text-blue-300 self-start sm:self-auto">
                      <ShieldCheck className="w-3.5 h-3.5 mr-1 text-blue-600" />
                      Super Admin Managed
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-bold">Staff / Manager</TableHead>
                        <TableHead className="font-bold">Role</TableHead>
                        <TableHead className="font-bold">Assigned Branch</TableHead>
                        <TableHead className="font-bold text-right">Daily Petty Cash</TableHead>
                        <TableHead className="font-bold text-center">Status</TableHead>
                        {isAdmin && <TableHead className="font-bold text-right">Action</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingAllocations ? (
                        <TableRow>
                          <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-10 text-muted-foreground text-sm">
                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                            Loading staff petty cash allocations...
                          </TableCell>
                        </TableRow>
                      ) : pettyCashAllocations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-8 text-muted-foreground text-sm">
                            No active staff members found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        pettyCashAllocations.map((u: any) => {
                          const branch = u.effectiveBranch || u.branch || u.managedBranch
                          const amount = Number(u.dailyPettyCash || 0)
                          const hasAllowance = amount > 0

                          return (
                            <TableRow key={u.id} className="hover:bg-muted/30">
                              <TableCell>
                                <div>
                                  <p className="font-semibold text-sm text-foreground">
                                    {u.firstName} {u.lastName}
                                  </p>
                                  <p className="text-xs text-muted-foreground font-mono">{u.email}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-[10px]">
                                  {u.role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {branch ? (
                                  <div className="flex items-center gap-1.5 text-xs font-medium">
                                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span>{branch.name}</span>
                                    {branch.code && (
                                      <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">
                                        {branch.code}
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">None (Unassigned)</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <span
                                  className={`font-black text-sm ${
                                    hasAllowance
                                      ? 'text-blue-700 dark:text-blue-300'
                                      : 'text-muted-foreground font-normal'
                                  }`}
                                >
                                  {formatCurrency(amount)}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                {hasAllowance ? (
                                  <Badge variant="success" className="text-[10px]">
                                    Active Allowance
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                    No Allowance
                                  </Badge>
                                )}
                              </TableCell>
                              {isAdmin && (
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                                    onClick={() => {
                                      setEditPettyCashUser(u)
                                      setPettyCashAmountInput(String(amount || 0))
                                    }}
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                    Set Allowance
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* ── Dialog: Submit Regular Expense ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Operational Expense</DialogTitle>
            <DialogDescription className="text-xs">
              Submit operational costs for approval. Non-petty expenses require Admin approval before deduction in drawer reconciliation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 mt-2">
            {/* Branch selector if management */}
            {isManagement && (
              <div className="space-y-1.5">
                <Label htmlFor="branch" className="text-xs font-semibold">
                  Branch *
                </Label>
                <Select
                  value={newExpense.branchId}
                  onValueChange={(v) => setNewExpense({ ...newExpense, branchId: v })}
                >
                  <SelectTrigger id="branch" className="h-9">
                    <SelectValue placeholder="Select target branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} ({b.code || 'BR'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-xs font-semibold">
                Category *
              </Label>
              <Select
                value={newExpense.category}
                onValueChange={(v) => setNewExpense({ ...newExpense, category: v })}
              >
                <SelectTrigger id="category" className="h-9">
                  <SelectValue placeholder="Select expense category" />
                </SelectTrigger>
                <SelectContent>
                  {regularExpenseCategories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Petty cash is handled automatically each day and cannot be manually submitted here.
              </p>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs font-semibold">
                Amount (KES) *
              </Label>
              <Input
                id="amount"
                type="number"
                min="1"
                step="0.01"
                placeholder="0.00"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                required
                className="h-9"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="desc" className="text-xs font-semibold">
                Description & Purpose *
              </Label>
              <Input
                id="desc"
                placeholder="e.g. Generator petrol refill, Internet subscription receipt #402"
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                required
                className="h-9"
              />
            </div>

            {/* Receipt URL */}
            <div className="space-y-1.5">
              <Label htmlFor="receipt" className="text-xs font-semibold">
                Receipt / Invoice Reference URL (Optional)
              </Label>
              <Input
                id="receipt"
                placeholder="https://... or physical receipt note"
                value={newExpense.receiptUrl}
                onChange={(e) => setNewExpense({ ...newExpense, receiptUrl: e.target.value })}
                className="h-9"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Submitting...' : 'Submit for Approval'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Reject Expense (with reason) ── */}
      <Dialog open={!!rejectDialogExpense} onOpenChange={(open) => !open && setRejectDialogExpense(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              Reject Expense
            </DialogTitle>
            <DialogDescription className="text-xs">
              Rejecting {rejectDialogExpense?.expenseCode} (
              {formatCurrency(rejectDialogExpense?.amount || 0)}). Please state the reason for rejection.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRejectSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="rejectReason" className="text-xs font-semibold">
                Rejection Reason *
              </Label>
              <Input
                id="rejectReason"
                placeholder="e.g. Missing receipt, invalid amount, unapproved expenditure"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setRejectDialogExpense(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={rejectMutation.isPending}>
                {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Set Individual Petty Cash Allowance (Admin Only) ── */}
      <Dialog open={!!editPettyCashUser} onOpenChange={(open) => !open && setEditPettyCashUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Configure Daily Petty Cash
            </DialogTitle>
            <DialogDescription className="text-xs">
              Set the daily constant allowance for {editPettyCashUser?.firstName} {editPettyCashUser?.lastName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="p-3 rounded-lg bg-muted/60 space-y-1 text-xs">
              <p>
                <strong className="text-foreground">Staff:</strong> {editPettyCashUser?.firstName} {editPettyCashUser?.lastName} ({editPettyCashUser?.email})
              </p>
              <p>
                <strong className="text-foreground">Branch:</strong> {editPettyCashUser?.effectiveBranch?.name || editPettyCashUser?.branch?.name || editPettyCashUser?.managedBranch?.name || 'Unassigned'}
              </p>
              <p>
                <strong className="text-foreground">Current Allowance:</strong> {formatCurrency(Number(editPettyCashUser?.dailyPettyCash || 0))} / day
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pettyCashInput" className="text-xs font-semibold">
                Daily Allowance (KES) *
              </Label>
              <Input
                id="pettyCashInput"
                type="number"
                min="0"
                step="50"
                placeholder="e.g. 1500"
                value={pettyCashAmountInput}
                onChange={(e) => setPettyCashAmountInput(e.target.value)}
                className="h-10 text-base font-bold"
              />
              <p className="text-[11px] text-muted-foreground">
                Enter 0 to disable daily petty cash for this user.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground">Quick Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => setQuickPettyCash(0)}
                >
                  KES 0
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => setQuickPettyCash(500)}
                >
                  KES 500
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => setQuickPettyCash(1000)}
                >
                  KES 1,000
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => setQuickPettyCash(1500)}
                >
                  KES 1,500
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => setQuickPettyCash(2000)}
                >
                  KES 2,000
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => setQuickPettyCash(3000)}
                >
                  KES 3,000
                </Button>
              </div>
            </div>

            <div className="p-2.5 rounded-md bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-[11px] text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Zero-Sales Protection:</strong> This amount will be automatically deducted daily in the Cash Drawer Reconciliation only when the branch records sales. If the branch makes zero sales, the deduction is skipped.
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditPettyCashUser(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={setPettyCashMutation.isPending}
                onClick={() => {
                  const val = Number(pettyCashAmountInput)
                  if (isNaN(val) || val < 0) {
                    toast.error('Please enter a valid amount (0 or greater)')
                    return
                  }
                  setPettyCashMutation.mutate({
                    userId: editPettyCashUser.id,
                    dailyPettyCash: val,
                  })
                }}
              >
                {setPettyCashMutation.isPending ? 'Saving...' : 'Save Allowance'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}