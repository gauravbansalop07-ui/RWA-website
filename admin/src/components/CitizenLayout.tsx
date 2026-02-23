import { useEffect, useState } from 'react'
import { Outlet, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import CitizenSidebar from './CitizenSidebar'
import { Clock, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CitizenLayout() {
    const [session, setSession] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [userName, setUserName] = useState<string>('')
    const [approvalStatus, setApprovalStatus] = useState<string | null>(null)
    const [flatLabel, setFlatLabel] = useState<string>('')
    const [isAdmin, setIsAdmin] = useState(false)
    const navigate = useNavigate()

    // Safety net: never let loading spin forever
    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 5000)
        return () => clearTimeout(timer)
    }, [])

    useEffect(() => {
        const initAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setSession(session)
            if (session?.user) {
                await fetchUserProfile(session.user.id)
            } else {
                setLoading(false)
            }
        }

        initAuth()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session)
            if (session?.user) {
                await fetchUserProfile(session.user.id)
            } else {
                setLoading(false)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const fetchUserProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle()

            if (error) {
                console.error('Profile fetch error:', error)
                setLoading(false)
                return
            }

            if (data) {
                setUserName(data.full_name || data.email || 'Resident')
                setApprovalStatus(data.approval_status || 'approved')

                // Detect admin roles — they bypass approval gate and get the Return button
                const adminRoles = ['super_admin', 'treasurer', 'collector', 'admin']
                const userIsAdmin = adminRoles.includes(data.role)
                setIsAdmin(userIsAdmin)

                // Build flat label
                if (data.floor_number && data.flat_number) {
                    setFlatLabel(`Floor ${data.floor_number} – Flat ${data.flat_number}`)
                } else if (data.flat_number) {
                    setFlatLabel(`Flat ${data.flat_number}`)
                }

                // Admins bypass approval checks completely
                if (!userIsAdmin) {
                    // If rejected, sign out immediately
                    if (data.approval_status === 'rejected') {
                        await supabase.auth.signOut()
                        navigate('/login')
                        return
                    }

                    // Redirect to complete profile if resident is missing required data
                    if (data.role === 'resident' && (!data.flat_number || !data.mobile)) {
                        navigate('/complete-profile', { replace: true })
                        return
                    }
                }
            } else {
                // Create minimal profile for OAuth users
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Resident'
                    const { error: insertError } = await supabase
                        .from('profiles')
                        .insert({
                            id: user.id,
                            email: user.email,
                            full_name: name,
                            role: 'resident',
                            approval_status: 'pending',
                            vehicle_count: 0,
                            vehicle_numbers: [],
                        })

                    if (!insertError) {
                        setUserName(name)
                        setApprovalStatus('pending')
                        navigate('/complete-profile', { replace: true })
                        return
                    }
                }
            }
        } catch (error) {
            console.error('Error in fetchUserProfile:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        )
    }

    if (!session) return <Navigate to="/login" replace />

    // ── Pending approval: inline gate screen (skip for admins) ───────────────────────────────────
    if (approvalStatus === 'pending' && !isAdmin) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="text-center max-w-sm space-y-4 p-8">
                    <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                        <Clock className="h-8 w-8 text-amber-600 animate-pulse" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Account Pending Approval</h2>
                    <p className="text-slate-600 text-sm leading-relaxed">
                        Your registration is under review by the RWA admin. You will have full access once your flat details are verified.
                    </p>
                    <p className="text-xs text-slate-400">For urgent access, contact your RWA management.</p>
                    <Button
                        variant="outline"
                        onClick={async () => { await supabase.auth.signOut(); navigate('/login') }}
                        className="w-full gap-2 text-slate-500 hover:text-red-600"
                    >
                        Sign Out
                    </Button>
                </div>
            </div>
        )
    }

    // ── Rejected: this shouldn't normally show (handled in fetchUserProfile above)
    if (approvalStatus === 'rejected' && !isAdmin) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="text-center max-w-sm space-y-4 p-8">
                    <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                        <XCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
                    <p className="text-slate-600 text-sm">Your registration was not approved. Please contact your RWA admin.</p>
                    <Button onClick={async () => { await supabase.auth.signOut(); navigate('/login') }} className="w-full">
                        Back to Login
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-screen bg-gray-100">
            <CitizenSidebar isAdmin={isAdmin} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm">
                    <div>
                        <h2 className="text-sm font-bold text-gray-900">
                            Welcome, <span className="text-green-700">{userName || 'Resident'}</span>
                        </h2>
                        {flatLabel && <p className="text-xs text-gray-400">{flatLabel}</p>}
                    </div>
                    <button
                        onClick={async () => { await supabase.auth.signOut(); navigate('/login') }}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors font-medium"
                    >
                        Sign Out
                    </button>
                </header>
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
