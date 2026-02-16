import { useEffect, useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import CitizenSidebar from './CitizenSidebar'

export default function CitizenLayout() {
    const [session, setSession] = useState<any>(null)
    const [loading, setLoading] = useState(true)



    useEffect(() => {
        // Get initial session
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

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session)
            if (session?.user) {
                await fetchUserRole(session.user.id)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const fetchUserRole = async (userId: string) => {
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
                // Redirect to complete profile if details missing for residents
                if (data.role === 'resident' && (!data.flat_number || !data.mobile)) {
                    window.location.href = '/complete-profile'
                    return
                }
            } else {
                // Try to create profile for OAuth users
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const { error: insertError } = await supabase
                        .from('profiles')
                        .insert({
                            id: user.id,
                            email: user.email,
                            full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
                            role: 'resident',
                            vehicle_count: 0,
                            vehicle_numbers: [],
                        })

                    if (!insertError) {
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
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        )
    }

    if (!session) {
        return <Navigate to="/login" replace />
    }

    // ALLOW admins to view citizen portal for testing purposes
    /* 
    if (userRole && ['super_admin', 'treasurer', 'collector'].includes(userRole)) {
        return <Navigate to="/admin" replace />
    }
    */

    return (
        <div className="flex h-screen bg-gray-100">
            <CitizenSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="flex h-16 items-center border-b bg-white px-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-800">Welcome, Resident</h2>
                </header>
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
