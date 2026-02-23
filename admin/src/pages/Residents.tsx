import { useEffect, useState } from 'react'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import {
    MoreHorizontal, Search, Users as UsersIcon, Eye, Phone, Mail,
    Home, Car, Calendar, Shield, CheckCircle, XCircle, Clock, Layers
} from 'lucide-react'
import { format } from 'date-fns'

type Profile = {
    id: string
    email: string | null
    full_name: string
    flat_number: string
    floor_number: number | null
    composite_flat_id: string | null
    mobile: string
    role: string
    approval_status: string
    created_at: string
    vehicle_count: number
    vehicle_numbers: string[]
}

type Notification = { type: 'success' | 'error'; message: string } | null

// Flat display helper
const flatLabel = (p: Profile) =>
    p.floor_number ? `Floor ${p.floor_number} – Flat ${p.flat_number || '?'}` : (p.flat_number || 'TBD')

// Approval status config
const approvalConfig: Record<string, { label: string; color: string; icon: any }> = {
    approved: { label: 'Approved', color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
    pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Clock },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800 border-red-300', icon: XCircle },
}

export default function Residents() {
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [activeTab, setActiveTab] = useState('all')
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
    const [editOpen, setEditOpen] = useState(false)
    const [viewOpen, setViewOpen] = useState(false)
    const [notification, setNotification] = useState<Notification>(null)
    const [approvingId, setApprovingId] = useState<string | null>(null)

    const showNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message })
        setTimeout(() => setNotification(null), 5000)
    }

    const [formData, setFormData] = useState({
        email: '', fullName: '', flatNumber: '', floorNumber: '',
        mobile: '', vehicleCount: '0', vehicleNumbers: ['']
    })

    useEffect(() => {
        fetchProfiles()
        const channel = supabase
            .channel('residents-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchProfiles())
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [])

    const fetchProfiles = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false })
            if (error) throw error
            setProfiles(data || [])
        } catch (error) {
            console.error('Error fetching profiles:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleApproval = async (profileId: string, newStatus: 'approved' | 'rejected') => {
        setApprovingId(profileId)
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ approval_status: newStatus })
                .eq('id', profileId)
            if (error) throw error
            const p = profiles.find(p => p.id === profileId)
            showNotification('success', `✓ ${p?.full_name || 'Resident'} has been ${newStatus}`)
            fetchProfiles()
            if (viewOpen && selectedProfile?.id === profileId) {
                setSelectedProfile(prev => prev ? { ...prev, approval_status: newStatus } : prev)
            }
        } catch (err: any) {
            showNotification('error', err.message || 'Failed to update approval')
        } finally {
            setApprovingId(null)
        }
    }

    const handleEditClick = (profile: Profile) => {
        setSelectedProfile(profile)
        setFormData({
            email: profile.email || '',
            fullName: profile.full_name || '',
            flatNumber: profile.flat_number || '',
            floorNumber: profile.floor_number?.toString() || '',
            mobile: profile.mobile || '',
            vehicleCount: (profile.vehicle_count || 0).toString(),
            vehicleNumbers: profile.vehicle_numbers || ['']
        })
        setEditOpen(true)
    }

    const handleSave = async () => {
        if (!selectedProfile) return
        try {
            const floor = formData.floorNumber ? parseInt(formData.floorNumber) : null
            const flat = formData.flatNumber.trim()
            const compositeId = floor && flat ? `${floor}-${flat}` : null

            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.fullName,
                    flat_number: flat || null,
                    floor_number: floor,
                    composite_flat_id: compositeId,
                    mobile: formData.mobile,
                    vehicle_count: parseInt(formData.vehicleCount) || 0,
                    vehicle_numbers: formData.vehicleNumbers.filter(n => n.trim() !== ''),
                    email: formData.email || null,
                })
                .eq('id', selectedProfile.id)
            if (error) throw error
            setEditOpen(false)
            fetchProfiles()
            showNotification('success', '✓ Profile updated successfully')
        } catch (error: any) {
            showNotification('error', error.message || 'Failed to save profile')
        }
    }

    const pendingCount = profiles.filter(p => p.approval_status === 'pending').length

    const filteredProfiles = profiles.filter(p => {
        const matchesSearch =
            (p.full_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (p.flat_number?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (p.mobile || '').includes(search) ||
            (p.email?.toLowerCase() || '').includes(search.toLowerCase())
        const matchesTab =
            activeTab === 'all' ? true :
                activeTab === 'pending' ? p.approval_status === 'pending' :
                    activeTab === 'approved' ? (p.approval_status === 'approved' && p.role === 'resident') :
                        activeTab === 'admin' ? p.role !== 'resident' : true
        return matchesSearch && matchesTab
    })

    return (
        <div className="space-y-6">
            {notification && (
                <div className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium shadow-sm border ${notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                    <span>{notification.message}</span>
                    <button onClick={() => setNotification(null)} className="ml-4 opacity-60 hover:opacity-100 text-lg">×</button>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                        Residents Directory
                    </h1>
                    <p className="text-muted-foreground mt-1">Manage resident profiles and approval status</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Residents', value: profiles.filter(p => p.role === 'resident').length, color: 'border-l-blue-500', icon: UsersIcon, iconColor: 'text-blue-600', bg: 'bg-blue-100' },
                    { label: 'Pending Approval', value: pendingCount, color: 'border-l-amber-500', icon: Clock, iconColor: 'text-amber-600', bg: 'bg-amber-100' },
                    { label: 'Admins/Staff', value: profiles.filter(p => p.role !== 'resident').length, color: 'border-l-green-500', icon: Shield, iconColor: 'text-green-600', bg: 'bg-green-100' },
                    { label: 'Total Vehicles', value: profiles.reduce((s, p) => s + (p.vehicle_count || 0), 0), color: 'border-l-purple-500', icon: Car, iconColor: 'text-purple-600', bg: 'bg-purple-100' },
                ].map(({ label, value, color, icon: Icon, iconColor, bg }) => (
                    <Card key={label} className={`border-l-4 ${color} shadow-sm`}>
                        <CardContent className="flex items-center gap-4 p-5">
                            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${bg}`}>
                                <Icon className={`h-5 w-5 ${iconColor}`} />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                                <p className="text-2xl font-bold">{value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Tabs + Search */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                    <TabsList className="bg-white border shadow-sm h-10 px-1">
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="pending" className="gap-1.5 text-amber-600">
                            Pending
                            {pendingCount > 0 && (
                                <span className="h-4 w-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                                    {pendingCount}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="approved" className="text-green-700">Approved</TabsTrigger>
                        <TabsTrigger value="admin" className="text-blue-700">Admins</TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2 bg-white border rounded-lg px-2 py-1 shadow-sm w-full sm:w-72">
                        <Search className="h-4 w-4 text-slate-400 shrink-0" />
                        <Input
                            placeholder="Search name, flat, phone..."
                            value={search} onChange={e => setSearch(e.target.value)}
                            className="border-none shadow-none focus-visible:ring-0 h-7 text-sm p-0"
                        />
                    </div>
                </div>

                {/* Table */}
                <Card className="shadow-sm overflow-hidden border-slate-200 mt-3">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50">
                                <TableHead>Resident</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-20">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                </TableCell></TableRow>
                            ) : filteredProfiles.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-20 text-slate-400">
                                    No residents found
                                </TableCell></TableRow>
                            ) : filteredProfiles.map(profile => {
                                const aC = approvalConfig[profile.approval_status] || approvalConfig.approved
                                const AIcon = aC.icon
                                const isPending = profile.approval_status === 'pending'

                                return (
                                    <TableRow key={profile.id}
                                        className={`hover:bg-slate-50/50 transition-colors group ${isPending ? 'bg-amber-50/30' : ''}`}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${isPending ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {profile.full_name?.charAt(0) || 'U'}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900 text-sm">{profile.full_name || 'Unknown'}</p>
                                                    {profile.email && <p className="text-[10px] text-slate-400">{profile.email}</p>}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <Home className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                <span className="text-sm font-semibold text-slate-700">{flatLabel(profile)}</span>
                                            </div>
                                            {profile.composite_flat_id && (
                                                <p className="text-[10px] font-mono text-slate-400 ml-5">{profile.composite_flat_id}</p>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-600">
                                            {profile.mobile || <span className="text-slate-300">—</span>}
                                        </TableCell>
                                        <TableCell>
                                            {profile.role !== 'resident' ? (
                                                <Badge className="bg-indigo-100 text-indigo-700 text-xs capitalize">
                                                    {profile.role.replace('_', ' ')}
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className={`gap-1 text-xs ${aC.color}`}>
                                                    <AIcon className="h-3 w-3" />
                                                    {aC.label}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-400">
                                            {profile.created_at ? format(new Date(profile.created_at), 'dd MMM yyyy') : '—'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {/* Quick approve/reject for pending */}
                                                {isPending && (
                                                    <>
                                                        <Button size="sm"
                                                            onClick={() => handleApproval(profile.id, 'approved')}
                                                            disabled={approvingId === profile.id}
                                                            className="h-7 px-2.5 text-xs bg-green-600 hover:bg-green-700 gap-1">
                                                            <CheckCircle className="h-3 w-3" /> Approve
                                                        </Button>
                                                        <Button size="sm" variant="outline"
                                                            onClick={() => handleApproval(profile.id, 'rejected')}
                                                            disabled={approvingId === profile.id}
                                                            className="h-7 px-2.5 text-xs text-red-600 border-red-200 hover:bg-red-50 gap-1">
                                                            <XCircle className="h-3 w-3" /> Reject
                                                        </Button>
                                                    </>
                                                )}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => { setSelectedProfile(profile); setViewOpen(true) }} className="gap-2">
                                                            <Eye className="h-4 w-4" /> View Profile
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleEditClick(profile)} className="gap-2">
                                                            <Shield className="h-4 w-4 text-blue-600" /> Edit Profile
                                                        </DropdownMenuItem>
                                                        {profile.approval_status !== 'approved' && (
                                                            <DropdownMenuItem onClick={() => handleApproval(profile.id, 'approved')} className="gap-2 text-green-700">
                                                                <CheckCircle className="h-4 w-4" /> Approve
                                                            </DropdownMenuItem>
                                                        )}
                                                        {profile.approval_status !== 'rejected' && (
                                                            <DropdownMenuItem onClick={() => handleApproval(profile.id, 'rejected')} className="gap-2 text-red-600">
                                                                <XCircle className="h-4 w-4" /> Reject
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </Card>
            </Tabs>

            {/* ── View Profile Dialog ──────────────────────────────────────────── */}
            <Dialog open={viewOpen} onOpenChange={setViewOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Resident Profile</DialogTitle>
                        <DialogDescription>{selectedProfile?.full_name}</DialogDescription>
                    </DialogHeader>
                    {selectedProfile && (() => {
                        const aC = approvalConfig[selectedProfile.approval_status] || approvalConfig.approved
                        const AIcon = aC.icon
                        return (
                            <div className="grid gap-5 py-2">
                                {/* Identity card */}
                                <div className="flex items-center gap-5 p-4 bg-slate-50 rounded-xl border">
                                    <div className="h-16 w-16 rounded-2xl bg-white shadow flex items-center justify-center text-2xl font-bold text-blue-600 border">
                                        {selectedProfile.full_name?.charAt(0)}
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-bold text-slate-900">{selectedProfile.full_name}</h3>
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-blue-600 text-xs">{selectedProfile.role}</Badge>
                                            <Badge variant="outline" className={`gap-1 text-xs ${aC.color}`}>
                                                <AIcon className="h-3 w-3" />{aC.label}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-slate-400 flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            Member since {format(new Date(selectedProfile.created_at), 'MMMM yyyy')}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold uppercase text-slate-500 tracking-wider">Location</p>
                                        <div className="flex items-center gap-2"><Home className="h-4 w-4 text-slate-400" />{flatLabel(selectedProfile)}</div>
                                        {selectedProfile.composite_flat_id && (
                                            <p className="text-xs font-mono text-slate-400 ml-6">ID: {selectedProfile.composite_flat_id}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold uppercase text-slate-500 tracking-wider">Contact</p>
                                        <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" />{selectedProfile.mobile || '—'}</div>
                                        {selectedProfile.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" />{selectedProfile.email}</div>}
                                    </div>
                                </div>

                                {/* Vehicles */}
                                <div className="space-y-2">
                                    <p className="text-xs font-bold uppercase text-slate-500 tracking-wider">Vehicles ({selectedProfile.vehicle_count || 0})</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedProfile.vehicle_numbers?.length > 0
                                            ? selectedProfile.vehicle_numbers.map(n => (
                                                <Badge key={n} variant="secondary" className="font-mono text-[10px] uppercase">{n}</Badge>
                                            ))
                                            : <span className="text-xs text-slate-400">No vehicles registered</span>}
                                    </div>
                                </div>

                                {/* Approval actions for pending */}
                                {selectedProfile.approval_status === 'pending' && (
                                    <div className="flex gap-3 pt-2 border-t">
                                        <Button onClick={() => handleApproval(selectedProfile.id, 'approved')}
                                            className="flex-1 bg-green-600 hover:bg-green-700 gap-2">
                                            <CheckCircle className="h-4 w-4" /> Approve Resident
                                        </Button>
                                        <Button variant="outline" onClick={() => handleApproval(selectedProfile.id, 'rejected')}
                                            className="flex-1 text-red-600 border-red-200 hover:bg-red-50 gap-2">
                                            <XCircle className="h-4 w-4" /> Reject
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )
                    })()}
                    <DialogFooter>
                        <Button className="w-full" variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Edit Dialog ──────────────────────────────────────────────────── */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Edit Resident Profile</DialogTitle>
                        <DialogDescription>Update the details for {selectedProfile?.full_name}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Full Name</Label>
                                <Input value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} placeholder="Full Name" />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Phone</Label>
                                <Input value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })} placeholder="Mobile" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="flex items-center gap-1"><Layers className="h-3 w-3" /> Floor No.</Label>
                                <Input type="number" value={formData.floorNumber} onChange={e => setFormData({ ...formData, floorNumber: e.target.value })} placeholder="e.g. 3" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="flex items-center gap-1"><Home className="h-3 w-3" /> Flat No.</Label>
                                <Input value={formData.flatNumber} onChange={e => setFormData({ ...formData, flatNumber: e.target.value })} placeholder="e.g. 12" />
                            </div>
                        </div>
                        {formData.floorNumber && formData.flatNumber && (
                            <p className="text-xs text-blue-600 font-medium">
                                Composite ID will be: <code className="bg-blue-50 px-1 rounded">{formData.floorNumber}-{formData.flatNumber}</code>
                            </p>
                        )}
                        <div className="space-y-1.5">
                            <Label>Email (optional)</Label>
                            <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" />
                        </div>
                        <div className="space-y-2 bg-slate-50 p-3 rounded-lg border">
                            <Label className="flex items-center justify-between text-sm">
                                Vehicles
                                <Input type="number" className="w-16 h-7 text-xs" value={formData.vehicleCount}
                                    onChange={e => {
                                        const n = parseInt(e.target.value) || 0
                                        const nums = [...formData.vehicleNumbers]
                                        while (nums.length < n) nums.push('')
                                        setFormData({ ...formData, vehicleCount: e.target.value, vehicleNumbers: nums.slice(0, n) })
                                    }} />
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                                {formData.vehicleNumbers.map((num, idx) => (
                                    <Input key={idx} className="h-8 text-xs uppercase font-mono" placeholder={`Reg #${idx + 1}`} value={num}
                                        onChange={e => {
                                            const nums = [...formData.vehicleNumbers]
                                            nums[idx] = e.target.value.toUpperCase()
                                            setFormData({ ...formData, vehicleNumbers: nums })
                                        }} />
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
