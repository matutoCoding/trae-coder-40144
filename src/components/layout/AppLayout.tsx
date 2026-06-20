import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  Repeat,
  Wallet,
  Receipt,
  Building2,
  Bell,
  User,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { to: '/schedule', label: '会议室排期', icon: <CalendarClock size={18} /> },
  { to: '/recurring', label: '周期生成', icon: <Repeat size={18} /> },
  { to: '/quota', label: '额度管控', icon: <Wallet size={18} /> },
  { to: '/expense', label: '消费明细', icon: <Receipt size={18} /> },
];

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();

  const handleResetAll = () => {
    if (confirm('确定要重置所有数据吗？此操作将恢复为初始演示数据。')) {
      const stores = [
        'mbs-meeting-store',
        'mbs-booking-store',
        'mbs-rule-store',
        'mbs-quota-store',
        'mbs-expense-store',
      ];
      stores.forEach((k) => localStorage.removeItem(k));
      location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50/50">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-slate-200/60">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button
              onClick={() => navigate('/schedule')}
              className="flex items-center gap-2.5 group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-800 to-teal-500 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                <Building2 size={20} className="text-white" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-serif font-bold text-[15px] text-slate-900">MeetingHub</span>
                <span className="text-[10px] text-slate-500 tracking-widest">企业会议室管理系统</span>
              </div>
            </button>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5',
                      isActive
                        ? 'text-primary-800 bg-primary-50 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          'transition-colors',
                          isActive ? 'text-primary-700' : 'text-slate-400',
                        )}
                      >
                        {item.icon}
                      </span>
                      {item.label}
                      {isActive && (
                        <span className="absolute left-4 right-4 -bottom-[1px] h-0.5 bg-gradient-to-r from-primary-700 to-teal-500 rounded-full" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetAll}
              title="重置所有数据"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <RotateCcw size={18} />
            </button>
            <button className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
            </button>
            <div className="ml-2 flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-700 to-teal-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                A
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-slate-800 leading-tight">系统管理员</p>
                <p className="text-[10px] text-slate-500 leading-tight">admin@corp.com</p>
              </div>
              <button className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <User size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="md:hidden sticky top-16 z-30 border-b border-slate-200/60 bg-white/90 backdrop-blur-md">
        <div className="flex overflow-x-auto px-4 py-2 gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'shrink-0 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1.5',
                  isActive
                    ? 'text-primary-800 bg-primary-50'
                    : 'text-slate-600 bg-slate-50',
                )
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-6 py-6">{children}</main>

      <footer className="mt-10 border-t border-slate-200/60 bg-white/40 backdrop-blur-sm">
        <div className="max-w-[1400px] mx-auto px-6 py-5 text-center text-xs text-slate-500">
          MeetingHub · 企业会议室预约管理系统 · 数据仅存储于本地浏览器
        </div>
      </footer>
    </div>
  );
};
