import { useEffect, useState } from 'react'
import { Outlet, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import Sidebar from './Sidebar'

export default function ProtectedLayout() {
    const [session, setSession] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [userRole, setUserRole] = useState<string | null>(null)
    const [userName, setUserName] = useState<string>('')
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
                await fetchUserRole(session.user.id)
            } else {
                setLoading(false)
            }
        }

        initAuth()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session)
            if (session?.user) {
                await fetchUserRole(session.user.id)
            } else {
                setUserRole(null)
                setUserName('')
                setLoading(false)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const fetchUserRole = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role, full_name')
                .eq('id', userId)
                .maybeSingle()

            if (error) {
                console.error('Profile fetch error:', error)
                setLoading(false)
                return
            }

            if (data) {
                setUserRole(data.role)
                setUserName(data.full_name || 'Admin')
            } else {
                // Try to create profile for OAuth users
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Admin'
                    const { error: insertError } = await supabase
                        .from('profiles')
                        .insert({
                            id: user.id,
                            email: user.email,
                            full_name: name,
                            role: 'resident',
                            vehicle_count: 0,
                            vehicle_numbers: [],
                        })

                    if (!insertError) {
                        setUserRole('resident')
                        setUserName(name)
                    }
                }
            }
        } catch (error) {
            console.error('Error in fetchUserRole:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        )
    }

    if (!session) {
        return <Navigate to="/login" replace />
    }

    // Redirect residents to citizen portal
    if (userRole === 'resident') {
        return <Navigate to="/citizen" replace />
    }

    // Only allow admin roles
    if (userRole && !['super_admin', 'treasurer', 'collector'].includes(userRole)) {
        return <Navigate to="/citizen" replace />
    }

    const roleLabel = userRole === 'super_admin' ? 'Super Admin' : userRole === 'treasurer' ? 'Treasurer' : userRole === 'collector' ? 'Collector' : 'Admin'

    return (
        <div className="flex h-screen bg-gray-100">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm">
                    <div>
                        <h2 className="text-sm font-bold text-gray-900">{userName || 'Admin'}</h2>
                        <p className="text-xs text-gray-400">{roleLabel}</p>
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
