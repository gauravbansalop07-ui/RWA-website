import { AlertTriangle, Clock, XCircle, Info } from 'lucide-react'

export type PaymentPhase =
    | 'normal'          // > 2 days before due_date
    | 'reminder'        // 1-2 days before due_date
    | 'grace'           // due_date to due_date + grace_period_days
    | 'closed'          // after grace end

export type PeriodInfo = {
    name: string
    due_date: string
    grace_period_days: number
    late_fee_amount: number
    reminders_enabled: boolean
}

/**
 * Compute the current payment phase and days remaining
 * relative to a billing period's due_date.
 */
export function computePhase(period: PeriodInfo): {
    phase: PaymentPhase
    daysUntilDue: number
    graceEnd: Date
    lateFee: number
} {
    const now = new Date()
    const due = new Date(period.due_date)
    const graceEnd = new Date(due)
    graceEnd.setDate(due.getDate() + (period.grace_period_days ?? 3))

    const msPerDay = 1000 * 60 * 60 * 24
    const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / msPerDay)

    let phase: PaymentPhase
    if (now > graceEnd) {
        phase = 'closed'
    } else if (now >= due) {
        phase = 'grace'
    } else if (daysUntilDue <= 2) {
        phase = 'reminder'
    } else {
        phase = 'normal'
    }

    return { phase, daysUntilDue, graceEnd, lateFee: period.late_fee_amount ?? 25 }
}

type Props = {
    period: PeriodInfo | null
    isPaid: boolean // don't show banner if already paid
}

export default function PaymentPhaseBanner({ period, isPaid }: Props) {
    if (!period || isPaid) return null

    const { phase, daysUntilDue, graceEnd, lateFee } = computePhase(period)

    if (phase === 'normal') return null // no banner during normal window

    const config = {
        reminder: {
            bg: 'bg-yellow-50 border-yellow-300',
            icon: Clock,
            iconColor: 'text-yellow-600',
            title: daysUntilDue === 1
                ? '⏰ Last day for normal payment!'
                : `⏰ ${daysUntilDue} days left for normal payment`,
            body: `The normal payment window for "${period.name}" closes soon. Pay now to avoid a late fee of ₹${lateFee}.`,
            textColor: 'text-yellow-800',
        },
        grace: {
            bg: 'bg-orange-50 border-orange-300',
            icon: AlertTriangle,
            iconColor: 'text-orange-500',
            title: '⚠️ Grace Period Active – Late Fee Applies',
            body: `The normal payment window for "${period.name}" has passed. Payments made now will include a late fee of ₹${lateFee}. Grace period ends on ${graceEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}.`,
            textColor: 'text-orange-800',
        },
        closed: {
            bg: 'bg-red-50 border-red-300',
            icon: XCircle,
            iconColor: 'text-red-500',
            title: '🔒 Payment Window Closed',
            body: `The payment window for "${period.name}" has closed. You may appear on the pending list. Please contact your RWA admin.`,
            textColor: 'text-red-800',
        },
    } as const

    const c = config[phase as keyof typeof config]
    if (!c) return null
    const Icon = c.icon

    return (
        <div className={`flex gap-3 items-start rounded-xl border px-4 py-4 ${c.bg}`}>
            <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${c.iconColor}`} />
            <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm ${c.textColor}`}>{c.title}</p>
                <p className={`text-sm mt-0.5 leading-relaxed ${c.textColor} opacity-90`}>{c.body}</p>
            </div>
        </div>
    )
}

/**
 * Small inline info strip shown during normal window (subtle, not alarming)
 */
export function NormalWindowBanner({ period, isPaid }: Props) {
    if (!period || isPaid) return null
    const { phase, daysUntilDue } = computePhase(period)
    if (phase !== 'normal') return null

    return (
        <div className="flex gap-2 items-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
            <Info className="h-4 w-4 shrink-0" />
            <span>
                <strong>Normal Payment Window Open</strong> — {daysUntilDue > 0 ? `${daysUntilDue} days remaining` : 'Due today'} for "{period.name}".
            </span>
        </div>
    )
}
