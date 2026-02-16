import { useEffect, useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { CheckCircle, Clock, XCircle, Smartphone, Loader2, IndianRupee, CreditCard } from 'lucide-react'
import { format } from 'date-fns'

declare global {
    interface Window {
        Razorpay: any;
    }
}

type Payment = {
    id: string
    amount: number
    status: 'pending' | 'paid' | 'cash_requested' | 'overdue'
    method: 'online' | 'cash' | null
    paid_at: string | null
    created_at: string
    maintenance_periods: {
        id: string
        name: string
    }
}

const statusConfig = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
    paid: { label: 'Paid', color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
    cash_requested: { label: 'Verification Pending', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: IndianRupee },
    overdue: { label: 'Overdue', color: 'bg-red-100 text-red-800 border-red-300', icon: XCircle },
}

const MERCHANT_NAME = "RWA Pocket 19"
const RAZORPAY_KEY_ID = "rzp_test_your_key_here" // User needs to update this

export default function CitizenPayments() {
    const [payments, setPayments] = useState<Payment[]>([])
    const [loading, setLoading] = useState(true)

    // Payment Dialog State
    const [isPayDialogOpen, setIsPayDialogOpen] = useState(false)
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)

    useEffect(() => {
        fetchPayments()

        const setupSubscription = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const channel = supabase
                .channel(`citizen-payments-${user.id}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'payments',
                    filter: `user_id=eq.${user.id}`
                }, () => {
                    fetchPayments()
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

    const fetchPayments = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('payments')
                .select(`
          *,
          maintenance_periods (id, name)
        `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (error) throw error
            setPayments(data || [])
        } catch (error) {
            console.error('Error fetching payments:', error)
        } finally {
            setLoading(false)
        }
    }

    const handlePayClick = (payment: Payment) => {
        setSelectedPayment(payment)
        setIsPayDialogOpen(true)
    }

    const handleRazorpayPay = async () => {
        if (!selectedPayment) return
        setSubmitting(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("User not found")

            // Fetch user profile for contact details
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, mobile, email')
                .eq('id', user.id)
                .single()

            const options = {
                key: RAZORPAY_KEY_ID,
                amount: selectedPayment.amount * 100, // Razorpay expects amount in paise
                currency: "INR",
                name: MERCHANT_NAME,
                description: `Maintenance: ${selectedPayment.maintenance_periods?.name}`,
                image: "/vite.svg", // Placeholder logo
                handler: async function (response: any) {
                    // Success callback
                    setSubmitting(true)
                    try {
                        const { error } = await supabase
                            .from('payments')
                            .update({
                                status: 'paid',
                                method: 'online',
                                transaction_id: response.razorpay_payment_id,
                                paid_at: new Date().toISOString()
                            })
                            .eq('id', selectedPayment.id)

                        if (error) throw error

                        setShowSuccess(true)
                        fetchPayments()

                        setTimeout(() => {
                            setIsPayDialogOpen(false)
                            setShowSuccess(false)
                        }, 5000)
                    } catch (err: any) {
                        console.error('Error updating payment after Razorpay success:', err)
                        alert("Payment recorded by Razorpay but failed to update in our database. Please contact admin with ID: " + response.razorpay_payment_id)
                    } finally {
                        setSubmitting(false)
                    }
                },
                prefill: {
                    name: profile?.full_name || "",
                    email: profile?.email || "",
                    contact: profile?.mobile || ""
                },
                notes: {
                    payment_id: selectedPayment.id
                },
                theme: {
                    color: "#166534" // Green-800 to match theme
                }
            }

            const rzp = new window.Razorpay(options)
            rzp.on('payment.failed', function (response: any) {
                console.error('Razorpay payment failed:', response.error)
                alert("Payment Failed: " + response.error.description)
            })
            rzp.open()
        } catch (error: any) {
            console.error('Razorpay initialization error:', error)
            alert(error.message || "Failed to start payment gateway")
        } finally {
            setSubmitting(false)
        }
    }


    const totalPaid = payments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + Number(p.amount), 0)

    const totalPending = payments
        .filter(p => p.status === 'pending' || p.status === 'overdue')
        .reduce((sum, p) => sum + Number(p.amount), 0)

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-green-900 to-green-700 bg-clip-text text-transparent">
                    My Payments
                </h1>
                <p className="text-muted-foreground mt-1">View your payment history and pay your dues via UPI</p>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-l-4 border-l-green-500 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
                                <p className="text-3xl font-bold text-green-600">₹{totalPaid.toLocaleString()}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Pending Dues</p>
                                <p className="text-3xl font-bold text-orange-600">₹{totalPending.toLocaleString()}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                                <Clock className="h-6 w-6 text-orange-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Payment History Table */}
            <Card className="shadow-sm overflow-hidden border-slate-200">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50">
                                <TableHead className="font-semibold">Date</TableHead>
                                <TableHead className="font-semibold">Period</TableHead>
                                <TableHead className="font-semibold">Amount</TableHead>
                                <TableHead className="font-semibold">Method</TableHead>
                                <TableHead className="font-semibold">Status</TableHead>
                                <TableHead className="text-right font-semibold">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                                            <p className="text-sm text-muted-foreground">Loading payments...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                <>
                                    {/* Show a demo row for admins to test the flow if no real payments exist */}
                                    {payments.length === 0 && (
                                        <TableRow className="bg-blue-50/30 border-dashed border-blue-200">
                                            <TableCell className="text-xs text-blue-500 font-bold">DEMO</TableCell>
                                            <TableCell className="font-medium text-slate-900 leading-tight">
                                                Test Maintenance Bill
                                                <div className="text-[10px] text-blue-600 font-bold uppercase">Admin Preview</div>
                                            </TableCell>
                                            <TableCell className="font-bold text-slate-900">₹900</TableCell>
                                            <TableCell className="text-slate-400">-</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 gap-1 px-2 py-0.5 text-[11px] font-bold uppercase">
                                                    <Clock className="h-3 w-3" />
                                                    Pending
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handlePayClick({
                                                        id: 'demo-id',
                                                        amount: 900,
                                                        status: 'pending',
                                                        method: null,
                                                        paid_at: null,
                                                        created_at: new Date().toISOString(),
                                                        maintenance_periods: { id: 'demo-period', name: 'Demo Billing Cycle' }
                                                    } as any)}
                                                    className="bg-blue-600 hover:bg-blue-700 h-8 px-4 font-bold shadow-sm"
                                                >
                                                    Pay Now
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {payments.map((payment) => {
                                        const StatusIcon = statusConfig[payment.status].icon
                                        const canPay = payment.status === 'pending' || payment.status === 'overdue'

                                        return (
                                            <TableRow key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="font-medium whitespace-nowrap text-slate-700">
                                                    {format(new Date(payment.created_at), 'dd MMM yyyy')}
                                                </TableCell>
                                                <TableCell className="font-medium text-slate-900">
                                                    {payment.maintenance_periods?.name || 'N/A'}
                                                </TableCell>
                                                <TableCell className="font-bold text-slate-900">
                                                    ₹{Number(payment.amount).toLocaleString()}
                                                </TableCell>
                                                <TableCell className="capitalize text-slate-600 text-sm">
                                                    {payment.method || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={`gap-1 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${statusConfig[payment.status].color}`}
                                                    >
                                                        <StatusIcon className="h-3 w-3" />
                                                        {statusConfig[payment.status].label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {canPay && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handlePayClick(payment)}
                                                            className="bg-green-600 hover:bg-green-700 h-8 px-4 font-bold shadow-sm"
                                                        >
                                                            Pay Now
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Payment Dialog */}
            <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-green-700">
                            <IndianRupee className="h-6 w-6" />
                            Secure UPI Payment
                        </DialogTitle>
                        <DialogDescription>
                            Pay ₹{selectedPayment?.amount.toLocaleString()} for {selectedPayment?.maintenance_periods?.name}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 pt-4">
                        <div className="bg-green-50 p-6 rounded-2xl border border-green-100 flex flex-col items-center text-center space-y-4">
                            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                                <CreditCard className="h-8 w-8 text-green-700" />
                            </div>
                            <div>
                                <h3 className="font-bold text-green-900 text-lg">Secure Gateway</h3>
                                <p className="text-sm text-green-700">Digital payments are faster and safer. Get instant confirmation for your dues.</p>
                            </div>
                        </div>

                        {/* Gateway Payment Button */}
                        <div className="grid gap-3">
                            <Button
                                onClick={handleRazorpayPay}
                                disabled={submitting}
                                className="w-full bg-green-700 hover:bg-green-800 h-16 text-xl font-bold shadow-lg shadow-green-200 gap-2 rounded-xl"
                            >
                                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Smartphone className="h-6 w-6" />}
                                Pay ₹{selectedPayment?.amount.toLocaleString()} Now
                            </Button>
                            <p className="text-[10px] text-center text-slate-500 font-medium px-4 leading-relaxed">
                                Powered by Razorpay. Supports UPI (GPay, PhonePe, Paytm), All Cards, and Net Banking.
                            </p>
                        </div>

                        {showSuccess && (
                            <div className="absolute inset-0 bg-white z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
                                <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
                                    <CheckCircle className="h-12 w-12 text-green-600 animate-bounce" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h3>
                                <p className="text-slate-600 mb-6 font-medium">
                                    Your maintenance dues have been cleared instantly.
                                </p>
                                <Button
                                    onClick={() => {
                                        setIsPayDialogOpen(false)
                                        setShowSuccess(false)
                                    }}
                                    className="bg-slate-900 hover:bg-slate-800 font-bold px-10 h-12 rounded-xl"
                                >
                                    Dismiss
                                </Button>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="pt-2">
                        <Button
                            variant="ghost"
                            onClick={() => setIsPayDialogOpen(false)}
                            className="font-bold w-full text-slate-400 hover:text-slate-600"
                        >
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
