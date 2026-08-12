import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Zap, Database, Server } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function ApiTelemetry() {
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/github/_api_usage.json`)
      .then(res => res.json())
      .then(json => {
        // Handle migration from old flat schema to new nested schema
        if (json.current) {
          setApiData(json);
        } else {
          setApiData({ current: json, history: [json] });
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching telemetry:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="flex min-h-screen items-center justify-center text-white">Loading Telemetry...</div>;
  if (!apiData) return <div className="flex min-h-screen items-center justify-center text-white">Failed to load API Telemetry. (Has the ingestion engine run?)</div>;

  const currentRun = apiData.current;
  const history = apiData.history.slice().reverse(); // reverse to chronological order for charts

  const used = currentRun.rate_limit - currentRun.rate_limit_remaining;
  const remaining = currentRun.rate_limit_remaining;
  
  const chartData = [
    { name: 'Used Quota', value: used },
    { name: 'Remaining Quota', value: remaining }
  ];
  
  const historyData = history.map((h, i) => ({
    name: `Run ${i + 1}`,
    calls: h.api_calls_made,
    remaining: h.rate_limit_remaining,
    time: new Date(h.last_synced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }));

  const COLORS = ['#f43f5e', '#3b82f6'];

  return (
    <div className="w-full max-w-6xl mx-auto text-slate-100 font-sans pb-20">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <h1 className="text-4xl font-extrabold mb-2 text-white tracking-tight flex items-center">
          <Activity className="mr-3 text-blue-500" size={36} /> API Telemetry
        </h1>
        <p className="text-lg text-slate-400 font-light">Monitor your exact GitHub API footprint and historical run costs.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-center">
          <div className="flex items-center space-x-3 mb-2">
            <Zap className="text-yellow-400" size={24} />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Last Run Cost</h3>
          </div>
          <p className="text-4xl font-extrabold text-white">{currentRun.api_calls_made}</p>
          <p className="text-xs text-slate-500 mt-2">Requests consumed by the most recent engine run.</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-center">
          <div className="flex items-center space-x-3 mb-2">
            <Database className="text-blue-400" size={24} />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Hourly Quota</h3>
          </div>
          <p className="text-4xl font-extrabold text-white">{currentRun.rate_limit}</p>
          <p className="text-xs text-slate-500 mt-2">Maximum requests per hour (Free Tier = 5000).</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-center">
          <div className="flex items-center space-x-3 mb-2">
            <Server className="text-emerald-400" size={24} />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Remaining</h3>
          </div>
          <p className="text-4xl font-extrabold text-white">{currentRun.rate_limit_remaining}</p>
          <p className="text-xs text-slate-500 mt-2">Live remaining quota until reset window.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <h3 className="text-lg font-semibold mb-6">Historical Run Costs</h3>
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="calls" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#1e293b' }} activeDot={{ r: 6 }} name="API Calls Consumed" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-400 text-center mt-4">Tracks the API footprint of the last 50 ingestion executions.</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center">
          <h3 className="text-lg font-semibold self-start mb-4">Live Quota Usage</h3>
          <div className="w-64 h-64 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
              <span className="block text-3xl font-bold">{Math.round((used / currentRun.rate_limit) * 100)}%</span>
              <span className="text-xs text-slate-400">Utilized</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <h3 className="text-lg font-semibold mb-4">Modular Configuration Cost</h3>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            By leveraging the <code className="bg-slate-900 px-1 py-0.5 rounded text-blue-300">config.yml</code> at the root of the repository, you can finely control the API footprint.
          </p>
          
          <ul className="space-y-4">
            <li className="flex items-start">
              <div className="w-2 h-2 mt-2 bg-blue-500 rounded-full mr-3 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
              <div>
                <p className="font-semibold text-sm">Fresh Ingestion (Max Cost)</p>
                <p className="text-xs text-slate-400">Requires scanning deep pipeline history. Disabling `fetch_cache` or reducing `history_depth` in the config can cut this by 50%.</p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="w-2 h-2 mt-2 bg-emerald-500 rounded-full mr-3 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
              <div>
                <p className="font-semibold text-sm">Incremental Sync (Avg Cost)</p>
                <p className="text-xs text-slate-400">Highly optimized. The engine breaks pagination early if the `_runs.json` is already up to date, costing only ~3 API calls per active repository.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {currentRun.call_log && currentRun.call_log.length > 0 && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl font-mono text-xs overflow-hidden">
          <div className="flex items-center space-x-2 mb-4 pb-4 border-b border-slate-700">
            <div className="w-3 h-3 rounded-full bg-rose-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="ml-4 text-slate-400 font-sans text-sm font-semibold tracking-wide">Execution Receipt (Latest Run)</span>
          </div>
          <div className="max-h-96 overflow-y-auto space-y-2 text-emerald-400 pr-4 custom-scrollbar">
            {currentRun.call_log.map((log, index) => (
              <div key={index} className="flex">
                <span className="text-slate-600 mr-4 w-6 text-right select-none">{index + 1}</span>
                <span className="break-all">{log}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
