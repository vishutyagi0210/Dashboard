import { Search, Bell, User } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function Topbar() {
  return (
    <header className="h-20 w-full flex items-center justify-between px-8 bg-transparent z-40">
      <div className="flex-1 flex items-center">
        <div className="relative w-96 hidden md:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search repositories, pipelines..." 
            className="w-full bg-slate-900/50 border border-white/10 rounded-full py-2 pl-12 pr-4 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all backdrop-blur-md"
          />
        </div>
      </div>
      
      <div className="flex items-center space-x-6">
        <ThemeToggle />
        
        <button className="relative text-slate-400 hover:text-white transition-colors">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-slate-900"></span>
        </button>
        
        <div className="flex items-center space-x-3 pl-6 border-l border-white/10">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center overflow-hidden">
            <User size={16} className="text-slate-400" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-white leading-tight">Admin User</p>
            <p className="text-xs text-slate-400">Engineering Manager</p>
          </div>
        </div>
      </div>
    </header>
  );
}
