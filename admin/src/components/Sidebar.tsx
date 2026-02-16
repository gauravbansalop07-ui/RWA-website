import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, CreditCard, FileText, MessageSquare, Megaphone, Heart, User, LogOut, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'

const sidebarItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
    { icon: Users, label: 'Residents', href: '/admin/residents' },
    { icon: CreditCard, label: 'Payments', href: '/admin/payments' },
    { icon: FileText, label: 'Expenses', href: '/admin/expenses' },
    { icon: MessageSquare, label: 'Complaints', href: '/admin/complaints' },
    { icon: Megaphone, label: 'Notices', href: '/admin/notices' },
    { icon: Heart, label: 'Events', href: '/admin/events' },
    { icon: User, label: 'Citizen View', href: '/citizen' }
]

export default function Sidebar() {
    const location = useLocation()
    const navigate = useNavigate()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        navigate('/login')
    }

    return (
        <div className="flex h-full w-64 flex-col bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700">
            {/* Logo Section */}
            <div className="flex h-16 items-center justify-center border-b border-slate-700 px-4">
                <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                        <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white">RWA Admin</h1>
                        <p className="text-xs text-slate-400">Management Portal</p>
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
                                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/50"
                                    : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                            )}
                        >
                            <Icon className="h-5 w-5" />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            {/* Logout Button */}
            <div className="p-3 border-t border-slate-700">
                <Button
                    variant="outline"
                    className="w-full justify-start gap-3 bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white"
                    onClick={handleLogout}
                >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                </Button>
            </div>
        </div>
    )
}
