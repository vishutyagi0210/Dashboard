import Sidebar from './Sidebar';
import Topbar from './Topbar';
import CatCursor from './CatCursor';
import AnimatedBackground from './AnimatedBackground';
import BoosterScrollbar from './BoosterScrollbar';

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-blue-500/30 selection:text-blue-200">
      <CatCursor />
      <BoosterScrollbar />
      <AnimatedBackground />
      
      <Sidebar />
      
      <div className="md:ml-64 flex flex-col min-h-screen relative z-10">
        <Topbar />
        
        <main className="flex-1 p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
