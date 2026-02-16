import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
    const navigate = useNavigate()
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Get the session from the URL hash
                const { data: { session }, error: sessionError } = await supabase.auth.getSession()

                if (sessionError) {
                    console.error('Session error:', sessionError)
                    throw sessionError
                }

                if (!session) {
                    throw new Error('No session found after OAuth callback')
                }

                console.log('OAuth session established:', session.user.email)

                // Check if profile exists, create if not
                const { data: profiles, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)

                if (profileError) {
                    console.error('Profile fetch error:', profileError)
                }

                let userRole = 'resident'
                let isProfileComplete = false

                if (!profiles || profiles.length === 0) {
                    // Create profile for Google OAuth user
                    console.log('Creating profile for OAuth user...')
                    const { error: insertError } = await supabase
                        .from('profiles')
                        .insert({
                            id: session.user.id,
                            email: session.user.email,
                            full_name: session.user.user_metadata?.full_name ||
                                session.user.user_metadata?.name ||
                                session.user.email?.split('@')[0] || 'User',
                            role: 'resident',
                            vehicle_count: 0,
                            vehicle_numbers: [],
                        })

                    if (insertError) {
                        console.error('Profile creation error:', insertError)
                        throw new Error('Failed to create user profile')
                    }
                } else {
                    userRole = profiles[0].role
                    isProfileComplete = !!(profiles[0].flat_number && profiles[0].mobile)
                }

                // Redirect logic
                if (userRole === 'super_admin' || userRole === 'treasurer' || userRole === 'collector') {
                    navigate('/admin', { replace: true })
                } else if (!isProfileComplete) {
                    navigate('/complete-profile', { replace: true })
                } else {
                    navigate('/citizen', { replace: true })
                }
            } catch (err: any) {
                console.error('Auth callback error:', err)
                setError(err.message || 'Authentication failed')
                setTimeout(() => {
                    navigate('/login', { replace: true })
                }, 3000)
            }
        }

        handleCallback()
    }, [navigate])

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="mb-4 text-red-600 text-lg font-semibold">Authentication Error</div>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <p className="text-sm text-gray-500">Redirecting to login...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Completing sign in...</p>
            </div>
        </div>
    )
}
