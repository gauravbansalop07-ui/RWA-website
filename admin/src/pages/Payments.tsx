import { useEffect, useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import {
    Search,
    CheckCircle,
    XCircle,
    Clock,
    IndianRupee,
    Download,
    Plus,
    CheckCircle2,
    Smartphone
} from 'lucide-react'
import { format } from 'date-fns'

type Payment = {
    id: string
    user_id: string
    period_id: string
    amount: number
    status: 'pending' | 'paid' | 'cash_requested' | 'overdue'
    method: 'online' | 'cash' | null
    transaction_id: string | null
    receipt_url: string | null
    paid_at: string | null
    created_at: string
    profiles: {
        full_name: string
        flat_number: string
        email: string
    }
    maintenance_periods: {
        name: string
    }
}

type Period = {
    id: string
    name: string
    amount: number
    due_date: string
}

const statusConfig = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
    paid: { label: 'Paid', color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
    cash_requested: { label: 'Cash Requested', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: IndianRupee },
    overdue: { label: 'Overdue', color: 'bg-red-100 text-red-800 border-red-300', icon: XCircle },
}

export default function Payments() {
    const [payments, setPayments] = useState<Payment[]>([])
    const [periods, setPeriods] = useState<Period[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter] = useState('all')
    const [activeTab, setActiveTab] = useState('all')
    const [isPeriodDialogOpen, setIsPeriodDialogOpen] = useState(false)

    // New Period Form
    const [periodName, setPeriodName] = useState('')
    const [periodAmount, setPeriodAmount] = useState('900')
    const [periodDueDate, setPeriodDueDate] = useState('')
    const [stats, setStats] = useState({
        total: 0,
        cashRequests: 0,
        collected: 0,
        pending: 0,
        defaulters: 0
    })

    useEffect(() => {
        fetchInitialData()

        const channel = supabase
            .channel('payments-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
                fetchPayments()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const fetchInitialData = async () => {
        setLoading(true)
        await Promise.all([fetchPayments(), fetchPeriods()])
        setLoading(false)
    }

    const fetchPayments = async () => {
        const { data } = await supabase
            .from('payments')
            .select(`
                *,
                profiles (full_name, flat_number, email),
                maintenance_periods (name)
            `)
            .order('created_at', { ascending: false })
        setPayments(data || [])

        // Update stats
        if (data) {
            setStats({
                total: data.length,
                cashRequests: data.filter(p => p.status === 'cash_requested').length,
                collected: data.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0),
                pending: data.filter(p => p.status === 'pending' || p.status === 'overdue').reduce((sum, p) => sum + Number(p.amount), 0),
                defaulters: data.filter(p => p.status === 'overdue').length
            })
        }
    }

    const fetchPeriods = async () => {
        const { data } = await supabase
            .from('maintenance_periods')
            .select('*')
            .order('created_at', { ascending: false })
        setPeriods(data || [])
    }

    const createPeriodAndBills = async () => {
        try {
            // 1. Create the period
            const { data: period, error: pError } = await supabase
                .from('maintenance_periods')
                .insert({
                    name: periodName,
                    amount: parseFloat(periodAmount),
                    due_date: periodDueDate
                })
                .select()
                .single()

            if (pError) throw pError

            // 2. Fetch all residents
            const { data: residents } = await supabase
                .from('profiles')
                .select('id')
                .eq('role', 'resident')

            if (residents && residents.length > 0) {
                // 3. Create a payment record for each resident
                const bills = residents.map(r => ({
                    user_id: r.id,
                    period_id: period.id,
                    amount: parseFloat(periodAmount),
                    status: 'pending'
                }))

                const { error: bError } = await supabase
                    .from('payments')
                    .insert(bills)

                if (bError) throw bError
            }

            alert(`Billed ${residents?.length || 0} residents for ${periodName}`)
            setIsPeriodDialogOpen(false)
            fetchInitialData()
        } catch (error: any) {
            console.error('Error creating bills:', error)
            alert(error.message)
        }
    }

    const handleApprovePayment = async (paymentId: string) => {
        const { error } = await supabase
            .from('payments')
            .update({ status: 'paid', method: 'cash', paid_at: new Date().toISOString() })
            .eq('id', paymentId)
        if (!error) fetchPayments()
    }

    const filteredPayments = payments.filter(payment => {
        const matchesSearch =
            (payment.profiles?.full_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (payment.profiles?.flat_number?.toLowerCase() || '').includes(search.toLowerCase())
        const matchesStatus = statusFilter === 'all' || payment.status === statusFilter
        const matchesTab = activeTab === 'all'
            ? true
            : activeTab === 'defaulters'
                ? payment.status === 'overdue' || payment.status === 'pending'
                : payment.status === activeTab
        return matchesSearch && matchesStatus && matchesTab
    })

    /* Removing duplicate stats calculation since we now use state stats */

    return (
        <div className="space-y-6">
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
                                    <Input placeholder="e.g., Q1 2024 (Jan - Mar)" value={periodName} onChange={e => setPeriodName(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Amount (₹)</Label>
                                        <Input type="number" placeholder="2500" value={periodAmount} onChange={e => setPeriodAmount(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Due Date</Label>
                                        <Input type="date" value={periodDueDate} onChange={e => setPeriodDueDate(e.target.value)} />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsPeriodDialogOpen(false)}>Cancel</Button>
                                <Button onClick={createPeriodAndBills}>Generate Bills</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Button variant="outline" className="gap-2">
                        <Download className="h-4 w-4" /> Export
                    </Button>
                </div>
            </div>

            {/* Summary Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-sm border-l-4 border-l-blue-500">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-xs font-bold text-slate-500 uppercase">Requests</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-blue-600">{stats.cashRequests}</div>
                        <p className="text-[10px] text-slate-400">Cash approvals pending</p>
                    </CardContent>
                </Card>
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
                <Card className="shadow-sm border-l-4 border-l-slate-400">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-xs font-bold text-slate-500 uppercase">Cycles</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-slate-700">{periods.length}</div>
                        <p className="text-[10px] text-slate-400">Billing periods active</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <TabsList className="bg-white border shadow-sm h-11 px-1">
                        <TabsTrigger value="all">All Transactions</TabsTrigger>
                        <TabsTrigger value="defaulters" className="text-red-600">Defaulters</TabsTrigger>
                        <TabsTrigger value="cash_requested" className="text-blue-600">Requests</TabsTrigger>
                        <TabsTrigger value="pending" className="text-yellow-600">Pending</TabsTrigger>
                        <TabsTrigger value="paid" className="text-green-600">Paid</TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2 bg-white border rounded-lg px-2 py-1 shadow-sm w-full sm:w-auto">
                        <Search className="h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search resident or flat..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="border-none shadow-none focus-visible:ring-0 h-8"
                        />
                    </div>
                </div>

                <Card className="shadow-sm border-slate-200 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50">
                                <TableHead className="w-[120px]">Date</TableHead>
                                <TableHead>Resident</TableHead>
                                <TableHead>Flat</TableHead>
                                <TableHead>Billing Cycle</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Tracking</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-20">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
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
                                    return (
                                        <TableRow key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="text-xs text-slate-500">
                                                {format(new Date(payment.created_at), 'dd MMM yyyy')}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-semibold text-slate-900">{payment.profiles?.full_name}</div>
                                                <div className="text-[10px] text-slate-400">{payment.profiles?.email}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-blue-50/50 text-blue-700 border-blue-100 font-mono">
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
                                                <Badge variant="outline" className={`gap-1 ${statusConfig[payment.status].color}`}>
                                                    <StatusIcon className="h-3 w-3" />
                                                    {statusConfig[payment.status].label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {payment.transaction_id ? (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1">
                                                            <Smartphone className="h-3 w-3 text-blue-500" />
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">UPI</span>
                                                        </div>
                                                        <div className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 inline-block">
                                                            {payment.transaction_id}
                                                        </div>
                                                    </div>
                                                ) : payment.status === 'cash_requested' ? (
                                                    <div className="flex items-center gap-1">
                                                        <IndianRupee className="h-3 w-3 text-orange-500" />
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Cash</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-300">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {payment.status === 'cash_requested' ? (
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700 h-8 gap-1"
                                                        onClick={() => handleApprovePayment(payment.id)}
                                                    >
                                                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                                                    </Button>
                                                ) : payment.status === 'paid' ? (
                                                    <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-100">
                                                        Settled
                                                    </Badge>
                                                ) : (
                                                    <Button variant="ghost" size="sm" className="h-8 text-slate-400" disabled>
                                                        Details
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </Tabs>
        </div>
    )
}
