import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'
import { Plus, Loader2, CalendarDays, Users, IndianRupee, Clock, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'

type Amenity = {
    id: string
    name: string
    description: string
    capacity: number
    price_per_slot: number
    status: 'open' | 'closed' | 'maintenance'
}

type Booking = {
    id: string
    amenity_id: string
    user_id: string
    booking_date: string
    start_time: string
    end_time: string
    total_amount: number
    payment_status: string
    status: string
    amenities: { name: string }
    profiles: { full_name: string, flat_number: string }
}

export default function Facilities() {
    const [amenities, setAmenities] = useState<Amenity[]>([])
    const [bookings, setBookings] = useState<Booking[]>([])
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Form state
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [capacity, setCapacity] = useState('1')
    const [price, setPrice] = useState('0')

    useEffect(() => {
        fetchAmenities()
        fetchBookings()
    }, [])

    const fetchAmenities = async () => {
        const { data, error } = await supabase
            .from('amenities')
            .select('*')
            .order('name')
        if (!error) setAmenities(data || [])
    }

    const fetchBookings = async () => {
        const { data, error } = await supabase
            .from('facility_bookings')
            .select('*, amenities(name), profiles(full_name, flat_number)')
            .order('created_at', { ascending: false })
        if (!error) setBookings(data as any || [])
    }

    const handleAddAmenity = async () => {
        if (!name) return
        setSubmitting(true)
        try {
            const { error } = await supabase
                .from('amenities')
                .insert({
                    name,
                    description,
                    capacity: parseInt(capacity),
                    price_per_slot: parseFloat(price)
                })
            if (!error) {
                setIsAddOpen(false)
                resetForm()
                fetchAmenities()
            }
        } finally {
            setSubmitting(false)
        }
    }

    const resetForm = () => {
        setName('')
        setDescription('')
        setCapacity('1')
        setPrice('0')
    }

    const handleUpdateStatus = async (id: string, status: string) => {
        const { error } = await supabase
            .from('facility_bookings')
            .update({ status })
            .eq('id', id)
        if (!error) fetchBookings()
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                        Facilities & Bookings
                    </h1>
                    <p className="text-muted-foreground mt-1">Manage society amenities and resident scheduling</p>
                </div>
            </div>

            <Tabs defaultValue="amenities" className="w-full">
                <TabsList className="bg-slate-100 p-1">
                    <TabsTrigger value="amenities" className="gap-2">
                        <CalendarDays className="h-4 w-4" /> Amenities
                    </TabsTrigger>
                    <TabsTrigger value="bookings" className="gap-2">
                        <Clock className="h-4 w-4" /> Resident Bookings
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="amenities" className="space-y-6 mt-6">
                    <div className="flex justify-end">
                        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                            <DialogTrigger asChild>
                                <Button className="gap-2 bg-slate-800 hover:bg-slate-900 shadow-lg">
                                    <Plus className="h-4 w-4" /> Add Facility
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add New Amenity</DialogTitle>
                                    <DialogDescription>Define a new resource for residents to book.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Facility Name</Label>
                                        <Input placeholder="e.g., Badminton Court" value={name} onChange={e => setName(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Description</Label>
                                        <Input placeholder="Location or rules..." value={description} onChange={e => setDescription(e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Hourly Capacity</Label>
                                            <Input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Price per Hour (₹)</Label>
                                            <Input type="number" value={price} onChange={e => setPrice(e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                                    <Button onClick={handleAddAmenity} disabled={submitting}>
                                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Facility"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {amenities.map(item => (
                            <Card key={item.id} className="overflow-hidden border-slate-200">
                                <CardHeader className="bg-slate-50/50">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg">{item.name}</CardTitle>
                                        <Badge className={item.status === 'open' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}>
                                            {item.status}
                                        </Badge>
                                    </div>
                                    <CardDescription className="line-clamp-1">{item.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                                        <div className="p-2 bg-slate-50 rounded-lg">
                                            <p className="text-[10px] uppercase text-slate-400 font-bold">Capacity</p>
                                            <p className="font-bold flex items-center gap-1"><Users className="h-3 w-3" /> {item.capacity}</p>
                                        </div>
                                        <div className="p-2 bg-slate-50 rounded-lg">
                                            <p className="text-[10px] uppercase text-slate-400 font-bold">Price</p>
                                            <p className="font-bold flex items-center gap-1"><IndianRupee className="h-3 w-3" /> {item.price_per_slot || 'Free'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" className="w-full">Edit</Button>
                                        <Button variant="outline" size="sm" className="w-full text-red-600 hover:bg-red-50">Delete</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="bookings" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>All Bookings</CardTitle>
                            <CardDescription>Track and manage facility reservations</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-bold text-slate-600">Resident</th>
                                            <th className="px-4 py-3 text-left font-bold text-slate-600">Facility</th>
                                            <th className="px-4 py-3 text-left font-bold text-slate-600">Schedule</th>
                                            <th className="px-4 py-3 text-left font-bold text-slate-600">Payment</th>
                                            <th className="px-4 py-3 text-left font-bold text-slate-600">Status</th>
                                            <th className="px-4 py-3 text-right font-bold text-slate-600">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {bookings.map(b => (
                                            <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <p className="font-bold">{b.profiles?.full_name}</p>
                                                    <p className="text-xs text-slate-400">Flat {b.profiles?.flat_number}</p>
                                                </td>
                                                <td className="px-4 py-3 font-medium">{b.amenities?.name}</td>
                                                <td className="px-4 py-3">
                                                    <p>{format(new Date(b.booking_date), 'dd MMM')}</p>
                                                    <p className="text-xs text-slate-400">{b.start_time.substring(0, 5)} - {b.end_time.substring(0, 5)}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className={`text-[10px] ${b.payment_status === 'paid' ? 'bg-green-50 text-green-700' : 'bg-slate-50'}`}>
                                                        {b.payment_status.toUpperCase()}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge className={b.status === 'confirmed' ? 'bg-green-600' : 'bg-slate-400'}>
                                                        {b.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => handleUpdateStatus(b.id, 'confirmed')}>
                                                            <CheckCircle className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleUpdateStatus(b.id, 'cancelled')}>
                                                            <XCircle className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
