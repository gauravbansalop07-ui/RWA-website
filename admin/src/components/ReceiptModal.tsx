import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Printer, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import jsPDF from 'jspdf'

export interface ReceiptData {
    receiptNumber: string
    residentName: string
    flatNumber: string
    amount: number
    quarter: string
    method: string     // "Online (Razorpay)" | "Cash"
    transactionId: string | null
    paidAt: string
    societyName?: string
}

interface ReceiptModalProps {
    open: boolean
    onClose: () => void
    receipt: ReceiptData | null
}

// ─── Shared Helpers ───────────────────────────────────────────────────────────

export function generateReceiptNumber(): string {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `RWP-${y}${m}${d}-${rand}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReceiptModal({ open, onClose, receipt }: ReceiptModalProps) {
    if (!receipt) return null

    const society = receipt.societyName || 'POCKET 19 RESIDENTS WELFARE ASSOCIATION'
    const formattedDate = (() => {
        try { return format(new Date(receipt.paidAt), 'dd MMM yyyy, hh:mm a') }
        catch { return receipt.paidAt }
    })()

    // ── PDF Generation ──────────────────────────────────────────────────────

    const handleDownloadPDF = () => {
        const doc = new jsPDF({ unit: 'mm', format: 'a5' })
        const W = 148   // A5 width in mm
        const margin = 14
        const col1 = margin
        const col2 = 58   // label column width
        let y = 14

        const drawLine = (yPos: number, color = 200) => {
            doc.setDrawColor(color)
            doc.line(margin, yPos, W - margin, yPos)
        }

        // ── Header ───────────────────────────────────────────────────────────
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(30, 58, 138)   // blue-900
        doc.text(society, W / 2, y, { align: 'center' })
        y += 6

        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 116, 139)  // slate-500
        doc.text('MAINTENANCE PAYMENT RECEIPT', W / 2, y, { align: 'center' })
        y += 5

        drawLine(y)
        y += 5

        // ── Receipt & Date row ────────────────────────────────────────────────
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(51, 65, 85)    // slate-700
        doc.text('Receipt No.', col1, y)
        doc.setFont('helvetica', 'normal')
        doc.text(receipt.receiptNumber, col1 + col2 - 14, y)
        doc.setFont('helvetica', 'bold')
        doc.text('Date', W / 2 + 6, y)
        doc.setFont('helvetica', 'normal')
        doc.text(formattedDate, W / 2 + 18, y)
        y += 7

        drawLine(y)
        y += 6

        // ── Resident details ──────────────────────────────────────────────────
        const addRow = (label: string, value: string) => {
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(8)
            doc.setTextColor(100, 116, 139)
            doc.text(label, col1, y)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(30, 41, 59)    // slate-800
            doc.text(value, col1 + col2 - 2, y)
            y += 6
        }

        addRow('Resident Name', receipt.residentName)
        addRow('Flat Number', receipt.flatNumber)
        addRow('Quarter', receipt.quarter)
        y += 2
        drawLine(y, 230)
        y += 5

        // ── Payment details ───────────────────────────────────────────────────
        // Amount — large & prominent
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(18)
        doc.setTextColor(22, 101, 52)   // green-800
        doc.text(`\u20b9${Number(receipt.amount).toLocaleString()}`, W / 2, y, { align: 'center' })
        y += 7

        doc.setFontSize(8)
        doc.setTextColor(100, 116, 139)
        doc.setFont('helvetica', 'normal')

        addRow('Payment Mode', receipt.method)
        if (receipt.transactionId) {
            addRow('Transaction ID', receipt.transactionId)
        }

        y += 2
        drawLine(y)
        y += 7

        // ── Confirmed banner ──────────────────────────────────────────────────
        doc.setFillColor(240, 253, 244)   // green-50
        doc.roundedRect(margin, y - 3, W - margin * 2, 10, 2, 2, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(22, 101, 52)
        doc.text('\u2713  PAYMENT CONFIRMED', W / 2, y + 4, { align: 'center' })
        y += 14

        // ── Footer ────────────────────────────────────────────────────────────
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(148, 163, 184)  // slate-400
        doc.text('This is a computer-generated receipt. No signature required.', W / 2, y, { align: 'center' })
        y += 4
        doc.text('For queries, contact your RWA Management.', W / 2, y, { align: 'center' })

        doc.save(`Receipt-${receipt.receiptNumber}.pdf`)
    }

    // ── Print ───────────────────────────────────────────────────────────────
    const handlePrint = () => {
        const printContents = document.getElementById('rwa-receipt-print')?.innerHTML
        if (!printContents) return
        const win = window.open('', '_blank', 'width=600,height=800')
        if (!win) return
        win.document.write(`
            <html><head><title>Receipt ${receipt.receiptNumber}</title>
            <style>
                body { font-family: sans-serif; max-width: 500px; margin: 40px auto; color: #1e293b; }
                .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px; }
                .header h2 { color: #1e3a8a; font-size: 15px; margin: 0 0 4px; }
                .header p { color: #64748b; font-size: 11px; margin: 0; }
                .row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
                .row .label { color: #64748b; }
                .row .value { font-weight: 600; }
                .amount { text-align: center; font-size: 28px; font-weight: 800; color: #166534; margin: 16px 0; }
                .confirmed { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; text-align: center; padding: 10px; color: #166534; font-weight: 700; margin: 16px 0; }
                .footer { text-align: center; color: #94a3b8; font-size: 10px; margin-top: 16px; }
            </style></head><body>${printContents}</body></html>
        `)
        win.document.close()
        win.focus()
        win.print()
        win.close()
    }

    // ── Render ──────────────────────────────────────────────────────────────
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Payment Receipt
                    </span>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5 h-8 text-xs">
                            <Printer className="h-3.5 w-3.5" /> Print
                        </Button>
                        <Button size="sm" onClick={handleDownloadPDF} className="gap-1.5 h-8 text-xs bg-blue-700 hover:bg-blue-800">
                            <Download className="h-3.5 w-3.5" /> Download PDF
                        </Button>
                    </div>
                </div>

                {/* Receipt body — also used for print */}
                <div id="rwa-receipt-print" className="px-6 py-5 space-y-4">
                    {/* Header */}
                    <div className="header text-center border-b pb-4">
                        <h2 className="font-bold text-blue-900 text-sm leading-tight">{society}</h2>
                        <p className="text-[11px] text-slate-500 mt-0.5">Maintenance Payment Receipt</p>
                    </div>

                    {/* Receipt No + Date */}
                    <div className="row flex justify-between text-xs">
                        <span className="label text-slate-500">Receipt No.</span>
                        <span className="value font-mono font-bold text-slate-800">{receipt.receiptNumber}</span>
                    </div>
                    <div className="row flex justify-between text-xs border-b pb-3">
                        <span className="label text-slate-500">Date</span>
                        <span className="value font-semibold text-slate-700">{formattedDate}</span>
                    </div>

                    {/* Resident details */}
                    <div className="space-y-2">
                        {[
                            ['Resident Name', receipt.residentName],
                            ['Flat Number', receipt.flatNumber],
                            ['Quarter', receipt.quarter],
                        ].map(([label, value]) => (
                            <div key={label} className="row flex justify-between text-xs">
                                <span className="label text-slate-500">{label}</span>
                                <span className="value font-semibold text-slate-800">{value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Amount — prominent */}
                    <div className="amount text-center py-3 border-y border-dashed">
                        <p className="text-3xl font-black text-green-700">₹{Number(receipt.amount).toLocaleString()}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Amount Paid</p>
                    </div>

                    {/* Payment details */}
                    <div className="space-y-2">
                        <div className="row flex justify-between text-xs">
                            <span className="label text-slate-500">Payment Mode</span>
                            <span className="value font-semibold text-slate-800">{receipt.method}</span>
                        </div>
                        {receipt.transactionId && (
                            <div className="row flex justify-between text-xs">
                                <span className="label text-slate-500">Transaction ID</span>
                                <span className="value font-mono text-[11px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">{receipt.transactionId}</span>
                            </div>
                        )}
                    </div>

                    {/* Confirmed banner */}
                    <div className="confirmed bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-bold text-green-700">PAYMENT CONFIRMED</span>
                    </div>

                    {/* Footer */}
                    <div className="footer text-center text-[10px] text-slate-400 leading-relaxed">
                        <p>Computer-generated receipt. No signature required.</p>
                        <p>For queries, contact your RWA Management.</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
