import { useEffect, useState } from 'react'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import {
    Search, CheckCircle, XCircle, Clock, Download, Plus, IndianRupee, Receipt, Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import ReceiptModal, { generateReceiptNumber, type ReceiptData } from '@/components/ReceiptModal'

type Payment = {
    id: string
    user_id: string
    period_id: string
    amount: number
    status: 'pending' | 'paid' | 'cash_requested' | 'overdue'
    method: 'online' | 'cash' | null
    transaction_id: string | null
    receipt_number: string | null
    receipt_url: string | null
    paid_at: string | null
    created_at: string
    profiles: { full_name: string; flat_number: string; email: string }
    maintenance_periods: { name: string }
}

type Period = { id: string; name: string; amount: number; due_date: string }

const statusConfig = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
    paid: { label: 'Paid', color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
    cash_requested: { label: 'Cash Req.', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: IndianRupee },
    overdue: { label: 'Overdue', color: 'bg-red-100 text-red-800 border-red-300', icon: XCircle },
}

type Notification = { type: 'success' | 'error'; message: string } | null

export default function Payments() {
    const [payments, setPayments] = useState<Payment[]>([])
    const [periods, setPeriods] = useState<Period[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [activeTab, setActiveTab] = useState('all')
    const [periodFilter, setPeriodFilter] = useState('all')
    const [isPeriodDialogOpen, setIsPeriodDialogOpen] = useState(false)
    const [notification, setNotification] = useState<Notification>(null)

    // New Billing Cycle form
    const [periodName, setPeriodName] = useState('')
    const [periodAmount, setPeriodAmount] = useState('900')
    const [periodDueDate, setPeriodDueDate] = useState('')
    const [graceDays, setGraceDays] = useState('3')
    const [lateFeeAmt, setLateFeeAmt] = useState('25')
    const [remindersEnabled, setRemindersEnabled] = useState(true)

    // Stats
    const [stats, setStats] = useState({ total: 0, collected: 0, pending: 0, defaulters: 0, gracePeriodCount: 0, lateFeeCollected: 0 })

    // Cash marking
    const [cashPayment, setCashPayment] = useState<Payment | null>(null)
    const [cashDialogOpen, setCashDialogOpen] = useState(false)
    const [markingCash, setMarkingCash] = useState(false)

    // Receipt
    const [receiptOpen, setReceiptOpen] = useState(false)
    const [viewingReceipt, setViewingReceipt] = useState<ReceiptData | null>(null)

    const showNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message })
        setTimeout(() => setNotification(null), 5000)
    }

    useEffect(() => {
        fetchInitialData()
        const channel = supabase
            .channel('payments-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => { fetchPayments() })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [])

    const fetchInitialData = async () => {
        setLoading(true)
        await Promise.all([fetchPayments(), fetchPeriods()])
        setLoading(false)
    }

    const fetchPayments = async () => {
        const { data } = await supabase
            .from('payments')
            .select(`*, profiles (full_name, flat_number, email), maintenance_periods (name)`)
            .order('created_at', { ascending: false })
        setPayments(data || [])
        if (data) {
            setStats({
                total: data.length,
                collected: data.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0),
                pending: data.filter(p => p.status !== 'paid').reduce((s, p) => s + Number(p.amount), 0),
                defaulters: data.filter(p => p.status === 'overdue').length,
                gracePeriodCount: data.filter((p: any) => p.payment_phase === 'grace_period').length,
                lateFeeCollected: data.filter((p: any) => p.payment_phase === 'grace_period').reduce((s: number, p: any) => s + Number(p.late_fee_applied || 0), 0),
            })
        }
    }

    const fetchPeriods = async () => {
        const { data } = await supabase.from('maintenance_periods').select('*').order('created_at', { ascending: false })
        setPeriods(data || [])
    }

    const createPeriodAndBills = async () => {
        try {
            const { data: period, error: pError } = await supabase
                .from('maintenance_periods')
                .insert({
                    name: periodName,
                    amount: parseFloat(periodAmount),
                    due_date: periodDueDate || null,
                    grace_period_days: parseInt(graceDays) || 3,
                    late_fee_amount: parseFloat(lateFeeAmt) || 25,
                    reminders_enabled: remindersEnabled,
                })
                .select().single()
            if (pError) throw pError

            const { data: residents } = await supabase.from('profiles').select('id').eq('role', 'resident')
            if (residents && residents.length > 0) {
                const bills = residents.map(r => ({ user_id: r.id, period_id: period.id, amount: parseFloat(periodAmount), status: 'pending' }))
                const { error: bError } = await supabase.from('payments').insert(bills)
                if (bError) throw bError
            }

            showNotification('success', `✓ Billed ${residents?.length || 0} residents for "${periodName}"`)
            setIsPeriodDialogOpen(false)
            setPeriodName(''); setPeriodAmount('900'); setPeriodDueDate('')
            setGraceDays('3'); setLateFeeAmt('25'); setRemindersEnabled(true)
            fetchInitialData()
        } catch (error: any) {
            console.error('Error creating bills:', error)
            showNotification('error', error.message || 'Failed to create billing cycle')
        }
    }

    const handleMarkCashPaid = async () => {
        if (!cashPayment) return
        setMarkingCash(true)
        try {
            const receiptNum = generateReceiptNumber()
            const paidAt = new Date().toISOString()
            const { error } = await supabase
                .from('payments')
                .update({ status: 'paid', method: 'cash', receipt_number: receiptNum, paid_at: paidAt })
                .eq('id', cashPayment.id)
            if (error) throw error

            showNotification('success', `✓ Cash payment marked for ${cashPayment.profiles?.full_name} (${cashPayment.profiles?.flat_number})`)
            setCashDialogOpen(false)
            setCashPayment(null)
            fetchPayments()
        } catch (error: any) {
            console.error('Error marking cash payment:', error)
            showNotification('error', error.message || 'Failed to mark cash payment')
        } finally {
            setMarkingCash(false)
        }
    }

    const handleViewReceipt = (payment: Payment) => {
        const receiptData: ReceiptData = {
            receiptNumber: payment.receipt_number || '-',
            residentName: payment.profiles?.full_name || '-',
            flatNumber: payment.profiles?.flat_number || '-',
            amount: payment.amount,
            quarter: payment.maintenance_periods?.name || '-',
            method: payment.method === 'online' ? 'Online (Razorpay)' : payment.method === 'cash' ? 'Cash' : '-',
            transactionId: payment.transaction_id,
            paidAt: payment.paid_at || payment.created_at,
        }
        setViewingReceipt(receiptData)
        setReceiptOpen(true)
    }

    const handleExportCSV = () => {
        const headers = ['Date', 'Resident', 'Flat', 'Quarter', 'Amount', 'Mode', 'Status', 'Receipt No.', 'Transaction ID']
        const rows = filteredPayments.map(p => [
            format(new Date(p.created_at), 'dd MMM yyyy'),
            p.profiles?.full_name || '',
            p.profiles?.flat_number || '',
            p.maintenance_periods?.name || '',
            p.amount,
            p.method || '',
            p.status,
            p.receipt_number || '',
            p.transaction_id || '',
        ])
        const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `RWA-Payments-${format(new Date(), 'yyyy-MM-dd')}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const filteredPayments = payments.filter(payment => {
        const matchesSearch =
            (payment.profiles?.full_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (payment.profiles?.flat_number?.toLowerCase() || '').includes(search.toLowerCase())
        const matchesPeriod = periodFilter === 'all' || payment.maintenance_periods?.name === periodFilter
        const matchesTab = activeTab === 'all' ? true
            : activeTab === 'defaulters' ? (payment.status === 'overdue' || payment.status === 'pending')
                : payment.status === activeTab
        return matchesSearch && matchesPeriod && matchesTab
    })

    return (
        <div className="space-y-6">
            {notification && (
                <div className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium shadow-sm border ${notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                    <span>{notification.message}</span>
                    <button onClick={() => setNotification(null)} className="ml-4 opacity-60 hover:opacity-100 text-lg leading-none">&times;</button>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                        Payment & Billing
                    </h1>
                    <p className="text-muted-foreground mt-1">Manage maintenance cycles and revenue collection</p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={isPeriodDialogOpen} onOpenChange={setIsPeriodDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                                <Plus className="h-4 w-4" /> New Billing Cycle
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Billing Cycle</DialogTitle>
                                <DialogDescription>
                                    This will generate a pending maintenance bill for ALL registered residents.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label>Billing Period Name</Label>
                                    <Input placeholder="e.g., Q1 2026 (Jan - Mar)" value={periodName} onChange={e => setPeriodName(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Amount (₹)</Label>
                                        <Input type="number" placeholder="900" value={periodAmount} onChange={e => setPeriodAmount(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Due Date <span className="text-slate-400 text-xs">(Day 15)</span></Label>
                                        <Input type="date" value={periodDueDate} onChange={e => setPeriodDueDate(e.target.value)} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Grace Period <span className="text-slate-400 text-xs">(days after due date)</span></Label>
                                        <Input type="number" min="0" max="30" placeholder="3" value={graceDays} onChange={e => setGraceDays(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Late Fee (₹) <span className="text-slate-400 text-xs">(₹0–₹100)</span></Label>
                                        <Input type="number" min="0" max="100" placeholder="25" value={lateFeeAmt} onChange={e => setLateFeeAmt(e.target.value)} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        id="reminders"
                                        checked={remindersEnabled}
                                        onChange={e => setRemindersEnabled(e.target.checked)}
                                        className="h-4 w-4 accent-blue-600"
                                    />
                                    <label htmlFor="reminders" className="text-slate-600 cursor-pointer">
                                        Show phase reminders to residents
                                    </label>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsPeriodDialogOpen(false)}>Cancel</Button>
                                <Button onClick={createPeriodAndBills} disabled={!periodName || !periodAmount}>Generate Bills</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
                        <Download className="h-4 w-4" /> Export CSV
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-sm border-l-4 border-l-green-500">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-xs font-bold text-slate-500 uppercase">Collected</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-green-600">₹{stats.collected.toLocaleString()}</div>
                        <p className="text-[10px] text-slate-400">Successfully paid</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-l-4 border-l-yellow-500">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-xs font-bold text-slate-500 uppercase">Outstanding</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-yellow-600">₹{stats.pending.toLocaleString()}</div>
                        <p className="text-[10px] text-slate-400">Awaiting collection</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-l-4 border-l-red-400">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-xs font-bold text-slate-500 uppercase">Defaulters</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-red-500">{stats.defaulters}</div>
                        <p className="text-[10px] text-slate-400">Overdue payments</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-l-4 border-l-orange-400">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-xs font-bold text-slate-500 uppercase">Grace Period</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-orange-500">{stats.gracePeriodCount}</div>
                        <p className="text-[10px] text-slate-400">
                            {stats.lateFeeCollected > 0 ? `₹${stats.lateFeeCollected} in late fees` : 'No late fees yet'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <TabsList className="bg-white border shadow-sm h-11 px-1">
                        <TabsTrigger value="all">All Transactions</TabsTrigger>
                        <TabsTrigger value="defaulters" className="text-red-600">Defaulters</TabsTrigger>
                        <TabsTrigger value="pending" className="text-yellow-600">Pending</TabsTrigger>
                        <TabsTrigger value="paid" className="text-green-600">Paid</TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        {/* Period filter */}
                        <Select value={periodFilter} onValueChange={setPeriodFilter}>
                            <SelectTrigger className="w-[200px] bg-white border shadow-sm h-9 text-sm">
                                <SelectValue placeholder="Filter by quarter" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Quarters</SelectItem>
                                {periods.map(p => (
                                    <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Search */}
                        <div className="flex items-center gap-2 bg-white border rounded-lg px-2 py-1 shadow-sm flex-1 sm:w-56">
                            <Search className="h-4 w-4 text-slate-400 shrink-0" />
                            <Input
                                placeholder="Name or flat..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="border-none shadow-none focus-visible:ring-0 h-7 text-sm p-0"
                            />
                        </div>
                    </div>
                </div>

                {/* Showing count */}
                <p className="text-xs text-slate-400">Showing {filteredPayments.length} of {payments.length} records</p>

                <Card className="shadow-sm border-slate-200 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50">
                                <TableHead className="w-[100px]">Date</TableHead>
                                <TableHead>Resident</TableHead>
                                <TableHead>Flat</TableHead>
                                <TableHead>Quarter</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Mode / Txn</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-20">
                                        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredPayments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-20 text-slate-500 font-medium">
                                        No payment records found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredPayments.map((payment) => {
                                    const StatusIcon = statusConfig[payment.status].icon
                                    const isPaid = payment.status === 'paid'
                                    const canMarkCash = payment.status === 'pending' || payment.status === 'overdue'

                                    return (
                                        <TableRow key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="text-xs text-slate-500">
                                                {format(new Date(payment.created_at), 'dd MMM yyyy')}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-semibold text-slate-900 text-sm">{payment.profiles?.full_name}</div>
                                                <div className="text-[10px] text-slate-400">{payment.profiles?.email}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-blue-50/50 text-blue-700 border-blue-100 font-mono text-xs">
                                                    {payment.profiles?.flat_number}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm font-medium text-slate-600">
                                                {payment.maintenance_periods?.name}
                                            </TableCell>
                                            <TableCell className="font-bold">
                                                ₹{Number(payment.amount).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`gap-1 text-[11px] font-bold ${statusConfig[payment.status].color}`}>
                                                    <StatusIcon className="h-3 w-3" />
                                                    {statusConfig[payment.status].label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {payment.transaction_id ? (
                                                    <div className="space-y-0.5">
                                                        <div className="text-[9px] font-bold text-slate-400 uppercase">Online</div>
                                                        <div className="text-[10px] font-mono text-blue-700 bg-blue-50 px-1 py-0.5 rounded border border-blue-100 inline-block max-w-[120px] truncate">
                                                            {payment.transaction_id}
                                                        </div>
                                                    </div>
                                                ) : payment.method === 'cash' ? (
                                                    <span className="text-xs font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">Cash</span>
                                                ) : (
                                                    <span className="text-xs text-slate-300">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {isPaid && payment.receipt_number && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleViewReceipt(payment)}
                                                            className="h-7 px-2 gap-1 text-[11px] font-semibold text-blue-700 border-blue-200 hover:bg-blue-50"
                                                        >
                                                            <Receipt className="h-3 w-3" /> Receipt
                                                        </Button>
                                                    )}
                                                    {canMarkCash && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => { setCashPayment(payment); setCashDialogOpen(true) }}
                                                            className="h-7 px-2 gap-1 text-[11px] font-semibold text-green-700 border-green-200 hover:bg-green-50"
                                                        >
                                                            <IndianRupee className="h-3 w-3" /> Cash Paid
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </Tabs>

            {/* ── Mark Cash Paid Dialog ─────────────────────────────────────────── */}
            <Dialog open={cashDialogOpen} onOpenChange={setCashDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <IndianRupee className="h-5 w-5 text-green-600" />
                            Confirm Cash Collection
                        </DialogTitle>
                        <DialogDescription>
                            This will mark the payment as paid and auto-generate a receipt.
                        </DialogDescription>
                    </DialogHeader>
                    {cashPayment && (
                        <div className="py-4 space-y-3">
                            <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm border">
                                {[
                                    ['Resident', cashPayment.profiles?.full_name],
                                    ['Flat', cashPayment.profiles?.flat_number],
                                    ['Quarter', cashPayment.maintenance_periods?.name],
                                    ['Amount', `₹${Number(cashPayment.amount).toLocaleString()}`],
                                ].map(([label, value]) => (
                                    <div key={label} className="flex justify-between">
                                        <span className="text-slate-500">{label}</span>
                                        <span className="font-semibold text-slate-800">{value}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500">
                                A receipt with today's date will be generated and saved.
                            </p>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCashDialogOpen(false)} disabled={markingCash}>Cancel</Button>
                        <Button
                            onClick={handleMarkCashPaid}
                            disabled={markingCash}
                            className="bg-green-600 hover:bg-green-700 gap-2"
                        >
                            {markingCash ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                            Confirm Cash Received
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Receipt Modal ─────────────────────────────────────────────────── */}
            <ReceiptModal
                open={receiptOpen}
                onClose={() => setReceiptOpen(false)}
                receipt={viewingReceipt}
            />
        </div>
    )
}
