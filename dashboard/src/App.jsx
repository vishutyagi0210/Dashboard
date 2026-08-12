import { HashRouter, Routes, Route } from 'react-router-dom';

import DashboardLayout from './components/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import RepoDetails from './pages/RepoDetails';

export default function App() {
  return (
    <HashRouter>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<DashboardHome />} />
          <Route path="/repo/:repoName" element={<RepoDetails />} />
        </Routes>
      </DashboardLayout>
    </HashRouter>
  );
}
