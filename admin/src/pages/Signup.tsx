import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { Building2, Mail, Lock, User, Phone, Car, Layers } from 'lucide-react'

export default function Signup() {
    const [fullName, setFullName] = useState('')
    const [phone, setPhone] = useState('')
    const [floorNumber, setFloorNumber] = useState('')
    const [flatNumber, setFlatNumber] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [vehicleCount, setVehicleCount] = useState('0')
    const [vehicleNumbers, setVehicleNumbers] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const navigate = useNavigate()

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const floor = parseInt(floorNumber)
        const flat = flatNumber.trim()

        if (!floor || floor < 0) {
            setError('Please enter a valid floor number.')
            setLoading(false)
            return
        }
        if (!flat) {
            setError('Please enter your flat number.')
            setLoading(false)
            return
        }
        if (!phone.trim() || phone.trim().length < 10) {
            setError('Please enter a valid 10-digit phone number.')
            setLoading(false)
            return
        }

        try {
            // ── Step 1: Check if floor+flat is already registered ──────────────
            const { data: flatAvailable, error: flatCheckError } = await supabase
                .rpc('check_flat_availability', { p_floor: floor, p_flat: flat })

            if (flatCheckError) {
                console.warn('Flat check RPC failed, proceeding:', flatCheckError.message)
            } else if (flatAvailable === false) {
                setError(`Floor ${floor} – Flat ${flat} is already registered. If you are the resident, please contact your RWA admin.`)
                setLoading(false)
                return
            }

            // ── Step 2: Check if phone is already registered ───────────────────
            const { data: phoneAvailable, error: phoneCheckError } = await supabase
                .rpc('check_phone_availability', { p_phone: phone.trim() })

            if (phoneCheckError) {
                console.warn('Phone check RPC failed, proceeding:', phoneCheckError.message)
            } else if (phoneAvailable === false) {
                setError('This phone number is already registered. Please use a different number or contact your RWA admin.')
                setLoading(false)
                return
            }

            // ── Step 3: Create auth account ────────────────────────────────────
            const signupEmail = email.trim() || `${phone.trim()}@rwa.local`
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: signupEmail,
                password,
            })

            if (authError) throw authError
            if (!authData.user) throw new Error('Account creation failed. Please try again.')

            // ── Step 4: Insert profile with pending approval ───────────────────
            const compositeFlatId = `${floor}-${flat}`
            const validVehicles = vehicleNumbers.filter(v => v.trim() !== '')

            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: authData.user.id,
                    email: email.trim() || null,
                    full_name: fullName.trim(),
                    mobile: phone.trim(),
                    floor_number: floor,
                    flat_number: flat,
                    composite_flat_id: compositeFlatId,
                    role: 'resident',
                    approval_status: 'pending',
                    vehicle_count: parseInt(vehicleCount) || 0,
                    vehicle_numbers: validVehicles,
                })

            if (profileError) {
                // Handle uniqueness constraint violation gracefully
                if (profileError.message.includes('profiles_composite_flat_id_unique')) {
                    setError(`Floor ${floor} – Flat ${flat} is already registered.`)
                } else if (profileError.message.includes('profiles_mobile_unique')) {
                    setError('This phone number is already registered.')
                } else {
                    throw new Error(profileError.message)
                }
                setLoading(false)
                return
            }

            // ── Step 5: Success — go to pending approval screen ───────────────
            navigate('/pending-approval')
        } catch (err: any) {
            console.error('Signup error:', err)
            setError(err.message || 'Failed to sign up. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleVehicleCountChange = (count: string) => {
        const num = parseInt(count) || 0
        setVehicleCount(count)
        setVehicleNumbers(prev => {
            const next = [...prev]
            while (next.length < num) next.push('')
            return next.slice(0, num)
        })
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0YzMuMzE0IDAgNiAyLjY4NiA2IDZzLTIuNjg2IDYtNiA2LTYtMi42ODYtNi02IDIuNjg2LTYgNi02ek0yNCA0NGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>

            <Card className="w-full max-w-md relative z-10 shadow-2xl border-slate-700 bg-white/95 backdrop-blur">
                <CardHeader className="space-y-3 text-center pb-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                        <Building2 className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                        Resident Registration
                    </CardTitle>
                    <CardDescription>
                        Register your flat — admin approval required to access the portal
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSignup} className="space-y-4">

                        {/* Full Name */}
                        <div className="space-y-1.5">
                            <Label htmlFor="fullName">Full Name <span className="text-red-500">*</span></Label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input id="fullName" type="text" placeholder="e.g. Ramesh Kumar"
                                    value={fullName} onChange={e => setFullName(e.target.value)}
                                    required className="pl-10 h-11 text-base" />
                            </div>
                        </div>

                        {/* Phone */}
                        <div className="space-y-1.5">
                            <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input id="phone" type="tel" placeholder="10-digit mobile number"
                                    value={phone} onChange={e => setPhone(e.target.value)}
                                    required className="pl-10 h-11 text-base" maxLength={10} />
                            </div>
                        </div>

                        {/* Floor + Flat — side by side, large inputs */}
                        <div className="space-y-1.5">
                            <Label>Flat Location <span className="text-red-500">*</span></Label>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="relative">
                                    <Layers className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input id="floorNumber" type="number" placeholder="Floor No."
                                        value={floorNumber} onChange={e => setFloorNumber(e.target.value)}
                                        required min="0" max="99" className="pl-10 h-11 text-base" />
                                </div>
                                <Input id="flatNumber" type="text" placeholder="Flat No. (e.g. 12)"
                                    value={flatNumber} onChange={e => setFlatNumber(e.target.value)}
                                    required className="h-11 text-base" />
                            </div>
                            {floorNumber && flatNumber && (
                                <p className="text-xs text-blue-600 font-medium">
                                    Your flat ID: <strong>Floor {floorNumber} – Flat {flatNumber}</strong>
                                </p>
                            )}
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input id="password" type="password" placeholder="Create a password (min 6 chars)"
                                    value={password} onChange={e => setPassword(e.target.value)}
                                    required minLength={6} className="pl-10 h-11" />
                            </div>
                        </div>

                        {/* Email — optional */}
                        <div className="space-y-1.5">
                            <Label htmlFor="email" className="flex items-center gap-2">
                                Email Address
                                <span className="text-xs text-slate-400 font-normal">(optional)</span>
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input id="email" type="email" placeholder="you@example.com (optional)"
                                    value={email} onChange={e => setEmail(e.target.value)}
                                    className="pl-10 h-11" />
                            </div>
                        </div>

                        {/* Vehicles */}
                        <div className="space-y-2 bg-slate-50 p-3 rounded-lg border">
                            <Label className="flex items-center gap-2 text-sm">
                                <Car className="h-4 w-4" /> Number of Vehicles
                                <span className="text-xs text-slate-400 font-normal ml-auto">(0 if none)</span>
                            </Label>
                            <Input type="number" min="0" max="5" value={vehicleCount}
                                onChange={e => handleVehicleCountChange(e.target.value)}
                                className="h-10 w-24" />
                            {vehicleNumbers.map((v, i) => (
                                <Input key={i} type="text" placeholder={`Vehicle ${i + 1} reg. no.`}
                                    value={v}
                                    onChange={e => {
                                        const updated = [...vehicleNumbers]
                                        updated[i] = e.target.value.toUpperCase()
                                        setVehicleNumbers(updated)
                                    }}
                                    className="h-10 text-sm font-mono uppercase" />
                            ))}
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                                {error}
                            </div>
                        )}

                        <Button type="submit" disabled={loading}
                            className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-semibold shadow-lg">
                            {loading ? 'Checking & Registering...' : 'Register My Flat'}
                        </Button>

                        <div className="text-center text-sm text-slate-600">
                            Already have an account?{' '}
                            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">Sign In</Link>
                        </div>
                        <p className="text-center text-xs text-slate-400">
                            Your account will be reviewed by the RWA admin before access is granted.
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
