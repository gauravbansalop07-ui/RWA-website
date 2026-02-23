import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Residents from './pages/Residents'
import Payments from './pages/Payments'
import Expenses from './pages/Expenses'
import Complaints from './pages/Complaints'
import Notices from './pages/Notices'
import ProtectedLayout from './components/ProtectedLayout'
import CitizenLayout from './components/CitizenLayout'
import CitizenDashboard from './pages/citizen/CitizenDashboard'
import CitizenPayments from './pages/citizen/CitizenPayments'
import CitizenNotices from './pages/citizen/CitizenNotices'
import CitizenEvents from './pages/citizen/CitizenEvents'
import CitizenComplaints from './pages/citizen/CitizenComplaints'
import CitizenProfile from './pages/citizen/CitizenProfile'
import CompleteProfile from './pages/CompleteProfile'
import AuthCallback from './pages/AuthCallback'
import EventsDonations from './pages/EventsDonations'
import PendingApproval from './pages/PendingApproval'

function App() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'your_supabase_url') {
    return (
      <div className="flex h-screen w-screen items-center justify-center flex-col gap-4 p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">Configuration Missing</h1>
        <p className="max-w-md text-gray-600">
          Please create a <code className="bg-gray-200 px-1 py-0.5 rounded">.env</code> file in the
          <code className="bg-gray-200 px-1 py-0.5 rounded ml-1">admin</code> directory with your Supabase credentials.
        </p>
        <div className="bg-slate-100 p-4 rounded text-left text-sm font-mono overflow-auto max-w-full">
          VITE_SUPABASE_URL=your_project_url<br />
          VITE_SUPABASE_ANON_KEY=your_anon_key
        </div>
        <p className="text-sm text-gray-500">Restart the server after adding the file.</p>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/pending-approval" element={<PendingApproval />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Admin Portal Routes */}
        <Route path="/admin" element={<ProtectedLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="residents" element={<Residents />} />
          <Route path="payments" element={<Payments />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="complaints" element={<Complaints />} />
          <Route path="notices" element={<Notices />} />
          <Route path="events" element={<EventsDonations />} />
        </Route>

        {/* Citizen Portal Routes */}
        <Route path="/citizen" element={<CitizenLayout />}>
          <Route index element={<CitizenDashboard />} />
          <Route path="payments" element={<CitizenPayments />} />
          <Route path="notices" element={<CitizenNotices />} />
          <Route path="events" element={<CitizenEvents />} />
          <Route path="complaints" element={<CitizenComplaints />} />
          <Route path="profile" element={<CitizenProfile />} />
        </Route>

        {/* Default redirect to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  )
}

export default App
