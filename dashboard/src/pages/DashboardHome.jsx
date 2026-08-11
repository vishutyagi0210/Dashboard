import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, GitPullRequest, AlertCircle, Clock, CheckCircle, XCircle, HelpCircle } from 'lucide-react';

export default function DashboardHome() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/github/_overview.json`)
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching overview:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="relative z-10 flex min-h-screen items-center justify-center text-white">Loading Overview...</div>;
  if (!data) return <div className="relative z-10 flex min-h-screen items-center justify-center text-white">Failed to load data. Did the ingestion engine run?</div>;

  const { summary, dora_metrics, repos } = data;

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto p-8 text-slate-100 font-sans min-h-screen">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-12 text-center">
        <h1 className="text-5xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
          Engineering Intelligence
        </h1>
        <p className="text-xl text-slate-400 font-light">Tracking {summary.total_repos} repositories across {data.org}</p>
      </motion.div>

      {/* DORA Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        <MetricCard title="Deploy Frequency" value={dora_metrics.deployment_frequency.value} unit={dora_metrics.deployment_frequency.unit} icon={<Activity className="text-blue-400" size={32} />} />
        <MetricCard title="Change Failure Rate" value={`${dora_metrics.change_failure_rate.value}%`} unit="percent" icon={<AlertCircle className="text-red-400" size={32} />} />
        <MetricCard title="MTTR" value={dora_metrics.mttr.value} unit="minutes" icon={<Clock className="text-yellow-400" size={32} />} />
        <MetricCard title="PR Cycle Time" value={dora_metrics.pr_cycle_time.value} unit="hours" icon={<GitPullRequest className="text-purple-400" size={32} />} />
      </div>

      {/* Repo Grid */}
      <h2 className="text-3xl font-semibold mb-6 flex items-center">
        Repositories <span className="ml-4 text-sm font-normal bg-white/10 px-3 py-1 rounded-full">{summary.overall_success_rate}% Overall Success</span>
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
        {repos.map((repo, idx) => (
          <motion.div 
            key={repo.name}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={{ scale: 1.02, y: -5 }}
            onClick={() => navigate(`/repo/${repo.name}`)}
            className="cursor-pointer group relative bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-2xl hover:bg-white/10 transition-all overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-bold text-white truncate pr-2 group-hover:text-blue-300 transition-colors">{repo.name}</h3>
              {repo.last_run_status === 'success' ? <CheckCircle className="text-green-500 flex-shrink-0" /> : 
               repo.last_run_status === 'failure' ? <XCircle className="text-red-500 flex-shrink-0" /> : 
               <HelpCircle className="text-slate-500 flex-shrink-0" />}
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-slate-300 mb-6">
              <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-semibold tracking-wider">{repo.language || 'Code'}</span>
              <span className="flex items-center"><AlertCircle size={14} className="mr-1 text-orange-400" /> {repo.open_issues}</span>
              <span className="flex items-center"><GitPullRequest size={14} className="mr-1 text-purple-400" /> {repo.open_prs}</span>
            </div>

            <div className="w-full bg-slate-800/80 rounded-full h-2 mb-2 overflow-hidden shadow-inner">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${repo.success_rate}%` }}
                transition={{ duration: 1, delay: 0.2 }}
                className={`h-2 rounded-full ${repo.success_rate > 80 ? 'bg-gradient-to-r from-green-400 to-emerald-500' : repo.success_rate > 50 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-gradient-to-r from-red-400 to-rose-600'}`}
              ></motion.div>
            </div>
            <p className="text-xs text-right text-slate-400 font-medium">{repo.success_rate}% Success</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ title, value, unit, icon }) {
  return (
    <motion.div whileHover={{ scale: 1.05 }} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex items-center space-x-6 relative overflow-hidden group">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
      <div className="p-4 bg-white/10 rounded-2xl shadow-inner z-10">
        {icon}
      </div>
      <div className="z-10">
        <p className="text-sm text-slate-400 font-semibold tracking-wide uppercase">{title}</p>
        <p className="text-4xl font-extrabold text-white mt-1">{value}</p>
        <p className="text-xs text-slate-500 mt-1">{unit}</p>
      </div>
    </motion.div>
  );
}
