import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { MapPin, Clock, Heart, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

declare global {
    interface Window {
        Razorpay: any;
    }
}

type Event = {
    id: string
    title: string
    description: string
    event_date: string
    location: string
}

const RAZORPAY_KEY_ID = "rzp_test_SGrNupELd6j1LT"
const MERCHANT_NAME = "RWA Pocket 19"

export default function CitizenEvents() {
    const [events, setEvents] = useState<Event[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        fetchEvents()
    }, [])

    const fetchEvents = async () => {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .order('event_date', { ascending: true })
        if (!error) setEvents(data || [])
        setLoading(false)
    }

    const handleDonate = async (event: Event) => {
        setSubmitting(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("User not found")

            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, mobile, email')
                .eq('id', user.id)
                .single()

            const options = {
                key: RAZORPAY_KEY_ID,
                amount: 500 * 100, // Fixed donation amount for demo - ₹500
                currency: "INR",
                name: MERCHANT_NAME,
                description: `Contribution for ${event.title}`,
                image: "/vite.svg",
                handler: async function (_response: any) {
                    try {
                        const { error } = await supabase
                            .from('donations')
                            .insert({
                                event_id: event.id,
                                user_id: user.id,
                                amount: 500,
                                message: `Contribution via Portal`
                            })

                        if (error) throw error
                        alert("Thank you for your contribution!")
                    } catch (err) {
                        console.error('Error saving donation:', err)
                    }
                },
                prefill: {
                    name: profile?.full_name || "",
                    email: profile?.email || "",
                    contact: profile?.mobile || ""
                },
                theme: { color: "#e11d48" }
            }

            const rzp = new window.Razorpay(options)
            rzp.open()
        } catch (err: any) {
            alert(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-8 w-8 text-rose-600" /></div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent">
                        Society Events
                    </h1>
                    <p className="text-muted-foreground mt-1">Stay updated with community gatherings and contribute</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {events.map(event => (
                    <Card key={event.id} className="group hover:shadow-xl transition-all border-slate-200 overflow-hidden">
                        <div className="h-2 bg-rose-600" />
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border-rose-100">
                                    {format(new Date(event.event_date), 'dd MMM yyyy')}
                                </Badge>
                                {new Date(event.event_date) < new Date() && (
                                    <Badge variant="outline">Past Event</Badge>
                                )}
                            </div>
                            <CardTitle className="mt-4 text-xl group-hover:text-rose-600 transition-colors">
                                {event.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <MapPin className="h-4 w-4 text-rose-500" />
                                    {event.location || 'Society Premises'}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Clock className="h-4 w-4 text-rose-500" />
                                    {format(new Date(event.event_date), 'hh:mm a')}
                                </div>
                            </div>
                            <p className="text-sm text-slate-500 line-clamp-2">
                                {event.description || 'No description available.'}
                            </p>
                            <Button
                                onClick={() => handleDonate(event)}
                                disabled={submitting}
                                className="w-full gap-2 bg-rose-600 hover:bg-rose-700 shadow-lg"
                            >
                                <Heart className="h-4 w-4 fill-current" />
                                Contribute ₹500
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
