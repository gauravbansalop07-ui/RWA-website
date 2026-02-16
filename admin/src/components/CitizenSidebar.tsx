import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Home, CreditCard, MessageSquare, Megaphone, User, LogOut, Building2, LayoutDashboard, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'

const sidebarItems = [
    { icon: Home, label: 'Home', href: '/citizen' },
    { icon: CreditCard, label: 'My Payments', href: '/citizen/payments' },
    { icon: MessageSquare, label: 'Complaints', href: '/citizen/complaints' },
    { icon: Megaphone, label: 'Notices', href: '/citizen/notices' },
    { icon: LayoutDashboard, label: 'Polls', href: '/citizen/polls' },
    { icon: CalendarDays, label: 'Facilities', href: '/citizen/facilities' },
    { icon: User, label: 'Profile', href: '/citizen/profile' }
]

export default function CitizenSidebar() {
    const location = useLocation()
    const navigate = useNavigate()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        navigate('/login')
    }

    return (
        <div className="flex h-full w-64 flex-col bg-gradient-to-b from-green-900 to-green-800 border-r border-green-700">
            {/* Logo Section */}
            <div className="flex h-16 items-center justify-center border-b border-green-700 px-4">
                <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
                        <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white">RWA Citizen</h1>
                        <p className="text-xs text-green-300">Resident Portal</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 p-3">
                {sidebarItems.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/50"
                                    : "text-green-100 hover:bg-green-700/50 hover:text-white"
                            )}
                        >
                            <Icon className="h-5 w-5" />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            {/* Logout Button */}
            <div className="p-3 border-t border-green-700">
                <Button
                    variant="outline"
                    className="w-full justify-start gap-3 bg-green-700/50 border-green-600 text-green-100 hover:bg-green-600 hover:text-white"
                    onClick={handleLogout}
                >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                </Button>
            </div>
        </div>
    )
}
