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
import { CheckCircle, Clock, XCircle, Smartphone, Loader2, IndianRupee, CreditCard, Receipt, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import ReceiptModal, { generateReceiptNumber, type ReceiptData } from '@/components/ReceiptModal'
import PaymentPhaseBanner, { computePhase, type PeriodInfo } from '@/components/PaymentPhaseBanner'

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
    transaction_id: string | null
    receipt_number: string | null
    paid_at: string | null
    created_at: string
    maintenance_periods: {
        id: string
        name: string
    }
}

type UserProfile = {
    full_name: string
    flat_number: string
    mobile: string
    email: string
}

const statusConfig = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
    paid: { label: 'Paid', color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
    cash_requested: { label: 'Verification Pending', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: IndianRupee },
    overdue: { label: 'Overdue', color: 'bg-red-100 text-red-800 border-red-300', icon: XCircle },
}

const MERCHANT_NAME = "RWA Pocket 19"
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_SGrNupELd6j1LT'
if (!import.meta.env.VITE_RAZORPAY_KEY_ID) {
    console.warn('VITE_RAZORPAY_KEY_ID is not set in .env — using test key fallback')
}

export default function CitizenPayments() {
    const [payments, setPayments] = useState<Payment[]>([])
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [activePeriod, setActivePeriod] = useState<PeriodInfo | null>(null)

    // Pay dialog state
    const [isPayDialogOpen, setIsPayDialogOpen] = useState(false)
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const [lastReceiptData, setLastReceiptData] = useState<ReceiptData | null>(null)
    const [gracePhaseInfo, setGracePhaseInfo] = useState<{ isGrace: boolean; lateFee: number; total: number } | null>(null)

    // Receipt modal state
    const [receiptOpen, setReceiptOpen] = useState(false)
    const [viewingReceipt, setViewingReceipt] = useState<ReceiptData | null>(null)

    useEffect(() => {
        fetchData()

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
                }, () => { fetchPayments() })
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

    const fetchData = async () => {
        await Promise.all([fetchPayments(), fetchProfile(), fetchActivePeriod()])
    }

    const fetchActivePeriod = async () => {
        const { data } = await supabase
            .from('maintenance_periods')
            .select('name, due_date, grace_period_days, late_fee_amount, reminders_enabled')
            .order('created_at', { ascending: false })
            .limit(1)
        if (data && data.length > 0 && data[0].due_date) {
            setActivePeriod({
                name: data[0].name,
                due_date: data[0].due_date,
                grace_period_days: data[0].grace_period_days ?? 3,
                late_fee_amount: data[0].late_fee_amount ?? 25,
                reminders_enabled: data[0].reminders_enabled ?? true,
            })
        }
    }

    const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
            .from('profiles')
            .select('full_name, flat_number, mobile, email')
            .eq('id', user.id)
            .single()
        if (data) setUserProfile(data)
    }

    const fetchPayments = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('payments')
                .select(`*, maintenance_periods (id, name)`)
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
        // Detect grace period for this payment's period
        if (activePeriod) {
            const { phase, lateFee } = computePhase(activePeriod)
            const isGrace = phase === 'grace'
            setGracePhaseInfo({
                isGrace,
                lateFee: isGrace ? lateFee : 0,
                total: isGrace ? payment.amount + lateFee : payment.amount,
            })
        } else {
            setGracePhaseInfo({ isGrace: false, lateFee: 0, total: payment.amount })
        }
        setIsPayDialogOpen(true)
    }

    const buildReceiptData = (payment: Payment, transactionId: string | null, receiptNumber: string): ReceiptData => ({
        receiptNumber,
        residentName: userProfile?.full_name || 'Resident',
        flatNumber: userProfile?.flat_number || '-',
        amount: payment.amount,
        quarter: payment.maintenance_periods?.name || 'N/A',
        method: transactionId ? 'Online (Razorpay)' : 'Cash',
        transactionId,
        paidAt: new Date().toISOString(),
    })

    const handleViewReceipt = (payment: Payment) => {
        const receiptData: ReceiptData = {
            receiptNumber: payment.receipt_number || '-',
            residentName: userProfile?.full_name || 'Resident',
            flatNumber: userProfile?.flat_number || '-',
            amount: payment.amount,
            quarter: payment.maintenance_periods?.name || 'N/A',
            method: payment.method === 'online' ? 'Online (Razorpay)' : payment.method === 'cash' ? 'Cash' : '-',
            transactionId: payment.transaction_id,
            paidAt: payment.paid_at || payment.created_at,
        }
        setViewingReceipt(receiptData)
        setReceiptOpen(true)
    }

    const handleRazorpayPay = async () => {
        if (!selectedPayment) return
        setSubmitting(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("User not found")

            const profile = userProfile

            const totalChargeAmount = gracePhaseInfo?.total ?? selectedPayment.amount

            const options = {
                key: RAZORPAY_KEY_ID,
                amount: Math.round(totalChargeAmount * 100),
                currency: "INR",
                name: MERCHANT_NAME,
                description: `Maintenance: ${selectedPayment.maintenance_periods?.name}${gracePhaseInfo?.isGrace ? ' (Grace Period)' : ''}`,
                image: "/vite.svg",
                handler: async function (response: any) {
                    setSubmitting(true)
                    try {
                        const receiptNum = generateReceiptNumber()
                        const paidAt = new Date().toISOString()
                        const isGrace = gracePhaseInfo?.isGrace ?? false
                        const lateFee = gracePhaseInfo?.lateFee ?? 0
                        const totalPaidAmt = gracePhaseInfo?.total ?? selectedPayment.amount

                        const { error } = await supabase
                            .from('payments')
                            .update({
                                status: 'paid',
                                method: 'online',
                                transaction_id: response.razorpay_payment_id,
                                receipt_number: receiptNum,
                                paid_at: paidAt,
                                payment_phase: isGrace ? 'grace_period' : 'normal',
                                late_fee_applied: lateFee,
                                total_amount_paid: totalPaidAmt,
                            })
                            .eq('id', selectedPayment.id)

                        if (error) throw error

                        const rd = buildReceiptData(selectedPayment, response.razorpay_payment_id, receiptNum)
                        setLastReceiptData(rd)
                        setShowSuccess(true)
                        fetchPayments()

                        setTimeout(() => {
                            setIsPayDialogOpen(false)
                            setShowSuccess(false)
                        }, 6000)
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
                notes: { payment_id: selectedPayment.id },
                theme: { color: "#166534" }
            }

            if (!window.Razorpay) {
                throw new Error("Razorpay SDK not loaded. Please check your internet connection or refresh the page.")
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

    const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0)
    const totalPending = payments.filter(p => p.status === 'pending' || p.status === 'overdue').reduce((sum, p) => sum + Number(p.amount), 0)

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-green-900 to-green-700 bg-clip-text text-transparent">
                    Payment History
                </h1>
                <p className="text-muted-foreground mt-1">View all your maintenance payments and download receipts</p>
            </div>

            {/* Phase banner — only for unpaid residents */}
            {activePeriod && activePeriod.reminders_enabled && (
                <PaymentPhaseBanner
                    period={activePeriod}
                    isPaid={payments.some(p => p.status === 'paid')}
                />
            )}

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
                                <TableHead className="font-semibold">Quarter</TableHead>
                                <TableHead className="font-semibold">Amount</TableHead>
                                <TableHead className="font-semibold">Mode</TableHead>
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
                                    {/* Demo row shown when no payments exist */}
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
                                                    <Clock className="h-3 w-3" /> Pending
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handlePayClick({
                                                        id: 'demo-id', amount: 900, status: 'pending', method: null,
                                                        transaction_id: null, receipt_number: null, paid_at: null,
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
                                        const isPaid = payment.status === 'paid'

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
                                                <TableCell className="text-slate-600 text-sm">
                                                    {payment.method === 'online'
                                                        ? <span className="inline-flex items-center gap-1"><Smartphone className="h-3 w-3 text-blue-500" />Online</span>
                                                        : payment.method === 'cash'
                                                            ? <span className="inline-flex items-center gap-1"><IndianRupee className="h-3 w-3 text-green-600" />Cash</span>
                                                            : <span className="text-slate-300">-</span>}
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
                                                    {isPaid && payment.receipt_number ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleViewReceipt(payment)}
                                                            className="h-8 px-3 gap-1.5 text-xs font-semibold text-blue-700 border-blue-200 hover:bg-blue-50"
                                                        >
                                                            <Receipt className="h-3.5 w-3.5" /> Receipt
                                                        </Button>
                                                    ) : canPay ? (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handlePayClick(payment)}
                                                            className="bg-green-600 hover:bg-green-700 h-8 px-4 font-bold shadow-sm"
                                                        >
                                                            Pay Now
                                                        </Button>
                                                    ) : null}
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

            {/* ── Pay Dialog ─────────────────────────────────────────────────────── */}
            <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-green-700">
                            <IndianRupee className="h-6 w-6" />
                            Secure Payment
                        </DialogTitle>
                        <DialogDescription>
                            {gracePhaseInfo?.isGrace
                                ? `Grace period payment for ${selectedPayment?.maintenance_periods?.name}`
                                : `Pay ₹${selectedPayment?.amount.toLocaleString()} for ${selectedPayment?.maintenance_periods?.name}`}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 pt-4">
                        {/* Grace period warning */}
                        {gracePhaseInfo?.isGrace && (
                            <div className="flex gap-2 items-start bg-orange-50 border border-orange-200 rounded-xl px-3 py-3 text-sm">
                                <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                                <p className="text-orange-800">
                                    <strong>Grace Period Active.</strong> A late fee of ₹{gracePhaseInfo.lateFee} will be added to your payment.
                                </p>
                            </div>
                        )}

                        {/* Amount breakdown */}
                        {gracePhaseInfo?.isGrace ? (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 space-y-1.5 text-sm">
                                <div className="flex justify-between text-slate-600">
                                    <span>Base Maintenance</span>
                                    <span>₹{selectedPayment?.amount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-orange-600 font-medium">
                                    <span>Late Fee</span>
                                    <span>+ ₹{gracePhaseInfo.lateFee}</span>
                                </div>
                                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200 text-base">
                                    <span>Total</span>
                                    <span>₹{gracePhaseInfo.total.toLocaleString()}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex flex-col items-center text-center space-y-3">
                                <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
                                    <CreditCard className="h-7 w-7 text-green-700" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-green-900">Secure Gateway</h3>
                                    <p className="text-xs text-green-700">A receipt is generated automatically after payment.</p>
                                </div>
                            </div>
                        )}

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

                        {/* Success Overlay */}
                        {showSuccess && lastReceiptData && (
                            <div className="absolute inset-0 bg-white z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
                                <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
                                    <CheckCircle className="h-12 w-12 text-green-600 animate-bounce" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-1">Payment Successful!</h3>
                                <p className="text-slate-500 text-sm mb-1">Receipt No: <span className="font-mono font-bold text-slate-700">{lastReceiptData.receiptNumber}</span></p>
                                <p className="text-slate-600 mb-6 font-medium text-sm">Your maintenance dues have been cleared.</p>
                                <div className="flex gap-3 w-full">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setViewingReceipt(lastReceiptData)
                                            setReceiptOpen(true)
                                            setIsPayDialogOpen(false)
                                            setShowSuccess(false)
                                        }}
                                        className="flex-1 gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                                    >
                                        <Receipt className="h-4 w-4" /> View Receipt
                                    </Button>
                                    <Button
                                        onClick={() => { setIsPayDialogOpen(false); setShowSuccess(false) }}
                                        className="flex-1 bg-slate-900 hover:bg-slate-800 font-bold rounded-xl"
                                    >
                                        Dismiss
                                    </Button>
                                </div>
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

            {/* ── Receipt Modal ──────────────────────────────────────────────────── */}
            <ReceiptModal
                open={receiptOpen}
                onClose={() => setReceiptOpen(false)}
                receipt={viewingReceipt}
            />
        </div>
    )
}
