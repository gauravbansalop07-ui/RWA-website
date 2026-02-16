import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { Plus, BarChart3, Clock, Trash2, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

type Poll = {
    id: string
    title: string
    description: string
    options: string[]
    expires_at: string | null
    created_at: string
    poll_votes: { option_index: number }[]
}

export default function Polls() {
    const [polls, setPolls] = useState<Poll[]>([])
    const [loading, setLoading] = useState(true)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // New Poll Form
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [options, setOptions] = useState(['', ''])
    const [expiryDate, setExpiryDate] = useState('')

    useEffect(() => {
        fetchPolls()

        const channel = supabase
            .channel('polls-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, () => fetchPolls())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, () => fetchPolls())
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const fetchPolls = async () => {
        const { data, error } = await supabase
            .from('polls')
            .select(`
                *,
                poll_votes (option_index)
            `)
            .order('created_at', { ascending: false })

        if (error) console.error('Error fetching polls:', error)
        else setPolls(data || [])
        setLoading(false)
    }

    const handleAddOption = () => setOptions([...options, ''])
    const handleRemoveOption = (index: number) => {
        if (options.length > 2) {
            const newOptions = [...options]
            newOptions.splice(index, 1)
            setOptions(newOptions)
        }
    }

    const handleCreatePoll = async () => {
        if (!title || options.some(opt => !opt)) return
        setSubmitting(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { error } = await supabase
                .from('polls')
                .insert({
                    title,
                    description,
                    options,
                    expires_at: expiryDate ? new Date(expiryDate).toISOString() : null,
                    created_by: user?.id
                })

            if (error) throw error
            setIsCreateDialogOpen(false)
            setTitle('')
            setDescription('')
            setOptions(['', ''])
            setExpiryDate('')
            fetchPolls()
        } catch (error: any) {
            alert(error.message)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDeletePoll = async (id: string) => {
        if (!confirm('Are you sure you want to delete this poll?')) return
        const { error } = await supabase.from('polls').delete().eq('id', id)
        if (error) alert(error.message)
        else fetchPolls()
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                        Community Polls
                    </h1>
                    <p className="text-muted-foreground mt-1">Gather feedback and make decisions together</p>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                            <Plus className="h-4 w-4" /> Create New Poll
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Create Society Poll</DialogTitle>
                            <DialogDescription>
                                Post a question to the community. Results are real-time.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Question / Title</Label>
                                <Input placeholder="e.g., Should we install EV Chargers?" value={title} onChange={e => setTitle(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Description (Optional)</Label>
                                <Input placeholder="Briefly explain the context..." value={description} onChange={e => setDescription(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Options</Label>
                                {options.map((opt, i) => (
                                    <div key={i} className="flex gap-2">
                                        <Input
                                            placeholder={`Option ${i + 1}`}
                                            value={opt}
                                            onChange={e => {
                                                const newOpts = [...options]
                                                newOpts[i] = e.target.value
                                                setOptions(newOpts)
                                            }}
                                        />
                                        {options.length > 2 && (
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveOption(i)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" className="w-full mt-2" onClick={handleAddOption}>
                                    Add Another Option
                                </Button>
                            </div>
                            <div className="space-y-2">
                                <Label>Expiry Date (Optional)</Label>
                                <Input type="datetime-local" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreatePoll} disabled={submitting}>
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish Poll"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {loading ? (
                    <div className="col-span-2 py-20 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                        <p className="text-slate-500 mt-2 font-medium">Loading polls...</p>
                    </div>
                ) : polls.length === 0 ? (
                    <div className="col-span-2 py-20 text-center border-2 border-dashed rounded-xl bg-slate-50">
                        <BarChart3 className="h-12 w-12 mx-auto text-slate-300" />
                        <p className="text-slate-500 mt-2 font-medium">No polls created yet</p>
                        <Button variant="link" onClick={() => setIsCreateDialogOpen(true)}>Create your first poll</Button>
                    </div>
                ) : (
                    polls.map(poll => {
                        const totalVotes = poll.poll_votes.length
                        const isExpired = poll.expires_at && new Date(poll.expires_at) < new Date()

                        return (
                            <Card key={poll.id} className="overflow-hidden border-slate-200 hover:shadow-md transition-shadow">
                                <CardHeader className="bg-slate-50/50 pb-4">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <CardTitle className="text-xl font-bold text-slate-900">{poll.title}</CardTitle>
                                            <CardDescription>{poll.description}</CardDescription>
                                        </div>
                                        <Badge variant={isExpired ? "secondary" : "outline"} className={isExpired ? "" : "bg-green-50 text-green-700 border-green-200"}>
                                            {isExpired ? "Closed" : "Active"}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-4">
                                    <div className="space-y-3">
                                        {poll.options.map((opt, i) => {
                                            const voteCount = poll.poll_votes.filter(v => v.option_index === i).length
                                            const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0

                                            return (
                                                <div key={i} className="space-y-1">
                                                    <div className="flex justify-between text-sm font-medium">
                                                        <span className="text-slate-700">{opt}</span>
                                                        <span className="text-slate-500">{voteCount} votes ({percentage}%)</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-500 transition-all duration-500"
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <div className="flex items-center justify-between pt-4 border-t text-xs text-slate-500 font-medium">
                                        <div className="flex items-center gap-4">
                                            <span className="flex items-center gap-1">
                                                <Plus className="h-3 w-3" /> {totalVotes} Total Votes
                                            </span>
                                            {poll.expires_at && (
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" /> Exp: {format(new Date(poll.expires_at), 'dd MMM, p')}
                                                </span>
                                            )}
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => handleDeletePoll(poll.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })
                )}
            </div>
        </div>
    )
}
