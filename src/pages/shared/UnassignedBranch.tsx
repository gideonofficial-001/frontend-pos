import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { authApi } from '@/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Logo } from '@/components/Logo'
import { toast } from 'sonner'
import { Building2, ShieldAlert, RefreshCw, LogOut, Mail, UserCheck } from 'lucide-react'

export default function UnassignedBranch() {
  const { user, token, setAuth, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const [isChecking, setIsChecking] = useState(false)

  const checkStatus = async (silent = false) => {
    if (!token) return
    setIsChecking(true)
    try {
      const response = await authApi.getProfile()
      const updatedUser = response.data

      if (updatedUser && (updatedUser.branchId || updatedUser.role === 'SUPER_ADMIN')) {
        setAuth(updatedUser, token)
        toast.success('Branch Assigned!', {
          description: `You have been assigned to ${updatedUser.branch?.name || 'your branch'}. Redirecting...`,
        })
        navigate('/')
        return
      }

      if (!silent) {
        toast.info('Status Checked', {
          description: 'Your account is still waiting for branch assignment by an administrator.',
        })
      }
    } catch (err: any) {
      if (!silent) {
        toast.error('Check Failed', {
          description: err.response?.data?.message || 'Unable to verify assignment status. Please try again.',
        })
      }
    } finally {
      setIsChecking(false)
    }
  }

  // Periodic background check every 20s or on window focus
  useEffect(() => {
    const handleFocus = () => {
      checkStatus(true)
    }
    window.addEventListener('focus', handleFocus)
    const interval = setInterval(() => {
      checkStatus(true)
    }, 20000)

    return () => {
      window.removeEventListener('focus', handleFocus)
      clearInterval(interval)
    }
  }, [token])

  const handleLogout = () => {
    clearAuth()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl border-amber-500/30 dark:border-amber-500/20">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <Logo size="lg" variant="color" />
          </div>
          <div className="w-14 h-14 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-2 border border-amber-500/30 shadow-inner">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">No Branch Assigned</CardTitle>
          <CardDescription className="text-sm pt-1">
            Please contact your system administrator to be assigned a branch.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          <div className="rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 p-4 text-xs sm:text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
            Your login was successful, but branch management permissions require an active branch assignment. Until an administrator assigns you to a branch, your access to sales, transfers, and inventory is paused.
          </div>

          {user && (
            <div className="rounded-lg border bg-card p-4 space-y-3 text-xs sm:text-sm">
              <div className="flex items-center justify-between pb-2 border-b">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-primary" /> User Account
                </span>
                <span className="font-semibold text-foreground">
                  {user.firstName} {user.lastName}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-primary" /> Email
                </span>
                <span className="font-mono text-xs text-foreground">{user.email}</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b">
                <span className="text-muted-foreground">Assigned Role</span>
                <Badge variant="outline" className="font-medium text-xs capitalize">
                  {user.role?.toLowerCase().replace('_', ' ')}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-amber-500" /> Current Branch
                </span>
                <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/50">
                  Unassigned
                </Badge>
              </div>
            </div>
          )}

          <p className="text-xs text-center text-muted-foreground pt-1">
            Once an administrator assigns your branch in the admin portal, click below to refresh and unlock your dashboard.
          </p>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            variant="default"
            className="w-full sm:flex-1 gap-2"
            onClick={() => checkStatus(false)}
            disabled={isChecking}
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Refresh Status'}
          </Button>

          <Button
            variant="outline"
            className="w-full sm:w-auto gap-2"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
