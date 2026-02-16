import { useEffect, useState } from 'react'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import {
    Megaphone,
    Calendar,
    ExternalLink,
    FileText
} from 'lucide-react'
import { format } from 'date-fns'

type Announcement = {
    id: string
    title: string
    content: string
    attachment_url: string | null
    attachment_type: string | null
    created_at: string
}

export default function CitizenNotices() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchAnnouncements()

        const channel = supabase
            .channel('public:announcements')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
                fetchAnnouncements()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const fetchAnnouncements = async () => {
        try {
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            setAnnouncements(data || [])
        } catch (error) {
            console.error('Error fetching announcements:', error)
        } finally {
            setLoading(false)
        }
    }

    const renderAttachment = (announcement: Announcement) => {
        if (!announcement.attachment_url) return null

        const isImage = announcement.attachment_type === 'image'
        const isVideo = announcement.attachment_type === 'video'

        if (isImage) {
            return (
                <div className="mt-4 rounded-lg overflow-hidden border border-slate-200">
                    <img
                        src={announcement.attachment_url}
                        alt="Attachment"
                        className="w-full h-auto max-h-[400px] object-cover"
                    />
                </div>
            )
        }

        if (isVideo) {
            return (
                <div className="mt-4 rounded-lg overflow-hidden border border-slate-200">
                    <video
                        src={announcement.attachment_url}
                        controls
                        className="w-full h-auto max-h-[400px]"
                    />
                </div>
            )
        }

        return (
            <a
                href={announcement.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors group"
            >
                <FileText className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 truncate">
                    View Attachment
                </span>
                <ExternalLink className="h-4 w-4 text-slate-400 ml-auto" />
            </a>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-900 to-purple-700 bg-clip-text text-transparent">
                    Notice Board
                </h1>
                <p className="text-muted-foreground mt-1">Stay updated with community announcements</p>
            </div>

            <div className="space-y-6">
                {loading ? (
                    <Card>
                        <CardContent className="py-10 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                            <p className="text-slate-500 font-medium">Loading announcements...</p>
                        </CardContent>
                    </Card>
                ) : announcements.length === 0 ? (
                    <Card>
                        <CardContent className="py-20 text-center border-2 border-dashed rounded-lg bg-slate-50/50">
                            <Megaphone className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                            <p className="text-lg font-bold text-slate-500">No Announcements Yet</p>
                            <p className="text-sm text-slate-400">Check back later for society updates</p>
                        </CardContent>
                    </Card>
                ) : (
                    announcements.map((announcement) => (
                        <Card key={announcement.id} className="overflow-hidden border-slate-200 hover:shadow-md transition-shadow border-l-4 border-l-purple-500">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-2 text-xs font-bold text-purple-600 uppercase tracking-widest mb-3">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(announcement.created_at), 'dd MMM yyyy, p')}
                                </div>
                                <CardTitle className="text-xl font-bold text-slate-900 mb-2">
                                    {announcement.title}
                                </CardTitle>
                                <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                                    {announcement.content}
                                </p>
                                {renderAttachment(announcement)}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
