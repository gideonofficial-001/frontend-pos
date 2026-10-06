import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, branchesApi } from '@/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UserRole, UserStatus } from '@/types'
import { Plus, Trash2, UserCheck, AlertTriangle, Edit } from 'lucide-react'
import { toast } from 'sonner'

const Users = () => {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [showDelete, setShowDelete] = useState<string | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [newUser, setNewUser] = useState({ email: '', password: '', firstName: '', lastName: '', role: UserRole.BRANCH_MANAGER as string, branchId: '' })

  const [editUser, setEditUser] = useState<any>(null)
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: UserRole.BRANCH_MANAGER as string,
    branchId: 'none',
    newPassword: '',
  })

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await usersApi.getAll()
      return response.data
    },
  })

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await branchesApi.getAll()
      return response.data || []
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      setShowCreate(false)
      setNewUser({ email: '', password: '', firstName: '', lastName: '', role: UserRole.BRANCH_MANAGER, branchId: '' })
      toast.success('User created successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create user')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id, confirmation }: { id: string; confirmation: string }) => usersApi.delete(id, confirmation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      setShowDelete(null)
      setDeleteConfirmation('')
      toast.success('User deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete user')
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) => usersApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      toast.success('User status updated')
    },
  })

  const editCredentialsMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      setEditUser(null)
      toast.success('User updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update user')
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUser.email || !newUser.password || !newUser.firstName || !newUser.lastName || !newUser.role) {
      toast.error('Please fill in all required fields')
      return
    }
    const payload: any = { ...newUser }
    if (!payload.branchId || payload.branchId === 'none') {
      delete payload.branchId
    }
    createMutation.mutate(payload)
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editForm.email || !editForm.firstName || !editForm.lastName) {
      return toast.error('First name, last name, and email are required')
    }

    const updateData: any = {
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      email: editForm.email,
      role: editForm.role,
      branchId: editForm.branchId === 'none' ? null : editForm.branchId,
    }
    if (editForm.newPassword) {
      updateData.password = editForm.newPassword
    }

    editCredentialsMutation.mutate({ id: editUser.id, data: updateData })
  }

  const openEditModal = (user: any) => {
    setEditUser(user)
    const currentBranchId = user.branchId || user.branch?.id || user.managedBranch?.id || 'none'
    setEditForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      role: user.role || UserRole.BRANCH_MANAGER,
      branchId: currentBranchId,
      newPassword: '',
    })
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case UserRole.SUPER_ADMIN: return <Badge variant="destructive">Super Admin</Badge>
      case UserRole.OVERALL_MANAGER: return <Badge variant="default">Manager</Badge>
      case UserRole.BRANCH_MANAGER: return <Badge variant="secondary">Branch Manager</Badge>
      default: return <Badge>{role}</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case UserStatus.ACTIVE: return <Badge variant="success">Active</Badge>
      case UserStatus.INACTIVE: return <Badge variant="secondary">Inactive</Badge>
      case UserStatus.SUSPENDED: return <Badge variant="destructive">Suspended</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage system users, roles, and credentials</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading users...</div>
          ) : users?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No users found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell>
                      {user.branch?.name || user.managedBranch?.name ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-foreground">
                            {user.branch?.name || user.managedBranch?.name}
                          </span>
                          {user.managedBranch && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 text-primary bg-primary/5 font-semibold">
                              Manager
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {user.status === UserStatus.INACTIVE && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Activate User"
                            onClick={() => statusMutation.mutate({ id: user.id, status: UserStatus.ACTIVE })}
                          >
                            <UserCheck className="w-4 h-4 text-green-600" />
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit User & Branch"
                          onClick={() => openEditModal(user)}
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </Button>

                        {user.role !== UserRole.SUPER_ADMIN && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowDelete(user.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Details</DialogTitle>
            <DialogDescription>
              Updating details and branch assignment for <span className="font-bold text-foreground">{editUser?.firstName} {editUser?.lastName}</span>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input 
                  value={editForm.firstName} 
                  onChange={e => setEditForm({...editForm, firstName: e.target.value})} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input 
                  value={editForm.lastName} 
                  onChange={e => setEditForm({...editForm, lastName: e.target.value})} 
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email Address *</Label>
              <Input 
                type="email" 
                value={editForm.email} 
                onChange={e => setEditForm({...editForm, email: e.target.value})} 
                required 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select 
                  value={editForm.role} 
                  onValueChange={v => setEditForm({
                    ...editForm,
                    role: v,
                    branchId: v === UserRole.OVERALL_MANAGER ? 'none' : editForm.branchId
                  })}
                  disabled={editUser?.role === UserRole.SUPER_ADMIN}
                >
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    {editUser?.role === UserRole.SUPER_ADMIN ? (
                      <SelectItem value={UserRole.SUPER_ADMIN}>Super Admin</SelectItem>
                    ) : (
                      <>
                        <SelectItem value={UserRole.OVERALL_MANAGER}>Overall Manager</SelectItem>
                        <SelectItem value={UserRole.BRANCH_MANAGER}>Branch Manager</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assigned Branch</Label>
                <Select 
                  value={editForm.role === UserRole.OVERALL_MANAGER ? 'none' : editForm.branchId} 
                  onValueChange={v => setEditForm({...editForm, branchId: v})}
                  disabled={editUser?.role === UserRole.SUPER_ADMIN || editForm.role === UserRole.OVERALL_MANAGER}
                >
                  <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      {editForm.role === UserRole.OVERALL_MANAGER ? '-- Unassigned (Multi-Branch Manager) --' : '-- Unassigned --'}
                    </SelectItem>
                    {branches.filter((b: any) => b.code !== 'HQ').map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Force Password Reset</Label>
              <Input 
                type="text" 
                placeholder="Leave blank to keep current password..." 
                value={editForm.newPassword} 
                onChange={e => setEditForm({...editForm, newPassword: e.target.value})} 
              />
              <p className="text-[10px] text-muted-foreground pt-1">
                Leave blank if you only want to change details. Overwriting the password will immediately replace their old one.
              </p>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button type="submit" disabled={editCredentialsMutation.isPending}>
                {editCredentialsMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input value={newUser.firstName} onChange={e => setNewUser({...newUser, firstName: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input value={newUser.lastName} onChange={e => setNewUser({...newUser, lastName: e.target.value})} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role *</Label>
                <Select 
                  value={newUser.role} 
                  onValueChange={v => setNewUser({
                    ...newUser,
                    role: v,
                    branchId: v === UserRole.OVERALL_MANAGER ? '' : newUser.branchId
                  })}
                >
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserRole.OVERALL_MANAGER}>Overall Manager</SelectItem>
                    <SelectItem value={UserRole.BRANCH_MANAGER}>Branch Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assigned Branch</Label>
                <Select 
                  value={newUser.role === UserRole.OVERALL_MANAGER ? 'none' : (newUser.branchId || 'none')} 
                  onValueChange={v => setNewUser({...newUser, branchId: v === 'none' ? '' : v})}
                  disabled={newUser.role === UserRole.OVERALL_MANAGER}
                >
                  <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      {newUser.role === UserRole.OVERALL_MANAGER ? '-- Unassigned (Multi-Branch Manager) --' : '-- Unassigned --'}
                    </SelectItem>
                    {branches.filter((b: any) => b.code !== 'HQ').map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>Create User</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!showDelete} onOpenChange={() => { setShowDelete(null); setDeleteConfirmation('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. Please type the confirmation text to proceed.
            </p>
            <div className="space-y-2">
              <Label>Type "delete user [email]" to confirm</Label>
              <Input
                value={deleteConfirmation}
                onChange={e => setDeleteConfirmation(e.target.value)}
                placeholder="delete user email@example.com"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowDelete(null); setDeleteConfirmation('') }}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => showDelete && deleteMutation.mutate({ id: showDelete, confirmation: deleteConfirmation })}
                disabled={deleteMutation.isPending}
              >
                Delete User
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Users
