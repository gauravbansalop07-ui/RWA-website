import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Building2, Clock, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PendingApproval() {
    const navigate = useNavigate()

    useEffect(() => {
        // If the user is somehow approved already (e.g. admin approved very quickly), redirect them
        const checkStatus = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { navigate('/login'); return }

            const { data } = await supabase
                .from('profiles')
                .select('approval_status')
                .eq('id', user.id)
                .single()

            if (data?.approval_status === 'approved') {
                navigate('/citizen')
            } else if (data?.approval_status === 'rejected') {
                await supabase.auth.signOut()
                navigate('/login')
            }
        }

        checkStatus()

        // Poll every 30 seconds in case admin approves while the page is open
        const interval = setInterval(checkStatus, 30000)
        return () => clearInterval(interval)
    }, [navigate])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        navigate('/login')
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0YzMuMzE0IDAgNiAyLjY4NiA2IDZzLTIuNjg2IDYtNiA2LTYtMi42ODYtNi02IDIuNjg2LTYgNi02ek0yNCA0NGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>

            <div className="relative z-10 w-full max-w-md text-center space-y-6">
                {/* Icon */}
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-xl">
                    <Building2 className="h-10 w-10 text-white" />
                </div>

                {/* Card */}
                <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8 space-y-5">
                    <div className="flex items-center justify-center gap-2 text-amber-600">
                        <Clock className="h-5 w-5 animate-pulse" />
                        <span className="text-sm font-bold uppercase tracking-wider">Pending Approval</span>
                    </div>

                    <h1 className="text-2xl font-bold text-slate-900">
                        Registration Submitted!
                    </h1>

                    <p className="text-slate-600 leading-relaxed text-sm">
                        Your registration has been received and is awaiting approval from the RWA management. You will be able to access the portal once an admin approves your account.
                    </p>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left space-y-2">
                        <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">What happens next?</p>
                        <ul className="text-sm text-amber-700 space-y-1 list-none">
                            <li>① The RWA admin will verify your flat details</li>
                            <li>② You'll get access immediately after approval</li>
                            <li>③ This page auto-refreshes every 30 seconds</li>
                        </ul>
                    </div>

                    <p className="text-xs text-slate-400">
                        For urgent access, contact your RWA management directly.
                    </p>

                    <Button
                        variant="ghost"
                        onClick={handleSignOut}
                        className="w-full gap-2 text-slate-500 hover:text-red-600 hover:bg-red-50"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </Button>
                </div>
            </div>
        </div>
    )
}
