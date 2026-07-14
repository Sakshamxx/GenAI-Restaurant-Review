import React, { useState, useEffect } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  QrCode,
  MessageSquare,
  AlertTriangle,
  BarChart3,
  Settings,
  LogOut,
  Sparkles,
  Menu,
  X,
  User,
  ChevronDown,
  Building2,
  Loader2
} from 'lucide-react'
import { getSession, signOut, getMyRestaurant, onAuthStateChange } from '../../services/supabase_db.js'

export default function DashboardLayout() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const s = await getSession();
        if (!mounted) return;
        if (!s) {
          navigate('/login', { replace: true });
          return;
        }
        setSession(s);
        const r = await getMyRestaurant();
        if (mounted) setRestaurant(r);
      } catch (err) {
        console.error('[DashboardLayout] init error:', err);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    init();

    // Listen for auth state changes (token refresh, sign-out)
    const { data: { subscription } } = onAuthStateChange((s) => {
      if (!s) navigate('/login', { replace: true });
      else setSession(s);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const navItems = [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/dashboard/qr', label: 'QR Management', icon: QrCode },
    { to: '/dashboard/reviews', label: 'Google Reviews', icon: MessageSquare },
    { to: '/dashboard/feedback', label: 'Private Feedback', icon: AlertTriangle },
    { to: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  // Show a loading screen while Supabase resolves session
  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="bg-brand-500 rounded-xl p-3">
            <Sparkles className="w-6 h-6 text-white fill-white" />
          </div>
          <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
          <span className="text-sm text-slate-400 font-display">Authenticating...</span>
        </div>
      </div>
    );
  }

  const displayName = restaurant?.name || session?.user?.email || 'Restaurant Owner';
  const displayEmail = session?.user?.email || '';

  // ── Shared sidebar content ─────────────────────────────────────────────────
  const SidebarNav = ({ onNavClick }) => (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavClick}
          className={({ isActive }) => `
            flex items-center gap-3 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200
            ${isActive
              ? 'bg-brand-500/15 text-brand-300 border border-brand-500/20 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }
          `}
        >
          <item.icon className="w-4 h-4 flex-shrink-0" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );

  const UserCard = () => (
    <div className="flex items-center gap-3 px-2">
      <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 border border-white/10">
        <User className="w-4 h-4" />
      </div>
      <div className="flex flex-col overflow-hidden">
        <span className="text-xs font-semibold text-white truncate">{displayName}</span>
        <span className="text-[10px] text-slate-500 truncate">{displayEmail}</span>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-screen bg-slate-950 text-slate-100 font-sans">

      {/* ── Mobile Top Navbar ─────────────────────────────────────────────── */}
      <div className="md:hidden flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="bg-brand-500 rounded-lg p-1.5 flex items-center justify-center text-white">
            <Sparkles className="w-4 h-4 fill-white" />
          </div>
          <span className="font-display font-bold text-lg text-white tracking-tight">ReviewFlow AI</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* ── Sidebar — Desktop ─────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 border-r border-white/5 bg-slate-900/40 backdrop-blur-lg p-6 justify-between flex-shrink-0">
        <div className="flex flex-col gap-8">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2 px-2">
            <div className="bg-brand-500 rounded-xl p-2 flex items-center justify-center text-white glow-purple-sm">
              <Sparkles className="w-5 h-5 fill-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-base text-white tracking-tight leading-none">ReviewFlow AI</span>
              <span className="text-[10px] text-brand-400 font-semibold uppercase tracking-wider mt-1">Dashboard Portal</span>
            </div>
          </Link>

          {/* Active restaurant pill */}
          {restaurant && (
            <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5">
              <Building2 className="w-4 h-4 text-brand-400 flex-shrink-0" />
              <div className="flex-1 overflow-hidden">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider font-display leading-none mb-0.5">Active Restaurant</p>
                <p className="text-xs font-semibold text-white truncate">{restaurant.name}</p>
              </div>
            </div>
          )}

          <SidebarNav />
        </div>

        {/* User + Logout */}
        <div className="flex flex-col gap-4 border-t border-white/5 pt-4">
          <UserCard />
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/10 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile Drawer ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-slate-900 border-r border-white/5 p-6 z-50 md:hidden flex flex-col justify-between"
            >
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between pb-4 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-brand-400 fill-brand-400" />
                    <span className="font-display font-bold text-lg text-white">ReviewFlow AI</span>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <SidebarNav onNavClick={() => setMobileMenuOpen(false)} />
              </div>

              <div className="flex flex-col gap-4 border-t border-white/5 pt-4">
                <UserCard />
                <button
                  onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                  className="flex items-center justify-center gap-2 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-6 py-8 md:px-10 md:py-10 max-w-7xl mx-auto w-full">
        <Outlet context={{ session, restaurant }} />
      </main>
    </div>
  );
}
