import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
  BarChart, Bar, Legend
} from 'recharts';
import { 
  Users, Eye, FileText, DollarSign, AlertCircle, 
  TrendingUp, Clock, MousePointer, ChevronRight,
  Activity, Shield, Zap, CheckCircle, Brain, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { isPreviewOrAdmin } from '../utils/envHelper';
import { adminLogService } from '../services/adminLogService';
import { GoogleGenAI } from '@google/genai';

interface VisitorSession {
  session_token: string;
  user_id: string | null;
  browser_info: any;
  created_at: string;
  last_active_at: string;
  is_returning?: boolean;
}

interface PageView {
  id: number;
  session_token: string;
  path: string;
  created_at: string;
}

interface ErrorLog {
  id: string;
  message: string;
  stack: string;
  path: string;
  is_solved: boolean;
  created_at: string;
}

interface AdminLog {
  id: string;
  admin_email: string;
  action: string;
  target_id: string | null;
  details: any;
  created_at: string;
}

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useOutletContext<any>();
  const [isChecking, setIsChecking] = useState(true);
  const [sessions, setSessions] = useState<VisitorSession[]>([]);
  const [pageViews, setPageViews] = useState<PageView[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [totalGenerations, setTotalGenerations] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  // Robust Admin Check on Mount
  useEffect(() => {
    const verifyAdmin = async () => {
        if (isPreviewOrAdmin()) {
            setIsChecking(false);
            return;
        }

        if (user) {
            if (user.email === 'mqhele03@gmail.com') {
                setIsChecking(false);
            } else {
                navigate('/');
            }
            return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email === 'mqhele03@gmail.com') {
            setIsChecking(false);
        } else {
            navigate('/');
        }
    };

    verifyAdmin();
  }, [user, navigate]);

  useEffect(() => {
    if (!isChecking) {
        fetchData();
        
        // Realtime subscription for live updates
        const channel = supabase.channel('admin_live_updates')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'visitor_sessions' }, () => fetchData())
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'page_views' }, () => fetchData())
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cv_applications' }, () => fetchData())
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments' }, () => fetchData())
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
    }
  }, [isChecking]);

  const fetchData = async () => {
    try {
      const [sessionsRes, viewsRes, errorsRes, gensRes, paymentsRes, adminLogsRes] = await Promise.all([
        supabase.from('visitor_sessions').select('*').order('last_active_at', { ascending: false }),
        supabase.from('page_views').select('*').order('created_at', { ascending: false }).limit(1000),
        supabase.from('error_logs').select('*').eq('is_solved', false).order('created_at', { ascending: false }).limit(50),
        supabase.from('cv_applications').select('id', { count: 'exact' }),
        supabase.from('payments').select('amount'),
        adminLogService.getLogs(50)
      ]);

      if (sessionsRes.data) setSessions(sessionsRes.data);
      if (viewsRes.data) setPageViews(viewsRes.data);
      if (errorsRes.data) setErrorLogs(errorsRes.data);
      if (gensRes.count !== null) setTotalGenerations(gensRes.count);
      if (paymentsRes.data) {
        const revenue = paymentsRes.data.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        setTotalRevenue(revenue);
      }
      if (adminLogsRes) setAdminLogs(adminLogsRes);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate Stats
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const liveUsers = sessions.filter(s => new Date(s.last_active_at) > new Date(now.getTime() - 5 * 60 * 1000)).length;
  const lastHourViews = pageViews.filter(v => new Date(v.created_at) > oneHourAgo).length;
  const last24hViews = pageViews.filter(v => new Date(v.created_at) > twentyFourHoursAgo).length;
  
  const returningUsers = sessions.filter(s => s.is_returning).length;
  const newUsers = sessions.length - returningUsers;

  // Prepare Chart Data (Views per hour for last 24h)
  const chartData = Array.from({ length: 24 }).map((_, i) => {
    const hour = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
    const count = pageViews.filter(v => {
      const vDate = new Date(v.created_at);
      return vDate.getHours() === hour.getHours() && vDate.getDate() === hour.getDate();
    }).length;
    return {
      time: hour.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      views: count
    };
  });

  const handleMarkSolved = async (id: string) => {
    try {
      const { error } = await supabase
        .from('error_logs')
        .update({ is_solved: true })
        .eq('id', id);
      
      if (error) throw error;
      
      setErrorLogs(prev => prev.filter(log => log.id !== id));
      if (selectedError?.id === id) setSelectedError(null);
      
      adminLogService.logAction('MARK_ERROR_SOLVED', id, { timestamp: new Date().toISOString() });
    } catch (err) {
      console.error('Error marking as solved:', err);
    }
  };

  const handleExplainError = async (log: ErrorLog) => {
    setIsExplaining(true);
    setAiExplanation(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze this application error and provide:
1. A clear explanation of what likely went wrong.
2. A technical guess on the root cause.
3. A suggested prompt that the developer can send to an AI assistant to fix this specific issue.

Error Message: ${log.message}
Stack Trace: ${log.stack || 'N/A'}
Path: ${log.path}
`,
      });
      setAiExplanation(response.text || "Failed to generate explanation.");
    } catch (err) {
      console.error('AI Explanation failed:', err);
      setAiExplanation("Error communicating with AI service.");
    } finally {
      setIsExplaining(false);
    }
  };

  if (isChecking || loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Shield className="text-emerald-500" />
              Admin Command Center
            </h1>
            <p className="text-zinc-400 mt-1">Real-time platform intelligence & analytics</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-emerald-500 text-sm font-medium">{liveUsers} Live Now</span>
            </div>
            <button 
              onClick={fetchData}
              className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <Zap size={18} />
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard 
            title="Total Revenue" 
            value={`$${totalRevenue.toFixed(2)}`} 
            icon={<DollarSign className="text-emerald-500" />} 
            trend="Live" 
          />
          <div onClick={() => navigate('/admin-leads')} className="cursor-pointer">
            <StatCard 
              title="Total Leads" 
              value="View Leads" 
              icon={<Users className="text-blue-500" />} 
              trend="New" 
            />
          </div>
          <StatCard 
            title="New Users" 
            value={newUsers.toString()} 
            icon={<Zap className="text-amber-500" />} 
            trend={`${((newUsers / (sessions.length || 1)) * 100).toFixed(0)}%`} 
          />
          <StatCard 
            title="Live Sessions" 
            value={liveUsers.toString()} 
            icon={<Activity className="text-purple-500" />} 
            trend="Active" 
          />
          <StatCard 
            title="Recent Errors" 
            value={errorLogs.length.toString()} 
            icon={<AlertCircle className="text-red-500" />} 
            trend={errorLogs.length > 10 ? "High" : "Normal"} 
          />
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Charts Section */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-500" />
                Traffic Overview (Last 24 Hours)
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="time" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                      itemStyle={{ color: '#10b981' }}
                    />
                    <Area type="monotone" dataKey="views" stroke="#10b981" fillOpacity={1} fill="url(#colorViews)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Journeys */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MousePointer size={18} className="text-blue-500" />
                  Recent User Journeys
                </h3>
                <button className="text-sm text-emerald-500 hover:underline">View All</button>
              </div>
              <div className="space-y-4">
                {pageViews.slice(0, 8).map((view) => (
                  <div key={view.id} className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-xl border border-zinc-800/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-mono text-zinc-400">
                        {view.session_token.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{view.path}</p>
                        <p className="text-xs text-zinc-500">{new Date(view.created_at).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-zinc-600" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Section */}
          <div className="space-y-8">
            {/* Error Logs */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <AlertCircle size={18} className="text-red-500" />
                Recent Error Logs
              </h3>
              <div className="space-y-4">
                {errorLogs.length === 0 ? (
                  <p className="text-sm text-zinc-500 italic">No errors reported recently.</p>
                ) : (
                  errorLogs.slice(0, 8).map((log) => (
                    <div 
                      key={log.id} 
                      onClick={() => setSelectedError(log)}
                      className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl cursor-pointer hover:bg-red-500/10 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-mono text-red-400 truncate mb-1 flex-1">{log.message}</p>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkSolved(log.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-emerald-500/20 rounded text-emerald-500 transition-all"
                          title="Mark as Solved"
                        >
                          <CheckCircle size={14} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500">{log.path}</span>
                        <span className="text-[10px] text-zinc-500">{new Date(log.created_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Error Detail Modal */}
            <AnimatePresence>
              {selectedError && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                  >
                    <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="text-red-500" />
                        <h2 className="text-xl font-bold">Error Details</h2>
                      </div>
                      <button onClick={() => { setSelectedError(null); setAiExplanation(null); }} className="text-zinc-500 hover:text-white">
                        <X size={24} />
                      </button>
                    </div>

                    <div className="p-6 overflow-y-auto space-y-6">
                      <div>
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Message</h4>
                        <p className="text-red-400 font-mono text-sm bg-red-500/5 p-3 rounded-lg border border-red-500/10">
                          {selectedError.message}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Path</h4>
                          <p className="text-sm text-zinc-300">{selectedError.path}</p>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Timestamp</h4>
                          <p className="text-sm text-zinc-300">{new Date(selectedError.created_at).toLocaleString()}</p>
                        </div>
                      </div>

                      {selectedError.stack && (
                        <div>
                          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Stack Trace</h4>
                          <pre className="text-[10px] font-mono text-zinc-500 bg-black/40 p-4 rounded-lg overflow-x-auto max-h-40">
                            {selectedError.stack}
                          </pre>
                        </div>
                      )}

                      <div className="pt-4 border-t border-zinc-800">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-bold flex items-center gap-2">
                            <Brain size={16} className="text-emerald-500" />
                            AI Explanation
                          </h4>
                          {!aiExplanation && !isExplaining && (
                            <button 
                              onClick={() => handleExplainError(selectedError)}
                              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                            >
                              Generate Explanation
                            </button>
                          )}
                        </div>

                        {isExplaining && (
                          <div className="flex items-center gap-3 text-zinc-500 text-sm animate-pulse">
                            <Brain className="animate-bounce" size={16} />
                            Analyzing error patterns...
                          </div>
                        )}

                        {aiExplanation && (
                          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                            {aiExplanation}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-end gap-3">
                      <button 
                        onClick={() => handleMarkSolved(selectedError.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-all"
                      >
                        <CheckCircle size={18} />
                        Mark as Solved
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Platform Health */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-6">Platform Health</h3>
              <div className="space-y-4">
                <HealthMetric label="Supabase Connection" status="Operational" />
                <HealthMetric label="Gemini AI API" status="Operational" />
                <HealthMetric label="Payment Gateway" status="Operational" />
                <HealthMetric label="Email Service" status="Operational" />
              </div>
            </div>

            {/* Admin Activity Logs */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Shield size={18} className="text-emerald-500" />
                Admin Activity Logs
              </h3>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {adminLogs.length === 0 ? (
                  <p className="text-sm text-zinc-500 italic">No admin activity recorded.</p>
                ) : (
                  adminLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">{log.action}</span>
                        <span className="text-[10px] text-zinc-500">{new Date(log.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-xs text-zinc-300 mb-1">{log.target_id || 'Global Action'}</p>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="text-[10px] text-zinc-500 bg-black/20 p-1.5 rounded font-mono truncate">
                          {JSON.stringify(log.details)}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; trend: string }> = ({ title, value, icon, trend }) => (
  <motion.div 
    whileHover={{ y: -2 }}
    className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl"
  >
    <div className="flex items-center justify-between mb-4">
      <div className="p-2 bg-zinc-800 rounded-lg">{icon}</div>
      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
        trend === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 
        trend === 'High' ? 'bg-red-500/10 text-red-500' : 'bg-zinc-800 text-zinc-400'
      }`}>
        {trend}
      </span>
    </div>
    <h4 className="text-zinc-400 text-sm font-medium">{title}</h4>
    <p className="text-2xl font-bold mt-1">{value}</p>
  </motion.div>
);

const HealthMetric: React.FC<{ label: string; status: string }> = ({ label, status }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-zinc-400">{label}</span>
    <div className="flex items-center gap-2">
      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
      <span className="text-xs font-medium text-emerald-500">{status}</span>
    </div>
  </div>
);
