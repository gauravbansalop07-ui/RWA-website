import { useEffect, useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import {
    MoreHorizontal,
    Search,
    UserPlus,
    Users as UsersIcon,
    Eye,
    Phone,
    Mail,
    Home,
    Car,
    Calendar,
    Shield
} from 'lucide-react'
import { format } from 'date-fns'

type Profile = {
    id: string
    email: string
    full_name: string
    flat_number: string
    mobile: string
    role: string
    created_at: string
    vehicle_count: number
    vehicle_numbers: string[]
}

export default function Residents() {
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
    const [editOpen, setEditOpen] = useState(false)
    const [viewOpen, setViewOpen] = useState(false)
    const [addOpen, setAddOpen] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        email: '',
        fullName: '',
        flatNumber: '',
        mobile: '',
        vehicleCount: '0',
        vehicleNumbers: ['']
    })

    useEffect(() => {
        fetchProfiles()

        const channel = supabase
            .channel('residents-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
                fetchProfiles()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
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

    const handleEditClick = (profile: Profile) => {
        setSelectedProfile(profile)
        setFormData({
            email: profile.email || '',
            fullName: profile.full_name || '',
            flatNumber: profile.flat_number || '',
            mobile: profile.mobile || '',
            vehicleCount: (profile.vehicle_count || 0).toString(),
            vehicleNumbers: profile.vehicle_numbers || ['']
        })
        setEditOpen(true)
    }

    const handleViewClick = (profile: Profile) => {
        setSelectedProfile(profile)
        setViewOpen(true)
    }

    const handleAddClick = () => {
        setFormData({
            email: '',
            fullName: '',
            flatNumber: '',
            mobile: '',
            vehicleCount: '0',
            vehicleNumbers: ['']
        })
        setAddOpen(true)
    }

    const handleSave = async (isNew = false) => {
        try {
            const profileData = {
                full_name: formData.fullName,
                flat_number: formData.flatNumber,
                mobile: formData.mobile,
                vehicle_count: parseInt(formData.vehicleCount) || 0,
                vehicle_numbers: formData.vehicleNumbers.filter(n => n.trim() !== ''),
                email: formData.email
            }

            if (isNew) {
                // For manual adding, we usually need auth.signup, 
                // but for this MVP we'll just insert into profiles if it exists in auth
                // or assume user will sign up later. Ideally admin creates auth user.
                alert("Manual adding requires Auth integration. For now, users should sign up themselves.")
                return
            } else {
                if (!selectedProfile) return
                const { error } = await supabase
                    .from('profiles')
                    .update(profileData)
                    .eq('id', selectedProfile.id)
                if (error) throw error
            }

            setEditOpen(false)
            setAddOpen(false)
            fetchProfiles()
        } catch (error: any) {
            console.error('Error saving profile:', error)
            alert(error.message || 'Failed to save profile')
        }
    }

    const filteredProfiles = profiles.filter(profile =>
        (profile.full_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (profile.flat_number?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (profile.email?.toLowerCase() || '').includes(search.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                        Residents Directory
                    </h1>
                    <p className="text-muted-foreground mt-1">Manage resident profiles and community access</p>
                </div>
                <Button onClick={handleAddClick} className="gap-2 bg-blue-600 hover:bg-blue-700">
                    <UserPlus className="h-4 w-4" />
                    Add Resident
                </Button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardContent className="flex items-center gap-4 p-6">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                            <UsersIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Residents</p>
                            <p className="text-2xl font-bold">{profiles.length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500 shadow-sm">
                    <CardContent className="flex items-center gap-4 p-6">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
                            <Shield className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Admins/Collectors</p>
                            <p className="text-2xl font-bold">{profiles.filter(p => p.role !== 'resident').length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-purple-500 shadow-sm">
                    <CardContent className="flex items-center gap-4 p-6">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
                            <Car className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Vehicles</p>
                            <p className="text-2xl font-bold">
                                {profiles.reduce((sum, p) => sum + (p.vehicle_count || 0), 0)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search & Filter */}
            <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm max-w-sm">
                <Search className="h-4 w-4 text-slate-400 ml-2" />
                <Input
                    placeholder="Search name, flat, or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border-none shadow-none focus-visible:ring-0"
                />
            </div>

            {/* Table */}
            <Card className="shadow-sm overflow-hidden border-slate-200">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/50">
                            <TableHead className="w-[150px]">Joined Date</TableHead>
                            <TableHead>Resident Name</TableHead>
                            <TableHead>Flat No.</TableHead>
                            <TableHead className="hidden lg:table-cell">Contact Info</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-20">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                        <p className="text-slate-500">Loading residents...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredProfiles.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-20">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center">
                                            <UsersIcon className="h-8 w-8 text-slate-300" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-semibold text-slate-900">No residents found</p>
                                            <p className="text-sm text-slate-500">Try adjusting your search filters</p>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredProfiles.map((profile) => (
                                <TableRow key={profile.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <TableCell className="text-sm font-medium text-slate-500">
                                        {profile.created_at ? format(new Date(profile.created_at), 'dd MMM yyyy') : 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                                                {profile.full_name?.charAt(0) || 'U'}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-900">{profile.full_name || 'Anonymous User'}</span>
                                                <span className="text-xs text-slate-500 hidden sm:block">{profile.email}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-blue-50/50 text-blue-700 border-blue-100 font-mono">
                                            {profile.flat_number || 'TBD'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell">
                                        <div className="flex flex-col gap-1 text-xs text-slate-600">
                                            <div className="flex items-center gap-1.5">
                                                <Phone className="h-3 w-3" /> {profile.mobile || 'No Phone'}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Car className="h-3 w-3" /> {profile.vehicle_count || 0} Vehicles
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            className={`capitalize ${profile.role === 'resident'
                                                ? 'bg-slate-100 text-slate-700'
                                                : 'bg-indigo-100 text-indigo-700'
                                                } hover:bg-opacity-80`}
                                        >
                                            {profile.role.replace('_', ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => handleViewClick(profile)} className="gap-2">
                                                    <Eye className="h-4 w-4" /> View Full Profile
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleEditClick(profile)} className="gap-2">
                                                    <Shield className="h-4 w-4 text-blue-600" /> Edit Basic Info
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* View Profile Dialog */}
            <Dialog open={viewOpen} onOpenChange={setViewOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">Resident Profile</DialogTitle>
                        <DialogDescription>Detailed information for {selectedProfile?.full_name}</DialogDescription>
                    </DialogHeader>
                    {selectedProfile && (
                        <div className="grid gap-6 py-4">
                            <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="h-20 w-20 rounded-2xl bg-white shadow-sm flex items-center justify-center text-3xl font-bold text-blue-600 border border-slate-200">
                                    {selectedProfile.full_name?.charAt(0)}
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold text-slate-900">{selectedProfile.full_name}</h3>
                                    <Badge className="bg-blue-600">{selectedProfile.role}</Badge>
                                    <p className="text-xs text-slate-500 flex items-center gap-1 py-1">
                                        <Calendar className="h-3 w-3" /> Member since {format(new Date(selectedProfile.created_at), 'MMMM yyyy')}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <h4 className="text-sm font-semibold uppercase text-slate-500 tracking-wider">Contact Details</h4>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3 text-sm">
                                            <Mail className="h-4 w-4 text-slate-400" />
                                            <span>{selectedProfile.email}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <Phone className="h-4 w-4 text-slate-400" />
                                            <span>{selectedProfile.mobile || 'Not provided'}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <Home className="h-4 w-4 text-slate-400" />
                                            <span>Flat: <span className="font-semibold">{selectedProfile.flat_number || 'Not assigned'}</span></span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-sm font-semibold uppercase text-slate-500 tracking-wider">Vehicle Details</h4>
                                    <div className="p-3 bg-slate-50 rounded-lg space-y-2 border border-slate-100">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-600">Total Count</span>
                                            <span className="font-bold">{selectedProfile.vehicle_count || 0}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {selectedProfile.vehicle_numbers?.length > 0 ? (
                                                selectedProfile.vehicle_numbers.map(num => (
                                                    <Badge key={num} variant="secondary" className="font-mono text-[10px] uppercase">
                                                        {num}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-xs text-slate-400">No vehicles registered</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button className="w-full" onClick={() => setViewOpen(false)}>Close Window</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit/Add Dialog */}
            <Dialog open={editOpen || addOpen} onOpenChange={(open) => { setEditOpen(open); setAddOpen(open); }}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{addOpen ? 'Add New Resident' : 'Edit Resident Profile'}</DialogTitle>
                        <DialogDescription>
                            Complete the fields below to {addOpen ? 'create' : 'update'} the profile.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    disabled={!addOpen}
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="john@example.com"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="flat">Flat Number</Label>
                                <Input
                                    id="flat"
                                    value={formData.flatNumber}
                                    onChange={(e) => setFormData({ ...formData, flatNumber: e.target.value })}
                                    placeholder="A-101"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mobile">Mobile Number</Label>
                                <Input
                                    id="mobile"
                                    value={formData.mobile}
                                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                                    placeholder="9876543210"
                                />
                            </div>
                        </div>
                        <div className="space-y-3 bg-slate-50 p-3 rounded-lg border">
                            <Label className="flex items-center justify-between">
                                Registered Vehicles
                                <Input
                                    type="number"
                                    className="w-20 h-8"
                                    value={formData.vehicleCount}
                                    onChange={(e) => {
                                        const count = parseInt(e.target.value) || 0
                                        const nums = [...formData.vehicleNumbers]
                                        while (nums.length < count) nums.push('')
                                        nums.length = count
                                        setFormData({ ...formData, vehicleCount: e.target.value, vehicleNumbers: nums })
                                    }}
                                />
                            </Label>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                {formData.vehicleNumbers.map((num, idx) => (
                                    <Input
                                        key={idx}
                                        placeholder={`Reg # ${idx + 1}`}
                                        className="h-8 text-xs uppercase font-mono"
                                        value={num}
                                        onChange={(e) => {
                                            const nums = [...formData.vehicleNumbers]
                                            nums[idx] = e.target.value.toUpperCase()
                                            setFormData({ ...formData, vehicleNumbers: nums })
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setEditOpen(false); setAddOpen(false); }}>
                            Cancel
                        </Button>
                        <Button onClick={() => handleSave(addOpen)} className="bg-blue-600 hover:bg-blue-700">
                            {addOpen ? 'Create Account' : 'Update Profile'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
