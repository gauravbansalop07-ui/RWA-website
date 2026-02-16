import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { CreditCard, AlertCircle, Megaphone, User } from 'lucide-react'

export default function CitizenDashboard() {
    const [stats, setStats] = useState({
        pendingPayments: 0,
        totalPaid: 0,
        myComplaints: 0,
        recentNotices: 0,
    })
    const [userInfo, setUserInfo] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()

        const paymentsChannel = supabase
            .channel('citizen-payments')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
                fetchDashboardData()
            })
            .subscribe()

        const complaintsChannel = supabase
            .channel('citizen-complaints')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => {
                fetchDashboardData()
            })
            .subscribe()

        const announcementsChannel = supabase
            .channel('citizen-announcements')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
                fetchDashboardData()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(paymentsChannel)
            supabase.removeChannel(complaintsChannel)
            supabase.removeChannel(announcementsChannel)
        }
    }, [])

    const fetchDashboardData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Fetch user profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            setUserInfo(profile)

            // Count pending payments
            const { count: pendingCount } = await supabase
                .from('payments')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .in('status', ['pending', 'overdue'])

            // Count paid payments
            const { count: paidCount } = await supabase
                .from('payments')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('status', 'paid')

            // Count my complaints
            const { count: complaintsCount } = await supabase
                .from('complaints')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)

            // Count recent notices (last 30 days)
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

            const { count: noticesCount } = await supabase
                .from('announcements')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', thirtyDaysAgo.toISOString())

            setStats({
                pendingPayments: pendingCount || 0,
                totalPaid: paidCount || 0,
                myComplaints: complaintsCount || 0,
                recentNotices: noticesCount || 0,
            })
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-green-900 to-green-700 bg-clip-text text-transparent">
                    Welcome Home!
                </h1>
                <p className="text-muted-foreground mt-1">Here's your community overview</p>
            </div>

            {/* User Info Card */}
            {userInfo && (
                <Card className="border-l-4 border-l-green-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Your Profile
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Name</p>
                                <p className="font-semibold">{userInfo.full_name || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Flat Number</p>
                                <Badge variant="outline" className="font-mono mt-1">
                                    {userInfo.flat_number || 'N/A'}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Email</p>
                                <p className="text-sm">{userInfo.email || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Mobile</p>
                                <p className="text-sm">{userInfo.mobile || 'N/A'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-orange-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                        <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                            <AlertCircle className="h-5 w-5 text-orange-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="text-3xl font-bold text-orange-600">{loading ? '-' : stats.pendingPayments}</div>
                            <a
                                href="/citizen/payments"
                                className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-[10px] font-bold shadow-sm transition-colors"
                            >
                                PAY NOW
                            </a>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Dues to be paid</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Paid</CardTitle>
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-green-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">{loading ? '-' : stats.totalPaid}</div>
                        <p className="text-xs text-muted-foreground mt-1">Completed payments</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">My Complaints</CardTitle>
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <AlertCircle className="h-5 w-5 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600">{loading ? '-' : stats.myComplaints}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total submissions</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Recent Notices</CardTitle>
                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <Megaphone className="h-5 w-5 text-purple-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-purple-600">{loading ? '-' : stats.recentNotices}</div>
                        <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <a
                            href="/citizen/payments"
                            className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-green-500 hover:bg-green-50 transition-colors"
                        >
                            <CreditCard className="h-8 w-8 text-green-600 mb-2" />
                            <span className="text-sm font-medium">View Payments</span>
                        </a>
                        <a
                            href="/citizen/complaints"
                            className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                        >
                            <AlertCircle className="h-8 w-8 text-blue-600 mb-2" />
                            <span className="text-sm font-medium">File Complaint</span>
                        </a>
                        <a
                            href="/citizen/notices"
                            className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-500 hover:bg-purple-50 transition-colors"
                        >
                            <Megaphone className="h-8 w-8 text-purple-600 mb-2" />
                            <span className="text-sm font-medium">Read Notices</span>
                        </a>
                        <a
                            href="/citizen/profile"
                            className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-slate-500 hover:bg-slate-50 transition-colors"
                        >
                            <User className="h-8 w-8 text-slate-600 mb-2" />
                            <span className="text-sm font-medium">My Profile</span>
                        </a>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
