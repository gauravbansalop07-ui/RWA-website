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
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import {
    AlertCircle,
    CheckCircle,
    Clock,
    MessageSquare,
    User,
    ExternalLink,
    Filter
} from 'lucide-react'
import { format } from 'date-fns'

type Complaint = {
    id: string
    user_id: string
    title: string
    description: string
    image_url: string | null
    status: 'open' | 'in_progress' | 'resolved'
    assigned_to: string | null
    created_at: string
    updated_at: string
    profiles: {
        full_name: string
        flat_number: string
    }
    assigned_profile?: {
        full_name: string
    } | null
}

const statusConfig = {
    open: { label: 'Open', color: 'bg-red-100 text-red-800 border-red-300', icon: AlertCircle },
    in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Clock },
    resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
}

export default function Complaints() {
    const [complaints, setComplaints] = useState<Complaint[]>([])
    const [admins, setAdmins] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
    const [detailsOpen, setDetailsOpen] = useState(false)
    const [activeTab, setActiveTab] = useState('all')

    useEffect(() => {
        fetchComplaints()
        fetchAdmins()

        const channel = supabase
            .channel('complaints-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => {
                fetchComplaints()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const fetchComplaints = async () => {
        try {
            const { data, error } = await supabase
                .from('complaints')
                .select(`
                    *,
                    profiles!user_id (full_name, flat_number),
                    assigned_profile:profiles!assigned_to (full_name)
                `)
                .order('created_at', { ascending: false })

            if (error) throw error
            setComplaints(data || [])
        } catch (error) {
            console.error('Error fetching complaints:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchAdmins = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .in('role', ['super_admin', 'treasurer', 'collector'])
        setAdmins(data || [])
    }

    const handleUpdateComplaint = async (complaintId: string, updates: any) => {
        try {
            const { error } = await supabase
                .from('complaints')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', complaintId)

            if (error) throw error
            fetchComplaints()
            // Update selected complaint for the UI
            if (selectedComplaint && selectedComplaint.id === complaintId) {
                const refreshed = complaints.find(c => c.id === complaintId)
                if (refreshed) setSelectedComplaint({ ...refreshed, ...updates })
            }
        } catch (error) {
            console.error('Error updating complaint:', error)
        }
    }

    const filteredComplaints = complaints.filter(complaint => {
        if (activeTab === 'all') return true
        return complaint.status === activeTab
    })

    const stats = {
        total: complaints.length,
        open: complaints.filter(c => c.status === 'open').length,
        inProgress: complaints.filter(c => c.status === 'in_progress').length,
        resolved: complaints.filter(c => c.status === 'resolved').length,
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                        Complaints Portal
                    </h1>
                    <p className="text-muted-foreground mt-1">Review, assign and resolve resident issues</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-sm border-l-4 border-l-slate-400">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
                        <MessageSquare className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-l-4 border-l-red-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Open</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.open}</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-l-4 border-l-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                        <Clock className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-l-4 border-l-green-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <div className="flex items-center justify-between">
                    <TabsList className="bg-white border shadow-sm">
                        <TabsTrigger value="all">All Records</TabsTrigger>
                        <TabsTrigger value="open" className="text-red-600 data-[state=active]:bg-red-50">Open</TabsTrigger>
                        <TabsTrigger value="in_progress" className="text-blue-600 data-[state=active]:bg-blue-50">Active</TabsTrigger>
                        <TabsTrigger value="resolved" className="text-green-600 data-[state=active]:bg-green-50">Resolved</TabsTrigger>
                    </TabsList>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Filter className="h-4 w-4" />
                        Showing {filteredComplaints.length} tickets
                    </div>
                </div>

                <Card className="shadow-sm border-slate-200 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50">
                                <TableHead>Date</TableHead>
                                <TableHead>Resident & Flat</TableHead>
                                <TableHead>Complaint Title</TableHead>
                                <TableHead>Assigned To</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-20">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                                        Fetching tickets...
                                    </TableCell>
                                </TableRow>
                            ) : filteredComplaints.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-20 text-slate-500">
                                        No complaints found in this category.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredComplaints.map((complaint) => {
                                    const StatusIcon = statusConfig[complaint.status].icon
                                    return (
                                        <TableRow key={complaint.id} className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="text-xs font-medium text-slate-500">
                                                {format(new Date(complaint.created_at), 'dd MMM yyyy')}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-900">{complaint.profiles?.full_name}</span>
                                                    <span className="text-xs text-slate-500">Flat: {complaint.profiles?.flat_number}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate font-medium">
                                                {complaint.title}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-normal">
                                                    <User className="h-3 w-3 mr-1" />
                                                    {complaint.assigned_profile?.full_name || 'Unassigned'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`gap-1 ${statusConfig[complaint.status].color}`}>
                                                    <StatusIcon className="h-3 w-3" />
                                                    {statusConfig[complaint.status].label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="hover:bg-blue-50 hover:text-blue-600"
                                                    onClick={() => {
                                                        setSelectedComplaint(complaint)
                                                        setDetailsOpen(true)
                                                    }}
                                                >
                                                    Manage
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </Tabs>

            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">Manage Complaint</DialogTitle>
                    </DialogHeader>
                    {selectedComplaint && (
                        <div className="space-y-6 py-4">
                            <div className="flex items-start justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="space-y-1">
                                    <h3 className="font-bold text-lg text-slate-900">{selectedComplaint.title}</h3>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        <Badge variant="outline" className="bg-white">{selectedComplaint.profiles?.flat_number}</Badge>
                                        <Badge variant="outline" className="bg-white">{selectedComplaint.profiles?.full_name}</Badge>
                                    </div>
                                </div>
                                <Badge className={statusConfig[selectedComplaint.status].color}>
                                    {statusConfig[selectedComplaint.status].label}
                                </Badge>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <Label className="text-xs uppercase text-slate-500 font-bold tracking-wider">Issue Description</Label>
                                    <p className="text-slate-700 bg-white p-3 rounded-lg border text-sm leading-relaxed">
                                        {selectedComplaint.description || 'No detailed description provided.'}
                                    </p>
                                </div>

                                {selectedComplaint.image_url && (
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase text-slate-500 font-bold tracking-wider">Attached Proof</Label>
                                        <div className="relative group rounded-lg overflow-hidden border">
                                            <img
                                                src={selectedComplaint.image_url}
                                                alt="Complaint proof"
                                                className="w-full h-auto max-h-[300px] object-cover"
                                            />
                                            <a
                                                href={selectedComplaint.image_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Button variant="secondary" size="sm" className="gap-2">
                                                    <ExternalLink className="h-4 w-4" /> View Full Image
                                                </Button>
                                            </a>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-600">Change Status</Label>
                                        <Select
                                            value={selectedComplaint.status}
                                            onValueChange={(val) => handleUpdateComplaint(selectedComplaint.id, { status: val })}
                                        >
                                            <SelectTrigger className="bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="open">Open</SelectItem>
                                                <SelectItem value="in_progress">In Progress</SelectItem>
                                                <SelectItem value="resolved">Resolved</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-600">Assign To</Label>
                                        <Select
                                            value={selectedComplaint.assigned_to || 'unassigned'}
                                            onValueChange={(val) => handleUpdateComplaint(selectedComplaint.id, { assigned_to: val === 'unassigned' ? null : val })}
                                        >
                                            <SelectTrigger className="bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                                {admins.map(admin => (
                                                    <SelectItem key={admin.id} value={admin.id}>{admin.full_name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-6">
                        <Button className="w-full" onClick={() => setDetailsOpen(false)}>Finished Review</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
