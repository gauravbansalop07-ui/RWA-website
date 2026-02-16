import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { Building2, Phone, Home, Car } from 'lucide-react'

export default function CompleteProfile() {
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [fullName, setFullName] = useState('')
    const [flatNumber, setFlatNumber] = useState('')
    const [mobile, setMobile] = useState('')
    const [vehicleCount, setVehicleCount] = useState('0')
    const [vehicleNumbers, setVehicleNumbers] = useState<string[]>([''])
    const [error, setError] = useState('')
    const navigate = useNavigate()

    useEffect(() => {
        checkUser()
    }, [])

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            navigate('/login')
            return
        }

        setFullName(user.user_metadata?.full_name || user.user_metadata?.name || '')
        setLoading(false)
    }

    const handleVehicleCountChange = (value: string) => {
        const count = parseInt(value) || 0
        setVehicleCount(value)
        const newNumbers = [...vehicleNumbers]
        while (newNumbers.length < count) newNumbers.push('')
        if (newNumbers.length > count) newNumbers.length = count
        setVehicleNumbers(newNumbers)
    }

    const updateVehicleNumber = (index: number, value: string) => {
        const newNumbers = [...vehicleNumbers]
        newNumbers[index] = value.toUpperCase()
        setVehicleNumbers(newNumbers)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        setError('')

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const validVehicleNumbers = vehicleNumbers.filter(n => n.trim() !== '')

            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    flat_number: flatNumber,
                    mobile: mobile,
                    vehicle_count: parseInt(vehicleCount) || 0,
                    vehicle_numbers: validVehicleNumbers,
                })
                .eq('id', user.id)

            if (profileError) throw profileError

            navigate('/citizen')
        } catch (err: any) {
            console.error('Error completing profile:', err)
            setError(err.message || 'Failed to update profile')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-lg shadow-xl border-slate-200">
                <CardHeader className="space-y-3 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-600">
                        <Building2 className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Complete Your Profile</CardTitle>
                    <CardDescription>
                        Welcome! Please provide a few more details to access the community portal.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="fullName">Full Name</Label>
                                <Input
                                    id="fullName"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mobile">Mobile Number</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="mobile"
                                        className="pl-10"
                                        placeholder="Enter 10 digit number"
                                        value={mobile}
                                        onChange={(e) => setMobile(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="flatNumber">Flat / Address Details</Label>
                            <div className="relative">
                                <Home className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    id="flatNumber"
                                    className="pl-10"
                                    placeholder="e.g., A-402, Sunshine Residency"
                                    value={flatNumber}
                                    onChange={(e) => setFlatNumber(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-2">
                                    <Car className="h-4 w-4" />
                                    Vehicle Details
                                </Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="10"
                                    className="w-20"
                                    value={vehicleCount}
                                    onChange={(e) => handleVehicleCountChange(e.target.value)}
                                />
                            </div>

                            {vehicleNumbers.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {vehicleNumbers.map((num, idx) => (
                                        <div key={idx} className="relative">
                                            <Input
                                                placeholder={`Vehicle ${idx + 1} Reg #`}
                                                value={num}
                                                onChange={(e) => updateVehicleNumber(idx, e.target.value)}
                                                className="font-mono uppercase"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg text-center">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-semibold shadow-lg transition-all"
                            disabled={submitting}
                        >
                            {submitting ? 'Saving...' : 'Access Dashboard'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
