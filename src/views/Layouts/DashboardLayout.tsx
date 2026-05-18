import { useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { 
  LayoutDashboard, Building2, UserCog, Layers, BookOpen, 
  Users, Calendar, FileText, Target, BarChart3, ClipboardList, Settings, LogOut,
  GraduationCap, AlertTriangle
} from 'lucide-react';
import { Logo } from '../../components/Logo';
import { ROLE_BADGE } from '../../types';

export function DashboardLayout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate('/login', { replace: true });
  }, [loading, user, navigate]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#FAFAFA]">
      <div className="text-sm text-gray-500">Loading…</div>
    </div>
  );
  if (!user) return null;

  const getSidebarItems = () => {
    switch (user.role) {
      case 'ADMIN':
        return [
          { label: 'Dashboard',        href: '/admin',                    icon: LayoutDashboard },
          { label: 'Program Managers', href: '/admin/staff',              icon: Building2 },
          { label: 'All Users',        href: '/admin/users',              icon: UserCog },
          { label: 'Pathways',         href: '/admin/pathways',           icon: Layers },
          { label: 'Classes',          href: '/admin/classes',            icon: BookOpen },
          { label: 'Communities',      href: '/admin/communities',        icon: Users },
          { label: 'Report Cycles',    href: '/admin/cycles',             icon: Calendar },
          { label: 'All Reports',      href: '/admin/reports',            icon: FileText },
          { label: 'Questions',        href: '/admin/targeted-questions', icon: Target },
          { label: 'Analytics',        href: '/admin/analytics',          icon: BarChart3 },
          { label: 'Audit Logs',       href: '/admin/audit',              icon: ClipboardList },
          { label: 'Settings',         href: '/admin/settings',           icon: Settings },
        ];
      case 'PROGRAM_MANAGER':
        return [
          { label: 'Dashboard',     href: '/pm',            icon: LayoutDashboard }
        ];
      case 'INSTRUCTOR':
        return [
          { label: 'Dashboard',  href: '/instructor',          icon: LayoutDashboard }
        ];
      case 'COACH':
        return [
          { label: 'Dashboard',    href: '/coach',          icon: LayoutDashboard }
        ];
      case 'STUDENT':
        return [
          { label: 'Dashboard',      href: '/student',         icon: LayoutDashboard },
          { label: 'Weekly Report',  href: '/student/report',  icon: FileText }
        ];
      default: return [];
    }
  };

  const navItems = getSidebarItems();

  return (
    <div className="flex bg-[#FAFAFA] min-h-screen">
      {/* Sidebar */}
      <aside className="w-[260px] bg-white border-r border-[#E5E7EB] flex flex-col fixed inset-y-0 z-50">
        <div className="h-16 flex items-center px-6 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#050505] flex items-center justify-center">
              <Logo className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold font-display text-sm">EchoTrack</span>
              <span className="text-[9px] uppercase tracking-widest text-[#6B7280]">KSP DOMINION GROUP</span>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all relative ${
                  isActive 
                    ? 'bg-[#FFF4EB] text-[#FF7A00] font-medium' 
                    : 'text-[#6B7280] hover:bg-[#F5F5F5] hover:text-[#0A0A0A]'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
                {isActive && (
                  <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-[#FF7A00]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E5E7EB]">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#6B7280] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-[260px] flex flex-col min-h-screen">
        <header className="h-16 flex items-center justify-end px-8 border-b border-[#E5E7EB] bg-white sticky top-0 z-40">
           <div className="flex items-center gap-4">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-[#FFF4EB] text-[#FF7A00] flex items-center justify-center font-bold text-xs uppercase">
                 {user?.name?.[0] || 'U'}
               </div>
               <div className="flex flex-col text-right">
                 <span className="text-sm font-medium leading-none">{user?.name}</span>
                 {user?.role && ROLE_BADGE[user.role] ? (
                   <span className={`text-[9px] uppercase font-bold tracking-widest mt-1 px-1.5 py-0.5 rounded border inline-block w-fit ml-auto ${ROLE_BADGE[user.role].bg} ${ROLE_BADGE[user.role].text} ${ROLE_BADGE[user.role].border}`}>
                     {ROLE_BADGE[user.role].label}
                   </span>
                 ) : (
                   <span className="text-[10px] uppercase tracking-widest text-[#6B7280] mt-1">{user?.role}</span>
                 )}
               </div>
             </div>
           </div>
        </header>
        <div className="p-6 lg:p-8 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
