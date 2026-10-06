import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { expensesApi } from '@/api'
import { useAuthStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { Receipt, Plus, Coins } from 'lucide-react'

const expenseCategories = [
  { value: 'FUEL', label: 'Fuel' },
  { value: 'UTILITIES', label: 'Utilities' },
  { value: 'REPAIRS', label: 'Repairs' },
  { value: 'MISCELLANEOUS', label: 'Miscellaneous' },
  { value: 'OTHER', label: 'Other' },
]

const Expenses = () => {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [newExpense, setNewExpense] = useState({ amount: '', category: '', description: '', receiptUrl: '' })

  const { data: expenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const response = await expensesApi.getAll({ branchId: user?.branchId })
      return response.data
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => expensesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      setShowCreate(false)
      setNewExpense({ amount: '', category: '', description: '', receiptUrl: '' })
      toast.success('Expense submitted for approval')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to submit expense')
    },
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return <Badge variant="success">Approved</Badge>
      case 'PENDING': return <Badge variant="warning">Pending Approval</Badge>
      case 'REJECTED': return <Badge variant="destructive">Rejected</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-muted-foreground">Submit and track branch expenses</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Submit Expense
        </Button>
      </div>

      {/* Daily Petty Cash summary card */}
      <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0 mt-0.5">
                <Coins className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-blue-950 dark:text-blue-100">Daily Constant Petty Cash</h3>
                  <Badge variant="outline" className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 text-[10px]">
                    Auto-Approved
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                  Fixed daily operational allowance set by the Super Admin. Automatically deducted in cash drawer reconciliation on days with sales (skipped if zero sales). All other expenses require approval.
                </p>
              </div>
            </div>
            <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
              <p className="text-xs text-muted-foreground uppercase font-semibold">Your Daily Allowance</p>
              <p className="text-xl sm:text-2xl font-black text-blue-700 dark:text-blue-300">
                {user?.dailyPettyCash ? formatCurrency(Number(user.dailyPettyCash)) : 'KES 0.00'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {expenses?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Receipt className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No expenses recorded yet</p>
          </div>
        ) : (
          expenses?.map((expense: any) => (
            <Card key={expense.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold">{expense.expenseCode}</h3>
                      {expense.category === 'PETTY_CASH' ? (
                        <Badge variant="success">Auto-Approved</Badge>
                      ) : (
                        getStatusBadge(expense.status)
                      )}
                    </div>
                    {expense.category === 'PETTY_CASH' ? (
                      <Badge variant="outline" className="mb-2 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/20">
                        Petty Cash (Daily Constant)
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="mb-2">{expense.category}</Badge>
                    )}
                    <p className="text-sm mt-1">{expense.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(expense.createdAt)}</p>
                  </div>
                  <p className="text-xl font-bold">{formatCurrency(expense.amount)}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Expense</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Submit operational expenses for Admin approval. Once approved, expenses are deducted from drawer reconciliation.
            </p>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({...newExpense, amount: Number(newExpense.amount), branchId: user?.branchId}) }} className="space-y-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={newExpense.category} onValueChange={v => setNewExpense({...newExpense, category: v})}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {expenseCategories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Amount *</Label><Input type="number" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} required /></div>
            <div className="space-y-2"><Label>Description *</Label><Input placeholder="Brief explanation of the expense" value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} required /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>Submit</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Expenses