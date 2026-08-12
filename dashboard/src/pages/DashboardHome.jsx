import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, GitPullRequest, AlertCircle, Clock, CheckCircle, XCircle, HelpCircle, Server } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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

  const { summary, dora_metrics, repos, self_hosted_runners } = data;

  // Prepare data for the Success Rate Chart (Top 5 active repos)
  const chartData = repos
    .filter(r => r.total_runs !== 0 && r.last_run_status !== 'unknown')
    .sort((a, b) => b.success_rate - a.success_rate)
    .slice(0, 5);

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto text-slate-100 font-sans pb-20">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold mb-2 text-white tracking-tight">
            Engineering Intelligence
          </h1>
          <p className="text-lg text-slate-400 font-light">Overview of {summary.total_repos} repositories across {data.org}</p>
        </div>
        
        {self_hosted_runners && self_hosted_runners.length > 0 && (
          <div className="flex items-center space-x-4 bg-slate-900/50 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl">
            <Server size={18} className="text-slate-400" />
            <div className="flex space-x-2">
              {self_hosted_runners.map(runner => (
                <div key={runner.name} className="relative group cursor-help">
                  <div className={`w-3 h-3 rounded-full ${runner.status === 'online' ? (runner.busy ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]' : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]') : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'}`}></div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-max bg-slate-800 text-xs px-2 py-1 rounded shadow-xl border border-white/10 z-50">
                    {runner.name}: {runner.status} {runner.busy ? '(Busy)' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* DORA Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <MetricCard title="Deploy Frequency" value={dora_metrics.deployment_frequency.value} unit={dora_metrics.deployment_frequency.unit} icon={<Activity className="text-blue-400" size={28} />} />
        <MetricCard title="Change Failure Rate" value={`${dora_metrics.change_failure_rate.value}%`} unit="percent" icon={<AlertCircle className="text-red-400" size={28} />} />
        <MetricCard title="MTTR" value={dora_metrics.mttr.value} unit="minutes" icon={<Clock className="text-yellow-400" size={28} />} />
        <MetricCard title="PR Cycle Time" value={dora_metrics.pr_cycle_time.value} unit="hours" icon={<GitPullRequest className="text-purple-400" size={28} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
          <h3 className="text-lg font-semibold mb-6">Top Repositories Success Rate</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem' }}
                />
                <Bar dataKey="success_rate" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.success_rate > 80 ? '#34d399' : entry.success_rate > 50 ? '#fbbf24' : '#f87171'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col justify-center items-center text-center">
          <div className="w-32 h-32 rounded-full border-8 border-slate-800 flex items-center justify-center relative mb-6">
            <svg className="absolute top-0 left-0 w-full h-full -rotate-90">
              <circle cx="50%" cy="50%" r="46%" fill="transparent" stroke={summary.overall_success_rate > 80 ? '#34d399' : '#fbbf24'} strokeWidth="8" strokeDasharray="300" strokeDashoffset={300 - (300 * summary.overall_success_rate) / 100} strokeLinecap="round" className="transition-all duration-1000" />
            </svg>
            <span className="text-3xl font-bold">{summary.overall_success_rate}%</span>
          </div>
          <h3 className="text-lg font-semibold">Overall Success Rate</h3>
          <p className="text-sm text-slate-400 mt-2">Aggregated reliability across all {summary.total_repos} repositories.</p>
        </div>
      </div>

      {/* Repo Data Grid */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h3 className="text-lg font-semibold">Tracked Repositories</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-900/40 text-slate-400">
              <tr>
                <th className="px-6 py-4 font-medium">Repository</th>
                <th className="px-6 py-4 font-medium">Language</th>
                <th className="px-6 py-4 font-medium">Last Run Status</th>
                <th className="px-6 py-4 font-medium">Success Rate</th>
                <th className="px-6 py-4 font-medium">Open PRs</th>
                <th className="px-6 py-4 font-medium">Issues</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {repos.map(repo => (
                <tr 
                  key={repo.name} 
                  onClick={() => navigate(`/repo/${repo.name}`)}
                  className="hover:bg-white/5 cursor-pointer transition-colors group"
                >
                  <td className="px-6 py-4 font-semibold text-white group-hover:text-blue-400 transition-colors">{repo.name}</td>
                  <td className="px-6 py-4 text-slate-300">
                    <span className="bg-white/10 px-2 py-1 rounded text-xs">{repo.language || 'Code'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {repo.last_run_status === 'success' ? <CheckCircle className="text-emerald-500" size={16} /> : 
                       repo.last_run_status === 'failure' ? <XCircle className="text-rose-500" size={16} /> : 
                       <HelpCircle className="text-slate-500" size={16} />}
                      <span className="capitalize">{repo.last_run_status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3 w-32">
                      <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full rounded-full ${repo.success_rate > 80 ? 'bg-emerald-400' : repo.success_rate > 50 ? 'bg-yellow-400' : 'bg-rose-400'}`} style={{ width: `${repo.success_rate}%` }}></div>
                      </div>
                      <span className="text-xs text-slate-400">{repo.success_rate}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{repo.open_prs}</td>
                  <td className="px-6 py-4 text-slate-300">{repo.open_issues}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, unit, icon }) {
  return (
    <motion.div whileHover={{ y: -5 }} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl flex items-center space-x-5 relative overflow-hidden group">
      <div className="p-3 bg-white/10 rounded-2xl shadow-inner z-10 group-hover:bg-white/20 transition-colors">
        {icon}
      </div>
      <div className="z-10">
        <p className="text-xs text-slate-400 font-semibold tracking-wide uppercase">{title}</p>
        <p className="text-2xl font-extrabold text-white mt-1">{value}</p>
        <p className="text-xs text-slate-500">{unit}</p>
      </div>
    </motion.div>
  );
}
