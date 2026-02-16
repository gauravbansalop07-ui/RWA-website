import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { AlertCircle, CheckCircle, Clock, Plus, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'

type Complaint = {
    id: string
    title: string
    description: string
    status: 'open' | 'in_progress' | 'resolved'
    created_at: string
    updated_at: string
}

const statusConfig = {
    open: { label: 'Open', color: 'bg-red-100 text-red-800 border-red-300', icon: AlertCircle },
    in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
    resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
}

export default function CitizenComplaints() {
    const [complaints, setComplaints] = useState<Complaint[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [newComplaint, setNewComplaint] = useState({ title: '', description: '' })
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        fetchComplaints()

        const setupSubscription = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const channel = supabase
                .channel(`citizen-complaints-${user.id}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'complaints',
                    filter: `user_id=eq.${user.id}`
                }, () => {
                    fetchComplaints()
                })
                .subscribe()

            return channel
        }

        const subscriptionPromise = setupSubscription()

        return () => {
            subscriptionPromise.then(channel => {
                if (channel) supabase.removeChannel(channel)
            })
        }
    }, [])

    const fetchComplaints = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('complaints')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (error) throw error
            setComplaints(data || [])
        } catch (error) {
            console.error('Error fetching complaints:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmitComplaint = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { error } = await supabase
                .from('complaints')
                .insert({
                    user_id: user.id,
                    title: newComplaint.title,
                    description: newComplaint.description,
                    status: 'open',
                })

            if (error) throw error

            setNewComplaint({ title: '', description: '' })
            setIsDialogOpen(false)
            fetchComplaints()
        } catch (error) {
            console.error('Error submitting complaint:', error)
            alert('Failed to submit complaint')
        } finally {
            setSubmitting(false)
        }
    }

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
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-green-900 to-green-700 bg-clip-text text-transparent">
                        My Complaints
                    </h1>
                    <p className="text-muted-foreground mt-1">Track and manage your community complaints</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                            <Plus className="h-4 w-4 mr-2" />
                            New Complaint
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Submit a Complaint</DialogTitle>
                            <DialogDescription>
                                Describe your issue and we'll get back to you soon.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmitComplaint} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    placeholder="Brief description of the issue"
                                    value={newComplaint.title}
                                    onChange={(e) => setNewComplaint({ ...newComplaint, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Provide detailed information about the issue"
                                    value={newComplaint.description}
                                    onChange={(e) => setNewComplaint({ ...newComplaint, description: e.target.value })}
                                    required
                                    rows={5}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? 'Submitting...' : 'Submit Complaint'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-l-4 border-l-slate-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total</p>
                                <p className="text-3xl font-bold">{stats.total}</p>
                            </div>
                            <MessageSquare className="h-8 w-8 text-slate-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Open</p>
                                <p className="text-3xl font-bold text-red-600">{stats.open}</p>
                            </div>
                            <AlertCircle className="h-8 w-8 text-red-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-yellow-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                                <p className="text-3xl font-bold text-yellow-600">{stats.inProgress}</p>
                            </div>
                            <Clock className="h-8 w-8 text-yellow-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Resolved</p>
                                <p className="text-3xl font-bold text-green-600">{stats.resolved}</p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Complaints List */}
            <div className="space-y-4">
                {loading ? (
                    <Card>
                        <CardContent className="py-10 text-center">
                            Loading complaints...
                        </CardContent>
                    </Card>
                ) : complaints.length === 0 ? (
                    <Card>
                        <CardContent className="py-10">
                            <div className="flex flex-col items-center gap-2">
                                <MessageSquare className="h-12 w-12 text-slate-300" />
                                <p className="font-medium text-slate-600">No complaints yet</p>
                                <p className="text-sm text-slate-400">Click "New Complaint" to submit one</p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    complaints.map((complaint) => {
                        const StatusIcon = statusConfig[complaint.status].icon
                        return (
                            <Card key={complaint.id} className="hover:shadow-md transition-shadow">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-xl mb-2">{complaint.title}</CardTitle>
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                <span>Submitted {format(new Date(complaint.created_at), 'PPP')}</span>
                                                {complaint.status !== 'open' && (
                                                    <span>Updated {format(new Date(complaint.updated_at), 'PPP')}</span>
                                                )}
                                            </div>
                                        </div>
                                        <Badge variant="outline" className={`gap-1 ${statusConfig[complaint.status].color}`}>
                                            <StatusIcon className="h-3 w-3" />
                                            {statusConfig[complaint.status].label}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-slate-700 whitespace-pre-wrap">{complaint.description}</p>
                                </CardContent>
                            </Card>
                        )
                    })
                )}
            </div>
        </div>
    )
}
