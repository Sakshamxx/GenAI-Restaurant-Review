import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { Sparkles, LayoutDashboard, RotateCcw, Menu, X } from 'lucide-react'

// Import Customer Pages
import QRScan from './pages/customer/QRScan.jsx'
import AISuggestions from './pages/customer/AISuggestions.jsx'
import FeedbackForm from './pages/customer/FeedbackForm.jsx'
import GoogleSuccess from './pages/customer/GoogleSuccess.jsx'

// Import Dashboard Pages
import Login from './pages/dashboard/Login.jsx'
import Signup from './pages/dashboard/Signup.jsx'
import DashboardLayout from './pages/dashboard/DashboardLayout.jsx'
import Overview from './pages/dashboard/Overview.jsx'
import QRManagement from './pages/dashboard/QRManagement.jsx'
import ReviewsList from './pages/dashboard/ReviewsList.jsx'
import FeedbackList from './pages/dashboard/FeedbackList.jsx'
import Analytics from './pages/dashboard/Analytics.jsx'
import Settings from './pages/dashboard/Settings.jsx'



function DemoToolbar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(true);

  const resetDemo = () => {
    localStorage.clear();
    window.location.reload();
  };

  // Hide toolbar on success page if needed, but keeping it visible for ease of routing in the demo
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          className="bg-brand-500 hover:bg-brand-600 text-white rounded-full p-3 shadow-lg flex items-center justify-center border border-brand-400/30 transition-all scale-100 hover:scale-105 active:scale-95 duration-200"
          title="Demo Sandbox Toolkit"
        >
          <Sparkles className="w-5 h-5" />
        </button>
      ) : (
        <div className="glass-panel text-white p-4 rounded-2xl w-64 shadow-2xl flex flex-col gap-3 border border-white/10 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-1.5 text-brand-300 font-display font-semibold text-sm">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <span>DEMO PLAYGROUND</span>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs text-slate-400 font-medium">Customer Experience Flow</span>
            <div className="grid grid-cols-2 gap-1.5">
              <Link
                to="/qr"
                onClick={() => setCollapsed(true)}
                className={`text-center py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  location.pathname === '/qr' || location.pathname.startsWith('/review')
                    ? 'bg-brand-500 text-white font-semibold'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300'
                }`}
              >
                1. QR Scan
              </Link>
              <Link
                to="/suggestions"
                onClick={() => setCollapsed(true)}
                className={`text-center py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  location.pathname === '/suggestions'
                    ? 'bg-brand-500 text-white font-semibold'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300'
                }`}
              >
                2. AI Review
              </Link>
              <Link
                to="/feedback"
                onClick={() => setCollapsed(true)}
                className={`text-center py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  location.pathname === '/feedback'
                    ? 'bg-brand-500 text-white font-semibold'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300'
                }`}
              >
                3. Feedback
              </Link>
              <Link
                to="/success"
                onClick={() => setCollapsed(true)}
                className={`text-center py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  location.pathname === '/success'
                    ? 'bg-brand-500 text-white font-semibold'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300'
                }`}
              >
                4. Redirect
              </Link>
            </div>

            <span className="text-xs text-slate-400 font-medium mt-1">Management Portal</span>
            <div className="grid grid-cols-3 gap-1">
              <Link
                to="/login"
                onClick={() => setCollapsed(true)}
                className={`text-center py-1.5 px-1 rounded-lg text-[10px] font-medium transition-all ${
                  location.pathname === '/login'
                    ? 'bg-brand-500 text-white font-semibold'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300'
                }`}
              >
                Login
              </Link>
              <Link
                to="/signup"
                onClick={() => setCollapsed(true)}
                className={`text-center py-1.5 px-1 rounded-lg text-[10px] font-medium transition-all ${
                  location.pathname === '/signup'
                    ? 'bg-brand-500 text-white font-semibold'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300'
                }`}
              >
                Signup
              </Link>
              <Link
                to="/dashboard"
                onClick={() => setCollapsed(true)}
                className={`text-center py-1.5 px-1 rounded-lg text-[10px] font-medium transition-all ${
                  location.pathname.startsWith('/dashboard')
                    ? 'bg-brand-500 text-white font-semibold'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300'
                }`}
              >
                Portal
              </Link>
            </div>

            <button
              onClick={resetDemo}
              className="mt-2 flex items-center justify-center gap-1.5 w-full bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 rounded-lg py-1.5 px-3 text-xs font-semibold transition-all active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Local Database
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Tracks page changes for potential analytics hooks
function PageTracker() {
  return null;
}

export default function App() {
  return (
    <Router>
      <PageTracker />
      
      {/* Background container for the custom Silk effect */}
      <div className="silk-bg-container">
        <div className="silk-blob-1"></div>
        <div className="silk-blob-2"></div>
        <div className="silk-blob-3"></div>
      </div>

      <div className="flex-1 flex flex-col min-h-screen relative z-10">
        <Routes>
          {/* Default: redirect root to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Customer experience routes — accessible via QR scan URLs */}
          <Route path="/review/:restaurantId/:tableId" element={<QRScan />} />
          <Route path="/review/:restaurantId" element={<QRScan />} />
          <Route path="/qr" element={<QRScan />} />
          <Route path="/suggestions" element={<AISuggestions />} />
          <Route path="/customer/AISuggestions" element={<AISuggestions />} />
          <Route path="/feedback" element={<FeedbackForm />} />
          <Route path="/customer/FeedbackForm" element={<FeedbackForm />} />
          <Route path="/success" element={<GoogleSuccess />} />

          {/* Owner Dashboard routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Top level redirects to nested protected dashboard subroutes */}
          <Route path="/analytics/*" element={<Navigate to="/dashboard/analytics" replace />} />
          <Route path="/settings/*" element={<Navigate to="/dashboard/settings" replace />} />
          <Route path="/qr-management/*" element={<Navigate to="/dashboard/qr" replace />} />

          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Overview />} />
            <Route path="qr" element={<QRManagement />} />
            <Route path="reviews" element={<ReviewsList />} />
            <Route path="feedback" element={<FeedbackList />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </div>

      {/* Floating Toolbar to navigate demo seamlessly */}
      <DemoToolbar />
    </Router>
  )
}
