import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { BarChart3, Clock, CheckCircle, Loader2, Info } from 'lucide-react'
import { format } from 'date-fns'

type Poll = {
    id: string
    title: string
    description: string
    options: string[]
    expires_at: string | null
    created_at: string
    poll_votes: { option_index: number, user_id: string }[]
}

export default function CitizenPolls() {
    const [polls, setPolls] = useState<Poll[]>([])
    const [loading, setLoading] = useState(true)
    const [votingId, setVotingId] = useState<string | null>(null)
    const [userId, setUserId] = useState<string | null>(null)

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUserId(user?.id || null)
            fetchPolls()
        }
        init()

        const channel = supabase
            .channel('polls-citizen-changes')
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
                poll_votes (option_index, user_id)
            `)
            .order('created_at', { ascending: false })

        if (error) console.error('Error fetching polls:', error)
        else setPolls(data || [])
        setLoading(false)
    }

    const handleVote = async (pollId: string, optionIndex: number) => {
        if (!userId) return
        setVotingId(pollId)

        try {
            const { error } = await supabase
                .from('poll_votes')
                .insert({
                    poll_id: pollId,
                    user_id: userId,
                    option_index: optionIndex
                })

            if (error) throw error
            fetchPolls()
        } catch (error: any) {
            alert(error.message || "Failed to cast vote")
        } finally {
            setVotingId(null)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-green-900 to-green-700 bg-clip-text text-transparent">
                    Society Decides
                </h1>
                <p className="text-muted-foreground mt-1">Participate in community polls and share your voice</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {loading ? (
                    <div className="col-span-2 py-20 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600" />
                        <p className="text-slate-500 mt-2 font-medium">Loading society polls...</p>
                    </div>
                ) : polls.length === 0 ? (
                    <Card className="col-span-2 border-dashed border-2 bg-slate-50/50">
                        <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                            <Info className="h-10 w-10 text-slate-300" />
                            <div className="text-center">
                                <p className="text-lg font-bold text-slate-500">No Active Polls</p>
                                <p className="text-sm text-slate-400">Check back later for new society decisions</p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    polls.map(poll => {
                        const hasVoted = poll.poll_votes.some(v => v.user_id === userId)
                        const totalVotes = poll.poll_votes.length
                        const isExpired = poll.expires_at && new Date(poll.expires_at) < new Date()

                        return (
                            <Card key={poll.id} className="overflow-hidden border-slate-200 hover:shadow-lg transition-all duration-300">
                                <CardHeader className="bg-slate-50/50 pb-4 border-b">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="space-y-1">
                                            <CardTitle className="text-xl font-bold text-slate-900">{poll.title}</CardTitle>
                                            {poll.description && <CardDescription className="text-slate-600 italic font-medium">"{poll.description}"</CardDescription>}
                                        </div>
                                        <Badge variant={isExpired ? "secondary" : "outline"} className={isExpired ? "opacity-75" : "bg-green-100 text-green-700 border-green-300 shadow-sm"}>
                                            {isExpired ? "Closed" : "Live"}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    {(!hasVoted && !isExpired) ? (
                                        <div className="space-y-3">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Cast your vote</p>
                                            <div className="grid gap-2">
                                                {poll.options.map((opt, i) => (
                                                    <Button
                                                        key={i}
                                                        variant="outline"
                                                        className="h-14 justify-start text-base font-bold bg-white hover:bg-green-50 hover:border-green-300 hover:text-green-800 transition-all border-slate-200 group"
                                                        onClick={() => handleVote(poll.id, i)}
                                                        disabled={votingId === poll.id}
                                                    >
                                                        <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mr-3 group-hover:bg-green-200 group-hover:text-green-700 transition-colors">
                                                            {i + 1}
                                                        </div>
                                                        {opt}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                                <BarChart3 className="h-3 w-3" /> Real-time Results
                                            </div>
                                            <div className="space-y-3">
                                                {poll.options.map((opt, i) => {
                                                    const voteCount = poll.poll_votes.filter(v => v.option_index === i).length
                                                    const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0
                                                    const isSelectedByMe = poll.poll_votes.find(v => v.user_id === userId)?.option_index === i

                                                    return (
                                                        <div key={i} className="space-y-1">
                                                            <div className="flex justify-between text-sm font-bold">
                                                                <span className="flex items-center gap-2">
                                                                    {opt}
                                                                    {isSelectedByMe && <Badge variant="secondary" className="bg-green-100 text-green-700 text-[9px] py-0 px-1 font-bold">YOUR VOTE</Badge>}
                                                                </span>
                                                                <span className="text-slate-500">{percentage}%</span>
                                                            </div>
                                                            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50 shadow-inner">
                                                                <div
                                                                    className={`h-full transition-all duration-700 ${isSelectedByMe ? 'bg-green-600' : 'bg-slate-400'}`}
                                                                    style={{ width: `${percentage}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                            <div className="flex items-center justify-center p-3 mt-4 bg-green-50/50 rounded-lg text-[11px] font-bold text-green-700 uppercase tracking-tighter italic">
                                                {hasVoted ? "Thank you for participating!" : "Voting is closed for this poll."}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between pt-5 mt-5 border-t text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-md">
                                            <CheckCircle className="h-3.5 w-3.5 text-slate-300" /> {totalVotes} Verified Votes
                                        </span>
                                        {poll.expires_at && !isExpired && (
                                            <span className="flex items-center gap-1.5 px-2 py-1 bg-orange-50 text-orange-600 rounded-md">
                                                <Clock className="h-3.5 w-3.5" /> Closes {format(new Date(poll.expires_at), 'dd MMM, p')}
                                            </span>
                                        )}
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
