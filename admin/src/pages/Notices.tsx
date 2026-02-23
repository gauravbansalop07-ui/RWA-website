import { useEffect, useState, useRef } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import {
    Plus,
    Megaphone,
    Calendar,
    FileText,
    Image as ImageIcon,
    Video,
    Paperclip,
    X,
    Loader2,
    ExternalLink,
    FileIcon
} from 'lucide-react'
import { format } from 'date-fns'

type Announcement = {
    id: string
    title: string
    content: string
    attachment_url: string | null
    attachment_type: string | null
    created_by: string
    created_at: string
    profiles: {
        full_name: string
    }
}

type Notification = { type: 'success' | 'error'; message: string } | null

export default function Notices() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([])
    const [loading, setLoading] = useState(true)
    const [addOpen, setAddOpen] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [notification, setNotification] = useState<Notification>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const showNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message })
        setTimeout(() => setNotification(null), 5000)
    }

    // Form State
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    useEffect(() => {
        fetchAnnouncements()
    }, [])

    const fetchAnnouncements = async () => {
        try {
            const { data, error } = await supabase
                .from('announcements')
                .select(`*, profiles (full_name)`)
                .order('created_at', { ascending: false })

            if (error) throw error
            setAnnouncements(data || [])
        } catch (error) {
            console.error('Error fetching announcements:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedFile(file)
            if (file.type.startsWith('image/')) {
                setPreviewUrl(URL.createObjectURL(file))
            } else {
                setPreviewUrl(null)
            }
        }
    }

    const handleAddAnnouncement = async () => {
        setUploading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            let attachmentUrl = null
            let attachmentType = null

            if (selectedFile) {
                const fileExt = selectedFile.name.split('.').pop()
                const fileName = `${Math.random()}.${fileExt}`
                const filePath = `notices/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('notices')
                    .upload(filePath, selectedFile)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('notices')
                    .getPublicUrl(filePath)

                attachmentUrl = publicUrl

                // Determine type
                if (selectedFile.type.startsWith('image/')) attachmentType = 'image'
                else if (selectedFile.type.startsWith('video/')) attachmentType = 'video'
                else if (selectedFile.type === 'application/pdf') attachmentType = 'pdf'
                else attachmentType = 'document'
            }

            const { error } = await supabase
                .from('announcements')
                .insert({
                    title,
                    content,
                    attachment_url: attachmentUrl,
                    attachment_type: attachmentType,
                    created_by: user.id,
                })

            if (error) throw error

            setAddOpen(false)
            resetForm()
            fetchAnnouncements()
            showNotification('success', '✓ Notice published to all residents')
        } catch (error: any) {
            console.error('Error adding announcement:', error)
            showNotification('error', error.message || 'Failed to publish notice')
        } finally {
            setUploading(false)
        }
    }

    const resetForm = () => {
        setTitle('')
        setContent('')
        setSelectedFile(null)
        setPreviewUrl(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const getAttachmentIcon = (type: string | null) => {
        switch (type) {
            case 'image': return <ImageIcon className="h-4 w-4" />
            case 'video': return <Video className="h-4 w-4" />
            case 'pdf': return <FileText className="h-4 w-4" />
            default: return <Paperclip className="h-4 w-4" />
        }
    }

    return (
        <div className="space-y-6">
            {notification && (
                <div className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium shadow-sm border ${notification.type === 'success'
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                    <span>{notification.message}</span>
                    <button onClick={() => setNotification(null)} className="ml-4 opacity-60 hover:opacity-100 text-lg leading-none">&times;</button>
                </div>
            )}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                        Community Notices
                    </h1>
                    <p className="text-muted-foreground mt-1">Broadcast multimedia updates and official announcements</p>
                </div>
                <Button onClick={() => setAddOpen(true)} className="gap-2 bg-purple-600 hover:bg-purple-700">
                    <Plus className="h-4 w-4" />
                    New Announcement
                </Button>
            </div>

            <div className="grid gap-6">
                {loading ? (
                    <div className="py-20 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600 mb-2" />
                        <p>Loading notices...</p>
                    </div>
                ) : announcements.length === 0 ? (
                    <div className="border-dashed border-2 py-20 text-center rounded-xl bg-slate-50/50">
                        <Megaphone className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900">No Announcements</h3>
                        <p className="text-slate-500">Share your first update with the community</p>
                    </div>
                ) : (
                    announcements.map((announcement) => (
                        <Card key={announcement.id} className="overflow-hidden border-slate-200 hover:shadow-lg transition-all group">
                            <div className="flex flex-col md:flex-row">
                                {announcement.attachment_url && announcement.attachment_type === 'image' && (
                                    <div className="md:w-64 h-48 md:h-auto overflow-hidden">
                                        <img
                                            src={announcement.attachment_url}
                                            alt={announcement.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    </div>
                                )}
                                <div className="flex-1 p-6">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-100 uppercase text-[10px]">Official</Badge>
                                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(announcement.created_at), 'dd MMM yyyy')}
                                                </span>
                                            </div>
                                            <h2 className="text-xl font-bold text-slate-900">{announcement.title}</h2>
                                        </div>
                                        <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                                            <Megaphone className="h-5 w-5" />
                                        </div>
                                    </div>

                                    <p className="text-slate-600 mb-6 line-clamp-3 leading-relaxed">
                                        {announcement.content}
                                    </p>

                                    <div className="flex items-center justify-between mt-auto pt-4 border-t">
                                        <div className="flex items-center gap-2">
                                            <div className="h-7 w-7 rounded-full bg-purple-100 flex items-center justify-center text-[10px] font-bold text-purple-700">
                                                {announcement.profiles?.full_name?.charAt(0) || 'A'}
                                            </div>
                                            <span className="text-xs font-medium text-slate-600">{announcement.profiles?.full_name}</span>
                                        </div>

                                        {announcement.attachment_url && (
                                            <a
                                                href={announcement.attachment_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full transition-colors"
                                            >
                                                {getAttachmentIcon(announcement.attachment_type)}
                                                View {announcement.attachment_type}
                                                <ExternalLink className="h-3 w-3 ml-1" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">Publish New Notice</DialogTitle>
                        <DialogDescription>
                            Broadcast news, rules, or alerts to the entire community
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title" className="text-sm font-bold">Notice Title</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Annual General Meeting (AGM) 2024"
                                className="h-11 shadow-sm"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="content" className="text-sm font-bold">Detailed Message</Label>
                            <textarea
                                id="content"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
                                placeholder="Provide all necessary details for the residents..."
                            />
                        </div>

                        <div className="space-y-4">
                            <Label className="text-sm font-bold">Attachment (Optional)</Label>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="group cursor-pointer border-2 border-dashed border-slate-200 rounded-xl p-8 hover:border-purple-400 hover:bg-purple-50 transition-all text-center"
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleFileChange}
                                    accept="image/*,video/*,.pdf,.doc,.docx"
                                />
                                {selectedFile ? (
                                    <div className="flex flex-col items-center gap-2">
                                        {previewUrl ? (
                                            <div className="relative w-24 h-24 rounded-lg overflow-hidden border shadow-sm">
                                                <img src={previewUrl} className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setPreviewUrl(null); }}
                                                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="relative p-6 bg-white rounded-lg border shadow-sm flex flex-col items-center">
                                                <FileIcon className="h-10 w-10 text-blue-500 mb-2" />
                                                <span className="text-xs font-bold truncate max-w-[150px]">{selectedFile.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                                                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        )}
                                        <p className="text-xs text-slate-500 mt-2">Click to replace file</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto group-hover:bg-purple-100 transition-colors">
                                            <Paperclip className="h-6 w-6 text-slate-400 group-hover:text-purple-600" />
                                        </div>
                                        <div className="text-sm font-medium text-slate-600">
                                            Click to attach media or document
                                        </div>
                                        <p className="text-xs text-slate-400">PDF, Images, Video, or Docs up to 50MB</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-6">
                        <Button
                            variant="outline"
                            onClick={() => { setAddOpen(false); resetForm(); }}
                            className="mr-auto"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddAnnouncement}
                            disabled={!title || !content || uploading}
                            className="bg-purple-600 hover:bg-purple-700 min-w-[150px]"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Publishing...
                                </>
                            ) : 'Publish Notice'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
