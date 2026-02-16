import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { User, Home, Phone, Mail, Car, Plus, X, Save } from 'lucide-react'
import { format } from 'date-fns'

type Profile = {
    id: string
    email: string
    full_name: string
    flat_number: string
    mobile: string
    vehicle_count: number
    vehicle_numbers: string[]
    created_at: string
}

export default function CitizenProfile() {
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editedProfile, setEditedProfile] = useState<Profile | null>(null)

    useEffect(() => {
        fetchProfile()

        const setupSubscription = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const channel = supabase
                .channel(`citizen-profile-${user.id}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${user.id}`
                }, () => {
                    fetchProfile()
                })
                .subscribe()

            return channel
        }

        const subscriptionPromise = setupSubscription()

        return () => {
            subscriptionPromise.then(channel => {
                if (channel) supabase.removeChannel(channel)
            })
        }
    }, [])

    const fetchProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (error) throw error
            setProfile(data)
            setEditedProfile(data)
        } catch (error) {
            console.error('Error fetching profile:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!editedProfile) return
        setSaving(true)

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: editedProfile.full_name,
                    mobile: editedProfile.mobile,
                    vehicle_count: editedProfile.vehicle_count,
                    vehicle_numbers: editedProfile.vehicle_numbers.filter(v => v.trim() !== ''),
                })
                .eq('id', editedProfile.id)

            if (error) throw error

            setProfile(editedProfile)
            setEditing(false)
            alert('Profile updated successfully!')
        } catch (error) {
            console.error('Error updating profile:', error)
            alert('Failed to update profile')
        } finally {
            setSaving(false)
        }
    }

    const addVehicle = () => {
        if (!editedProfile) return
        setEditedProfile({
            ...editedProfile,
            vehicle_count: editedProfile.vehicle_count + 1,
            vehicle_numbers: [...editedProfile.vehicle_numbers, ''],
        })
    }

    const removeVehicle = (index: number) => {
        if (!editedProfile) return
        const newVehicles = editedProfile.vehicle_numbers.filter((_, i) => i !== index)
        setEditedProfile({
            ...editedProfile,
            vehicle_count: Math.max(0, editedProfile.vehicle_count - 1),
            vehicle_numbers: newVehicles,
        })
    }

    const updateVehicle = (index: number, value: string) => {
        if (!editedProfile) return
        const newVehicles = [...editedProfile.vehicle_numbers]
        newVehicles[index] = value.toUpperCase()
        setEditedProfile({
            ...editedProfile,
            vehicle_numbers: newVehicles,
        })
    }

    if (loading) {
        return <div className="flex items-center justify-center h-64">Loading profile...</div>
    }

    if (!profile) {
        return <div className="flex items-center justify-center h-64">Profile not found</div>
    }

    const displayProfile = editing ? editedProfile : profile

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-green-900 to-green-700 bg-clip-text text-transparent">
                        My Profile
                    </h1>
                    <p className="text-muted-foreground mt-1">Manage your personal information</p>
                </div>
                {!editing ? (
                    <Button onClick={() => setEditing(true)} className="bg-gradient-to-r from-green-600 to-emerald-600">
                        Edit Profile
                    </Button>
                ) : (
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => {
                            setEditedProfile(profile)
                            setEditing(false)
                        }}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-green-600 to-emerald-600">
                            <Save className="h-4 w-4 mr-2" />
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Personal Information */}
                <Card className="border-l-4 border-l-green-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Personal Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name</Label>
                            {editing ? (
                                <Input
                                    id="fullName"
                                    value={displayProfile?.full_name || ''}
                                    onChange={(e) => setEditedProfile(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                                />
                            ) : (
                                <p className="text-lg font-semibold">{displayProfile?.full_name}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                Email
                            </Label>
                            <p className="text-lg">{displayProfile?.email}</p>
                            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="mobile" className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                Mobile
                            </Label>
                            {editing ? (
                                <Input
                                    id="mobile"
                                    type="tel"
                                    value={displayProfile?.mobile || ''}
                                    onChange={(e) => setEditedProfile(prev => prev ? { ...prev, mobile: e.target.value } : null)}
                                />
                            ) : (
                                <p className="text-lg font-semibold">{displayProfile?.mobile}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Home className="h-4 w-4" />
                                Flat Number
                            </Label>
                            <Badge variant="outline" className="text-base font-mono">
                                {displayProfile?.flat_number}
                            </Badge>
                            <p className="text-xs text-muted-foreground">Contact admin to change flat number</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Vehicle Information */}
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Car className="h-5 w-5" />
                                Vehicle Information
                            </CardTitle>
                            {editing && (
                                <Button size="sm" variant="outline" onClick={addVehicle}>
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Vehicle
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Total Vehicles</Label>
                            <p className="text-3xl font-bold text-blue-600">{displayProfile?.vehicle_count || 0}</p>
                        </div>

                        {displayProfile && displayProfile.vehicle_numbers && displayProfile.vehicle_numbers.length > 0 ? (
                            <div className="space-y-2">
                                <Label>Registration Numbers</Label>
                                <div className="space-y-2">
                                    {displayProfile.vehicle_numbers.map((vehicle, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            {editing ? (
                                                <>
                                                    <Input
                                                        value={vehicle}
                                                        onChange={(e) => updateVehicle(index, e.target.value)}
                                                        placeholder={`Vehicle ${index + 1}`}
                                                        className="font-mono uppercase"
                                                    />
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => removeVehicle(index)}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <Badge variant="outline" className="text-base font-mono px-4 py-2">
                                                    {vehicle}
                                                </Badge>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <Car className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>No vehicles registered</p>
                                {editing && (
                                    <Button size="sm" variant="link" onClick={addVehicle} className="mt-2">
                                        Add your first vehicle
                                    </Button>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Account Information */}
            <Card>
                <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <Label className="text-muted-foreground">Account Type</Label>
                            <Badge className="mt-1 bg-green-100 text-green-800">Resident</Badge>
                        </div>
                        <div>
                            <Label className="text-muted-foreground">Member Since</Label>
                            <p className="mt-1 font-medium">
                                {profile.created_at ? format(new Date(profile.created_at), 'MMMM yyyy') : 'N/A'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
