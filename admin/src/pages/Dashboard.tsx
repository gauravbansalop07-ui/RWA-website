import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import {
    Users,
    IndianRupee,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    ChevronRight,
    MessageSquare,
    Clock,
    AlertCircle
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

export default function Dashboard() {
    const [stats, setStats] = useState({
        residents: 0,
        pendingPayments: 0,
        openComplaints: 0,
        totalCollection: 0
    })
    const [loading, setLoading] = useState(true)
    const [recentPayments, setRecentPayments] = useState<any[]>([])
    const [recentComplaints, setRecentComplaints] = useState<any[]>([])

    useEffect(() => {
        fetchStats()
        fetchRecentActivity()

        // Subscribe to real-time changes
        const profilesChannel = supabase
            .channel('dashboard-profiles')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
                fetchStats()
            })
            .subscribe()

        const paymentsChannel = supabase
            .channel('dashboard-payments')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
                fetchStats()
                fetchRecentActivity()
            })
            .subscribe()

        const complaintsChannel = supabase
            .channel('dashboard-complaints')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => {
                fetchStats()
                fetchRecentActivity()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(profilesChannel)
            supabase.removeChannel(paymentsChannel)
            supabase.removeChannel(complaintsChannel)
        }
    }, [])

    const fetchStats = async () => {
        try {
            // 1. Count Residents
            const { count: residentsCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'resident')

            // 2. Count Pending Payments
            const { count: pendingCount } = await supabase
                .from('payments')
                .select('*', { count: 'exact', head: true })
                .in('status', ['pending', 'overdue'])

            // 3. Count Open Complaints
            const { count: complaintsCount } = await supabase
                .from('complaints')
                .select('*', { count: 'exact', head: true })
                .in('status', ['open', 'in_progress'])

            // 4. Calculate Total Collection
            const { data: paymentsData } = await supabase
                .from('payments')
                .select('amount')
                .eq('status', 'paid')

            const totalCollection = paymentsData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

            setStats({
                residents: residentsCount || 0,
                pendingPayments: pendingCount || 0,
                openComplaints: complaintsCount || 0,
                totalCollection: totalCollection
            })
        } catch (error) {
            console.error('Error fetching dashboard stats:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchRecentActivity = async () => {
        try {
            // Fetch 5 most recent payments
            const { data: payments } = await supabase
                .from('payments')
                .select(`
                    id,
                    amount,
                    status,
                    created_at,
                    profiles:user_id (full_name, flat_number)
                `)
                .order('created_at', { ascending: false })
                .limit(5)

            // Fetch 5 most recent complaints
            const { data: complaints } = await supabase
                .from('complaints')
                .select(`
                    id,
                    title,
                    status,
                    created_at,
                    profiles:user_id (full_name, flat_number)
                `)
                .order('created_at', { ascending: false })
                .limit(5)

            setRecentPayments(payments || [])
            setRecentComplaints(complaints || [])
        } catch (error) {
            console.error('Error fetching recent activity:', error)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                        RWA Pocket 19 Dashboard
                    </h1>
                    <p className="text-muted-foreground mt-1">Overview of your community management operations.</p>
                </div>
            </div>

            {/* Test CTA */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold">New Feature: UPI Payments for Residents</h2>
                    <p className="text-blue-100/80 text-sm">We've added direct UPI pay and QR codes for residents. Since you're an admin, use the button below to test it as a resident would.</p>
                </div>
                <Button
                    asChild
                    className="bg-white text-blue-600 hover:bg-blue-50 font-bold whitespace-nowrap"
                >
                    <Link to="/citizen/payments">
                        Test Resident View
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Total Residents Card */}
                <Link to="/admin/residents">
                    <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all cursor-pointer group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Residents</CardTitle>
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Users className="h-5 w-5 text-blue-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{loading ? '-' : stats.residents}</div>
                            <p className="text-xs text-muted-foreground flex items-center justify-between mt-1">
                                <span className="flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3 text-green-600" /> Registered in system
                                </span>
                                <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </p>
                        </CardContent>
                    </Card>
                </Link>

                {/* Pending Payments Card */}
                <Link to="/admin/payments?status=pending">
                    <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-all cursor-pointer group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <IndianRupee className="h-5 w-5 text-orange-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-orange-600">{loading ? '-' : stats.pendingPayments}</div>
                            <p className="text-xs text-muted-foreground flex items-center justify-between mt-1">
                                <span className="flex items-center gap-1">
                                    <ArrowUpRight className="h-3 w-3 text-orange-600" /> Unpaid maintenance
                                </span>
                                <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </p>
                        </CardContent>
                    </Card>
                </Link>

                {/* Open Complaints Card */}
                <Link to="/admin/complaints?status=open">
                    <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-all cursor-pointer group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Open Complaints</CardTitle>
                            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <MessageSquare className="h-5 w-5 text-red-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-red-600">{loading ? '-' : stats.openComplaints}</div>
                            <p className="text-xs text-muted-foreground flex items-center justify-between mt-1">
                                <span className="flex items-center gap-1">
                                    <ArrowDownRight className="h-3 w-3 text-red-600" /> Requires attention
                                </span>
                                <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </p>
                        </CardContent>
                    </Card>
                </Link>

                {/* Total Collection Card */}
                <Link to="/admin/payments">
                    <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-all cursor-pointer group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Collection</CardTitle>
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <IndianRupee className="h-5 w-5 text-green-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-600">
                                {loading ? '-' : `₹${stats.totalCollection.toLocaleString()}`}
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center justify-between mt-1">
                                <span className="flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3 text-green-600" /> Total Revenue
                                </span>
                                <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </p>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Recent Payments Section */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Recent Payments</CardTitle>
                            <CardDescription>Latest maintenance collections</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                            <Link to="/admin/payments" className="text-blue-600 hover:text-blue-700">View All</Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentPayments.length === 0 ? (
                                <p className="text-center py-4 text-muted-foreground">No recent payments</p>
                            ) : (
                                recentPayments.map((payment) => (
                                    <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-50 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${payment.status === 'paid' ? 'bg-green-100' : 'bg-yellow-100'}`}>
                                                <IndianRupee className={`h-4 w-4 ${payment.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">{payment.profiles?.full_name}</p>
                                                <p className="text-[10px] text-slate-500">Flat {payment.profiles?.flat_number} • {format(new Date(payment.created_at), 'dd MMM')}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-slate-900">₹{Number(payment.amount).toLocaleString()}</p>
                                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${payment.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                                                {payment.status.toUpperCase()}
                                            </Badge>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Complaints Section */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Recent Complaints</CardTitle>
                            <CardDescription>Latest resident issues requiring attention</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                            <Link to="/admin/complaints" className="text-blue-600 hover:text-blue-700">View All</Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentComplaints.length === 0 ? (
                                <p className="text-center py-4 text-muted-foreground">No recent complaints</p>
                            ) : (
                                recentComplaints.map((complaint) => (
                                    <div key={complaint.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-50 hover:bg-slate-50 transition-colors">
                                        <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center ${complaint.status === 'open' ? 'bg-red-100' : 'bg-blue-100'}`}>
                                            {complaint.status === 'open' ? <AlertCircle className="h-4 w-4 text-red-600" /> : <Clock className="h-4 w-4 text-blue-600" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <p className="text-sm font-semibold text-slate-900 truncate">{complaint.title}</p>
                                                <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{format(new Date(complaint.created_at), 'dd MMM')}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 mb-2">Resident: {complaint.profiles?.full_name} ({complaint.profiles?.flat_number})</p>
                                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${complaint.status === 'open' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                                {complaint.status.replace('_', ' ').toUpperCase()}
                                            </Badge>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
