import { HashRouter, Routes, Route } from 'react-router-dom';

import ThemeToggle from './components/ThemeToggle';
import CatCursor from './components/CatCursor';
import AnimatedBackground from './components/AnimatedBackground';
import BoosterScrollbar from './components/BoosterScrollbar';

import DashboardHome from './pages/DashboardHome';

export default function App() {
  return (
    <HashRouter>
      <CatCursor />
      <BoosterScrollbar />
      <AnimatedBackground />
      <ThemeToggle />

      <Routes>
        <Route path="/" element={<DashboardHome />} />
      </Routes>
    </HashRouter>
  );
}
