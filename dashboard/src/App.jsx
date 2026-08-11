import { HashRouter, Routes, Route } from 'react-router-dom';

import ThemeToggle from './components/ThemeToggle';
import CatCursor from './components/CatCursor';
import AnimatedBackground from './components/AnimatedBackground';
import BoosterScrollbar from './components/BoosterScrollbar';

import DashboardHome from './pages/DashboardHome';
import RepoDetails from './pages/RepoDetails';

export default function App() {
  return (
    <HashRouter>
      <CatCursor />
      <BoosterScrollbar />
      <AnimatedBackground />
      <ThemeToggle />

      <Routes>
        <Route path="/" element={<DashboardHome />} />
        <Route path="/repo/:repoName" element={<RepoDetails />} />
      </Routes>
    </HashRouter>
  );
}
