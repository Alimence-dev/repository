import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const NAV_ITEMS = {
  student: [
    { to: '/student', label: 'Dashboard', end: true },
    { to: '/student/topics', label: 'Topics & Proposal' },
    { to: '/repository', label: 'Repository' },
  ],
  supervisor: [
    { to: '/supervisor', label: 'Dashboard', end: true },
    { to: '/repository', label: 'Repository' },
  ],
  coordinator: [
    { to: '/coordinator', label: 'Dashboard', end: true },
    { to: '/coordinator/projects', label: 'Projects' },
    { to: '/coordinator/topics', label: 'Topics' },
    { to: '/coordinator/allocations', label: 'Allocations' },
    { to: '/coordinator/defense', label: 'Defense' },
    { to: '/coordinator/archive', label: 'Archive' },
    { to: '/coordinator/reports', label: 'Reports' },
    { to: '/coordinator/statistics', label: 'Statistics' },
    { to: '/repository', label: 'Repository' },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', end: true },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/audit', label: 'Activity Log' },
  ],
};

const ROLE_LABEL = { student: 'Student', supervisor: 'Supervisor', coordinator: 'Coordinator', admin: 'Admin' };

export default function Layout() {
  const { user, logout } = useAuth();
  const navItems = NAV_ITEMS[user?.role] || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-6 flex-wrap">
            <span
              className="flex items-center gap-2 whitespace-nowrap"
              title="AI-Integrated Web-Based University of Kigali Final Project Coordination System"
            >
              <span className="w-6 h-6 rounded bg-indigo-600 text-white flex items-center justify-center font-semibold text-xs shrink-0">
                U
              </span>
              <span className="font-semibold text-slate-900">UOK Final Project Coordination</span>
            </span>
            <nav className="flex gap-4 flex-wrap">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `text-sm font-medium whitespace-nowrap ${
                      isActive ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <span className="text-sm text-slate-500 hidden md:inline">{user?.full_name}</span>
            <span className="text-xs uppercase tracking-wide text-slate-500 border border-slate-200 rounded px-2 py-0.5 hidden sm:inline">
              {ROLE_LABEL[user?.role]}
            </span>
            <button onClick={logout} className="text-sm text-red-600 hover:text-red-700 font-medium whitespace-nowrap">
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
