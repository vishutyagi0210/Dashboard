import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Server, Shield, Settings, GitPullRequest, Activity } from 'lucide-react';

export default function Sidebar() {
  const navItems = [
    { name: 'Overview', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Pipelines', path: '/#', icon: <GitPullRequest size={20} /> },
    { name: 'Telemetry', path: '/telemetry', icon: <Activity size={20} /> },
    { name: 'Infrastructure', path: '/#', icon: <Server size={20} /> },
    { name: 'Security', path: '/#', icon: <Shield size={20} /> },
    { name: 'Settings', path: '/#', icon: <Settings size={20} /> },
  ];

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 bg-slate-900/60 backdrop-blur-2xl border-r border-white/10 z-50 flex flex-col hidden md:flex">
      <div className="p-6 border-b border-white/10 flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Server className="text-white" size={18} />
        </div>
        <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
          OpsTree
        </span>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <div className="text-xs font-semibold text-slate-500 mb-4 px-3 uppercase tracking-wider">Main Menu</div>
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                isActive && item.path !== '/#'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`
            }
          >
            {item.icon}
            <span className="font-medium">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-6 border-t border-white/10">
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-purple-500/20 to-transparent rounded-bl-full"></div>
          <p className="text-xs text-slate-400 font-medium">System Status</p>
          <div className="flex items-center mt-2 space-x-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
            <p className="text-sm text-emerald-400 font-semibold">All Systems Operational</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
