import { useEffect, useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { Plus, Search, TrendingDown, Wallet, Calendar, Tag } from 'lucide-react'
import { format } from 'date-fns'

type Expense = {
    id: string
    category: string
    amount: number
    description: string
    date: string
    attachment_url: string | null
    created_by: string
    created_at: string
    profiles: {
        full_name: string
    }
}

const categoryColors: Record<string, string> = {
    Electricity: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    Water: 'bg-blue-100 text-blue-800 border-blue-300',
    Security: 'bg-purple-100 text-purple-800 border-purple-300',
    Maintenance: 'bg-green-100 text-green-800 border-green-300',
    Cleaning: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    Other: 'bg-gray-100 text-gray-800 border-gray-300',
}

const categories = ['Electricity', 'Water', 'Security', 'Maintenance', 'Cleaning', 'Other']

export default function Expenses() {
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('all')
    const [addOpen, setAddOpen] = useState(false)

    // Form State
    const [category, setCategory] = useState('')
    const [amount, setAmount] = useState('')
    const [description, setDescription] = useState('')
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))

    useEffect(() => {
        fetchExpenses()
    }, [])

    const fetchExpenses = async () => {
        try {
            const { data, error } = await supabase
                .from('expenses')
                .select(`
          *,
          profiles (full_name)
        `)
                .order('date', { ascending: false })

            if (error) throw error
            setExpenses(data || [])
        } catch (error) {
            console.error('Error fetching expenses:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAddExpense = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { error } = await supabase
                .from('expenses')
                .insert({
                    category,
                    amount: parseFloat(amount),
                    description,
                    date,
                    created_by: user.id,
                })

            if (error) throw error

            setAddOpen(false)
            resetForm()
            fetchExpenses()
        } catch (error) {
            console.error('Error adding expense:', error)
            alert('Failed to add expense')
        }
    }

    const resetForm = () => {
        setCategory('')
        setAmount('')
        setDescription('')
        setDate(format(new Date(), 'yyyy-MM-dd'))
    }

    const filteredExpenses = expenses.filter(expense => {
        const matchesSearch =
            (expense.category?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (expense.description?.toLowerCase() || '').includes(search.toLowerCase())

        const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter

        return matchesSearch && matchesCategory
    })

    const stats = {
        total: expenses.reduce((sum, e) => sum + Number(e.amount), 0),
        thisMonth: expenses
            .filter(e => new Date(e.date).getMonth() === new Date().getMonth())
            .reduce((sum, e) => sum + Number(e.amount), 0),
        byCategory: categories.map(cat => ({
            name: cat,
            amount: expenses
                .filter(e => e.category === cat)
                .reduce((sum, e) => sum + Number(e.amount), 0),
        })).filter(c => c.amount > 0),
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                        Expense Tracker
                    </h1>
                    <p className="text-muted-foreground mt-1">Track community expenses for financial transparency</p>
                </div>
                <Button onClick={() => setAddOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Expense
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-red-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                        <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                            <TrendingDown className="h-5 w-5 text-red-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-600">
                            ₹{stats.total.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">All time expenditure</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">This Month</CardTitle>
                        <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-orange-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-orange-600">
                            ₹{stats.thisMonth.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Current month spending</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Categories</CardTitle>
                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <Tag className="h-5 w-5 text-purple-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.byCategory.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">Active expense types</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg per Month</CardTitle>
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Wallet className="h-5 w-5 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600">
                            ₹{Math.round(stats.total / Math.max(1, new Date().getMonth() + 1)).toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Monthly average</p>
                    </CardContent>
                </Card>
            </div>

            {/* Category Breakdown */}
            {stats.byCategory.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Expense by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {stats.byCategory.map((cat) => (
                                <div key={cat.name} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline" className={categoryColors[cat.name] || categoryColors.Other}>
                                            {cat.name}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-48 bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
                                                style={{ width: `${(cat.amount / stats.total) * 100}%` }}
                                            />
                                        </div>
                                        <span className="font-semibold w-24 text-right">₹{cat.amount.toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 flex items-center gap-2">
                    <Search className="h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Search expenses..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="max-w-sm"
                    />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead className="font-semibold">Date</TableHead>
                                <TableHead className="font-semibold">Category</TableHead>
                                <TableHead className="font-semibold">Description</TableHead>
                                <TableHead className="font-semibold">Amount</TableHead>
                                <TableHead className="font-semibold">Added By</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10">
                                        Loading expenses...
                                    </TableCell>
                                </TableRow>
                            ) : filteredExpenses.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10">
                                        <div className="flex flex-col items-center gap-2">
                                            <Wallet className="h-12 w-12 text-slate-300" />
                                            <p className="font-medium text-slate-600">No expenses found</p>
                                            <p className="text-sm text-slate-400">Add your first expense to get started</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredExpenses.map((expense) => (
                                    <TableRow key={expense.id} className="hover:bg-slate-50">
                                        <TableCell className="font-medium">
                                            {format(new Date(expense.date), 'dd MMM yyyy')}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={categoryColors[expense.category] || categoryColors.Other}>
                                                {expense.category}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="max-w-md truncate">{expense.description}</TableCell>
                                        <TableCell className="font-semibold text-red-600">
                                            ₹{Number(expense.amount).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {expense.profiles?.full_name || 'Unknown'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Add Expense Dialog */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Add New Expense</DialogTitle>
                        <DialogDescription>
                            Record a new community expense for transparency
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="category">Category</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="amount">Amount (₹)</Label>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="date">Date</Label>
                            <Input
                                id="date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                placeholder="e.g., Monthly electricity bill"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setAddOpen(false); resetForm(); }}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddExpense} disabled={!category || !amount}>
                            Add Expense
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
