import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, GitCommit, PlayCircle, CheckCircle, XCircle, ChevronDown, ChevronUp, AlertTriangle, Shield, ShieldAlert, TestTube, CheckSquare } from 'lucide-react';

export default function RepoDetails() {
  const { repoName } = useParams();
  const navigate = useNavigate();
  const [meta, setMeta] = useState(null);
  const [runs, setRuns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedRun, setExpandedRun] = useState(null);

  useEffect(() => {
    // Scroll to top when loading new repo
    window.scrollTo(0, 0);
    setLoading(true);

    const baseUrl = import.meta.env.BASE_URL;
    
    Promise.all([
      fetch(`${baseUrl}data/github/repos/${repoName}/_meta.json`).then(r => r.json()),
      fetch(`${baseUrl}data/github/repos/${repoName}/_runs.json`).then(r => r.json())
    ])
    .then(([metaData, runsData]) => {
      setMeta(metaData);
      setRuns(runsData.runs || []);
      setLoading(false);
    })
    .catch(err => {
      console.error("Error fetching repo details:", err);
      setLoading(false);
    });
  }, [repoName]);

  if (loading) return <div className="relative z-10 flex min-h-screen items-center justify-center text-white">Loading {repoName}...</div>;
  if (!meta) return <div className="relative z-10 flex min-h-screen items-center justify-center text-white">Failed to load {repoName}.</div>;

  return (
    <div className="relative z-10 w-full max-w-5xl mx-auto p-8 text-slate-100 font-sans min-h-screen">
      
      {/* Header */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-10">
        <button onClick={() => navigate('/')} className="flex items-center text-slate-400 hover:text-white transition-colors mb-6 group">
          <ArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" size={20} /> Back to Overview
        </button>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">{meta.name}</h1>
            <p className="text-slate-400">{meta.full_name} • {meta.language} • {meta.default_branch}</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-4">
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-center">
              <p className="text-xs text-slate-400">Issues</p>
              <p className="font-bold text-lg">{meta.insights.open_issues}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-center">
              <p className="text-xs text-slate-400">PRs</p>
              <p className="font-bold text-lg">{meta.insights.open_prs}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-center">
              <p className="text-xs text-slate-400">Cache</p>
              <p className="font-bold text-lg">{meta.cache_usage.total_size_mb} MB</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Top Contributors */}
      {meta.top_contributors && meta.top_contributors.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <h2 className="text-xl font-semibold mb-4 text-slate-200">Top Contributors</h2>
          <div className="flex space-x-4">
            {meta.top_contributors.map(c => (
              <div key={c.login} className="flex items-center bg-white/5 backdrop-blur-sm border border-white/10 rounded-full pl-2 pr-4 py-2">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3 text-sm">
                  {c.login.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold">{c.login}</p>
                  <p className="text-xs text-slate-400">{c.commits} commits</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Pipeline Runs Timeline */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-semibold mb-6 flex items-center">
          <PlayCircle className="mr-2 text-blue-400" /> Recent Pipeline Executions
        </h2>
        
        {runs.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-slate-400">
            No workflow runs recorded for this repository.
          </div>
        ) : (
          <div className="space-y-4">
            {runs.map((run, idx) => (
              <RunCard 
                key={run.run_id} 
                run={run} 
                isExpanded={expandedRun === run.run_id} 
                onToggle={() => setExpandedRun(expandedRun === run.run_id ? null : run.run_id)} 
              />
            ))}
          </div>
        )}
      </motion.div>

    </div>
  );
}

function RunCard({ run, isExpanded, onToggle }) {
  const isSuccess = run.conclusion === 'success';
  const isFailure = run.conclusion === 'failure';
  
  const borderColor = isSuccess ? 'border-green-500/30' : isFailure ? 'border-red-500/50' : 'border-white/10';
  const bgColor = isFailure ? 'bg-red-500/5' : 'bg-white/5';
  
  // Format Date
  const dateObj = new Date(run.created_at);
  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = dateObj.toLocaleDateString();

  return (
    <div className={`border ${borderColor} ${bgColor} backdrop-blur-md rounded-2xl overflow-hidden transition-all duration-300 shadow-lg`}>
      <div 
        className="p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between group"
        onClick={onToggle}
      >
        <div className="flex items-start md:items-center space-x-4">
          <div className="mt-1 md:mt-0">
            {isSuccess ? <CheckCircle className="text-green-400" size={24} /> : 
             isFailure ? <XCircle className="text-red-400" size={24} /> : 
             <Clock className="text-slate-400" size={24} />}
          </div>
          <div>
            <h3 className="font-bold text-lg text-white group-hover:text-blue-300 transition-colors">{run.workflow}</h3>
            <div className="flex items-center text-sm text-slate-400 mt-1 space-x-3">
              <span className="flex items-center"><GitCommit size={14} className="mr-1" /> {run.branch} ({run.sha})</span>
              <span>•</span>
              <span>{run.trigger}</span>
              <span>•</span>
              <span>ID: {run.run_id}</span>
            </div>
            
            {/* Artifact Badges */}
            {run.artifacts && Object.keys(run.artifacts).length > 0 && (
              <div className="flex items-center space-x-3 mt-3 flex-wrap gap-y-2">
                
                {/* Vulnerabilities (Trivy) */}
                {run.artifacts.vulnerabilities && (
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded text-xs border font-medium ${run.artifacts.vulnerabilities.CRITICAL > 0 ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
                    {run.artifacts.vulnerabilities.CRITICAL > 0 ? <ShieldAlert size={14} /> : <Shield size={14} />}
                    <span>{run.artifacts.vulnerabilities.CRITICAL} Crit / {run.artifacts.vulnerabilities.HIGH} High</span>
                  </div>
                )}
                
                {/* Secrets (Gitleaks) */}
                {run.artifacts.secrets_found !== undefined && (
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded text-xs border font-medium ${run.artifacts.secrets_found > 0 ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
                    {run.artifacts.secrets_found > 0 ? <AlertTriangle size={14} /> : <Shield size={14} />}
                    <span>{run.artifacts.secrets_found} Secrets</span>
                  </div>
                )}
                
                {/* Quality Gate (SonarQube) */}
                {run.artifacts.quality_gate && (
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded text-xs border font-medium ${run.artifacts.quality_gate === 'OK' || run.artifacts.quality_gate === 'PASSED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                    <CheckSquare size={14} />
                    <span>QG: {run.artifacts.quality_gate}</span>
                  </div>
                )}
                
                {/* Tests */}
                {run.artifacts.has_tests && (
                  <div className="flex items-center space-x-1 px-2 py-1 rounded text-xs border bg-blue-500/10 text-blue-400 border-blue-500/30 font-medium">
                    <TestTube size={14} />
                    <span>Tests Run</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center justify-between md:justify-end w-full md:w-auto space-x-6">
          <div className="text-right flex flex-col items-end">
            <p className="text-sm font-medium text-slate-300">{dateStr} at {timeStr}</p>
            <div className="flex space-x-3 mt-1">
              <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400 border border-white/5">
                Run: {run.timing ? Math.round(run.timing.run_duration_ms / 1000) : 'N/A'}s
              </span>
              <span className="text-xs bg-blue-900/30 text-blue-300 px-2 py-1 rounded border border-blue-500/20 font-semibold flex items-center">
                <Clock size={12} className="mr-1" /> {run.timing ? run.timing.billable_minutes : 0} min compute
              </span>
            </div>
          </div>
          <div className="text-slate-400">
            {isExpanded ? <ChevronUp /> : <ChevronDown />}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/5 bg-black/20"
          >
            <div className="p-6">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Job Execution Log</h4>
              
              <div className="space-y-3">
                {run.jobs && run.jobs.map((job, jIdx) => (
                  <div key={jIdx} className="bg-white/5 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {job.status === 'success' ? <CheckCircle size={16} className="text-green-400" /> : 
                         job.status === 'failure' ? <XCircle size={16} className="text-red-400" /> : 
                         <Clock size={16} className="text-slate-400" />}
                        <span className="font-medium text-slate-200">{job.name}</span>
                      </div>
                    </div>
                    
                    {/* Render Error Snippet if failed */}
                    {job.status === 'failure' && job.error_snippet && (
                      <div className="mt-3 bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                        <p className="text-xs text-red-400 font-bold mb-2 flex items-center">
                          <AlertTriangle size={14} className="mr-1" /> ERROR SNIPPET EXTRACTED
                        </p>
                        <pre className="text-xs text-red-200 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                          {job.error_snippet}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
