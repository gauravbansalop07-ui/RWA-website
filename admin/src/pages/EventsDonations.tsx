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
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import {
    Calendar,
    Plus,
    Heart,
    Users,
    MapPin,
    Clock,
    ChevronRight,
    Loader2
} from 'lucide-react'
import { format } from 'date-fns'

type Event = {
    id: string
    title: string
    description: string | null
    event_date: string
    location: string | null
    created_at: string
}

type Donation = {
    id: string
    event_id: string | null
    user_id: string
    amount: number
    message: string | null
    created_at: string
    profiles: {
        full_name: string
        flat_number: string
    }
    events: {
        title: string
    } | null
}

export default function EventsDonations() {
    const [events, setEvents] = useState<Event[]>([])
    const [donations, setDonations] = useState<Donation[]>([])
    const [loading, setLoading] = useState(true)
    const [addEventOpen, setAddEventOpen] = useState(false)

    // Form State
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [date, setDate] = useState('')
    const [location, setLocation] = useState('')

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const [eventsRes, donationsRes] = await Promise.all([
                supabase.from('events').select('*').order('event_date', { ascending: true }),
                supabase.from('donations').select('*, profiles(full_name, flat_number), events(title)').order('created_at', { ascending: false })
            ])
            setEvents(eventsRes.data || [])
            setDonations(donationsRes.data || [])
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAddEvent = async () => {
        try {
            const { error } = await supabase
                .from('events')
                .insert({
                    title,
                    description,
                    event_date: date,
                    location
                })

            if (error) throw error
            setAddEventOpen(false)
            resetForm()
            fetchData()
        } catch (error: any) {
            alert(error.message)
        }
    }

    const resetForm = () => {
        setTitle('')
        setDescription('')
        setDate('')
        setLocation('')
    }

    const stats = {
        totalDonations: donations.reduce((sum, d) => sum + Number(d.amount), 0),
        upcomingEvents: events.filter(e => new Date(e.event_date) >= new Date()).length,
        donorsCount: new Set(donations.map(d => d.user_id)).size
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent">
                        Events & Donations
                    </h1>
                    <p className="text-muted-foreground mt-1">Organize community gatherings and manage contributions</p>
                </div>
                <Button onClick={() => setAddEventOpen(true)} className="gap-2 bg-rose-600 hover:bg-rose-700">
                    <Plus className="h-4 w-4" />
                    Plan New Event
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-gradient-to-br from-rose-50 to-transparent border-rose-100">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-200">
                                <Heart className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-rose-600 uppercase tracking-wider">Total Contributions</p>
                                <p className="text-2xl font-bold text-slate-900">₹{stats.totalDonations.toLocaleString()}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-50 to-transparent border-blue-100">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                                <Calendar className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-blue-600 uppercase tracking-wider">Upcoming Events</p>
                                <p className="text-2xl font-bold text-slate-900">{stats.upcomingEvents}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-orange-50 to-transparent border-orange-100">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-200">
                                <Users className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-orange-600 uppercase tracking-wider">Community Donors</p>
                                <p className="text-2xl font-bold text-slate-900">{stats.donorsCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="events" className="space-y-6">
                <TabsList className="bg-white border p-1 h-12">
                    <TabsTrigger value="events" className="px-6 h-10 data-[state=active]:bg-rose-50 data-[state=active]:text-rose-600">
                        Community Events
                    </TabsTrigger>
                    <TabsTrigger value="donations" className="px-6 h-10 data-[state=active]:bg-rose-50 data-[state=active]:text-rose-600">
                        Donation Ledger
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="events" className="space-y-6">
                    {loading ? (
                        <div className="py-20 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-rose-600" /></div>
                    ) : events.length === 0 ? (
                        <div className="border-dashed border-2 py-20 text-center rounded-xl">
                            <p className="text-slate-500">No events scheduled. Time to plan something fun!</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {events.map(event => (
                                <Card key={event.id} className="group hover:shadow-xl transition-all border-slate-200 overflow-hidden">
                                    <div className="h-2 bg-rose-600" />
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <Badge variant="secondary" className="bg-rose-50 text-rose-700 hover:bg-rose-50 border-rose-100">
                                                {format(new Date(event.event_date), 'dd MMM yyyy')}
                                            </Badge>
                                            {new Date(event.event_date) < new Date() && (
                                                <Badge variant="outline">Past Event</Badge>
                                            )}
                                        </div>
                                        <CardTitle className="mt-4 text-xl group-hover:text-rose-600 transition-colors uppercase tracking-tight">
                                            {event.title}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                                                <MapPin className="h-4 w-4 text-rose-500" />
                                                {event.location || 'Society Premises'}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                                                <Clock className="h-4 w-4 text-rose-500" />
                                                {format(new Date(event.event_date), 'hh:mm a')}
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed italic">
                                            "{event.description || 'No description available for this community gathering.'}"
                                        </p>
                                    </CardContent>
                                    <div className="p-4 bg-slate-50 border-t flex justify-end">
                                        <Button variant="ghost" size="sm" className="text-rose-600 font-bold group">
                                            Manage <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="donations">
                    <Card className="shadow-sm border-slate-200 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/50">
                                    <TableHead>Donor Details</TableHead>
                                    <TableHead>Linked Event</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Message</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {donations.map(donation => (
                                    <TableRow key={donation.id} className="hover:bg-slate-50/50 transition-colors">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center font-bold text-rose-700 text-xs">
                                                    {donation.profiles?.full_name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900">{donation.profiles?.full_name}</div>
                                                    <div className="text-[10px] text-slate-400">Flat {donation.profiles?.flat_number}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {donation.events ? (
                                                <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                                                    {donation.events.title}
                                                </Badge>
                                            ) : (
                                                <span className="text-slate-400 text-xs">General Donation</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-bold text-slate-900">
                                            ₹{donation.amount.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-500">
                                            {format(new Date(donation.created_at), 'dd MMM yyyy')}
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-600 italic">
                                            {donation.message ? `"${donation.message}"` : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={addEventOpen} onOpenChange={setAddEventOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">Plan Community Event</DialogTitle>
                        <DialogDescription>
                            Schedule a new event for the residents to see and contribute to.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Event Title</Label>
                            <Input placeholder="e.g., Holi Milan 2024" value={title} onChange={e => setTitle(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Date & Time</Label>
                                <Input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Location</Label>
                                <Input placeholder="Clubhouse" value={location} onChange={e => setLocation(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <textarea
                                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                placeholder="What's the plan? Wear white, bring colors..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddEventOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddEvent} className="bg-rose-600 hover:bg-rose-700">Create Event</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
