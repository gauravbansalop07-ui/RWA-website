import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { CalendarDays, SwatchBook, Loader2, Clock, CreditCard } from 'lucide-react'
import { format, addDays, startOfDay } from 'date-fns'

declare global {
    interface Window {
        Razorpay: any
    }
}

const RAZORPAY_KEY_ID = "rzp_test_your_key_here"

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
    booking_date: string
    start_time: string
    end_time: string
    status: string
    total_amount: number
    payment_status: string
    amenities?: { name: string }
}

export default function CitizenFacilities() {
    const [amenities, setAmenities] = useState<Amenity[]>([])
    const [bookings, setBookings] = useState<Booking[]>([])
    const [myBookings, setMyBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()))
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        fetchData()
    }, [selectedDate])

    const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser()

        const [amenitiesRes, bookingsRes, myRes] = await Promise.all([
            supabase.from('amenities').select('*').eq('status', 'open').order('name'),
            supabase.from('facility_bookings').select('*').eq('booking_date', format(selectedDate, 'yyyy-MM-dd')).neq('status', 'cancelled'),
            user ? supabase.from('facility_bookings').select('*, amenities(name)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5) : { data: [] }
        ])

        if (amenitiesRes.data) setAmenities(amenitiesRes.data)
        if (bookingsRes.data) setBookings(bookingsRes.data)
        if (myRes.data) setMyBookings(myRes.data as any)
        setLoading(false)
    }

    const handleRazorpayPayment = async (bookingId: string, amount: number, amenityName: string) => {
        const { data: { user } } = await supabase.auth.getUser()
        const { data: profile } = await supabase.from('profiles').select('full_name, mobile, email').eq('id', user?.id).single()

        const options = {
            key: RAZORPAY_KEY_ID,
            amount: amount * 100,
            currency: "INR",
            name: "RWA Pocket 19",
            description: `Booking: ${amenityName}`,
            handler: async function (response: any) {
                await supabase
                    .from('facility_bookings')
                    .update({
                        payment_status: 'paid',
                        status: 'confirmed',
                        transaction_id: response.razorpay_payment_id
                    })
                    .eq('id', bookingId)
                fetchData()
            },
            prefill: {
                name: profile?.full_name || "",
                email: profile?.email || "",
                contact: profile?.mobile || ""
            },
            theme: { color: "#166534" }
        }
        const rzp = new window.Razorpay(options)
        rzp.open()
    }

    const handleBook = async (amenity: Amenity, startTime: string) => {
        setSubmitting(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Please log in to book")

            const [hours] = startTime.split(':')
            const endTime = `${parseInt(hours) + 1}:00:00`

            const { data: booking, error } = await supabase
                .from('facility_bookings')
                .insert({
                    user_id: user.id,
                    amenity_id: amenity.id,
                    booking_date: format(selectedDate, 'yyyy-MM-dd'),
                    start_time: startTime,
                    end_time: endTime,
                    total_amount: amenity.price_per_slot,
                    payment_status: amenity.price_per_slot > 0 ? 'pending' : 'not_applicable',
                    status: amenity.price_per_slot > 0 ? 'pending_payment' : 'confirmed'
                })
                .select()
                .single()

            if (error) throw error

            if (amenity.price_per_slot > 0 && booking) {
                handleRazorpayPayment(booking.id, amenity.price_per_slot, amenity.name)
            } else {
                alert("Booking confirmed!")
                fetchData()
            }
        } catch (error: any) {
            alert(error.message)
        } finally {
            setSubmitting(false)
        }
    }

    const timeSlots = Array.from({ length: 16 }, (_, i) => `${i + 6}:00:00`)

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-green-900 to-green-700 bg-clip-text text-transparent">
                        Book Facilities
                    </h1>
                    <p className="text-muted-foreground mt-1">Reserve common areas for your personal use</p>
                </div>

                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-max self-start md:self-center">
                    {[0, 1, 2, 3, 4].map(i => {
                        const date = addDays(new Date(), i)
                        const isSelected = format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                        return (
                            <button
                                key={i}
                                onClick={() => setSelectedDate(startOfDay(date))}
                                className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${isSelected ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {i === 0 ? 'Today' : format(date, 'EEE, dd')}
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    {loading ? (
                        <div className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600" /></div>
                    ) : (
                        amenities.map(amenity => (
                            <Card key={amenity.id} className="overflow-hidden border-slate-200 hover:shadow-md transition-shadow">
                                <CardHeader className="bg-slate-50/50 flex-row justify-between items-center py-4">
                                    <div>
                                        <CardTitle className="text-lg">{amenity.name}</CardTitle>
                                        <CardDescription className="text-xs">{amenity.description}</CardDescription>
                                    </div>
                                    <div className="text-right">
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                            {amenity.price_per_slot > 0 ? `₹${amenity.price_per_slot}/hr` : 'FREE'}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                        {timeSlots.map(slot => {
                                            const isBooked = bookings.some(b => b.amenity_id === amenity.id && b.start_time === slot)
                                            return (
                                                <Button
                                                    key={slot}
                                                    variant={isBooked ? "secondary" : "outline"}
                                                    disabled={isBooked || submitting}
                                                    size="sm"
                                                    className={`h-12 flex flex-col items-center justify-center gap-0.5 ${isBooked ? 'opacity-50' : 'hover:border-green-500 hover:bg-green-50'}`}
                                                    onClick={() => handleBook(amenity, slot)}
                                                >
                                                    <span className="text-[9px] uppercase font-bold text-slate-400">
                                                        {format(new Date(`2000-01-01T${slot}`), 'p')}
                                                    </span>
                                                    <span className="text-xs font-bold leading-none">
                                                        {isBooked ? 'Booked' : 'Book'}
                                                    </span>
                                                </Button>
                                            )
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                <div className="space-y-6">
                    <Card className="border-green-100 bg-green-50/30">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-green-700" />
                                My Recent Bookings
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {myBookings.length === 0 ? (
                                <p className="text-xs text-slate-500 text-center py-4 italic">No recent bookings</p>
                            ) : (
                                myBookings.map(b => (
                                    <div key={b.id} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm space-y-2">
                                        <div className="flex justify-between items-start">
                                            <span className="text-xs font-bold text-slate-900">{b.amenities?.name}</span>
                                            <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 ${b.status === 'confirmed' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                                                }`}>
                                                {b.status === 'pending_payment' ? 'Pending Pay' : b.status}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-3 text-[10px] text-slate-500">
                                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {format(new Date(b.booking_date), 'dd MMM')}</span>
                                            <span className="flex items-center gap-1"><SwatchBook className="h-3 w-3" /> {b.start_time.substring(0, 5)}</span>
                                        </div>
                                        {b.status === 'pending_payment' && (
                                            <Button
                                                size="sm"
                                                className="w-full h-7 text-[10px] bg-green-700 hover:bg-green-800 gap-1.5"
                                                onClick={() => handleRazorpayPayment(b.id, b.total_amount, b.amenities?.name || 'Facility')}
                                            >
                                                <CreditCard className="h-3 w-3" /> Pay Now
                                            </Button>
                                        )}
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
