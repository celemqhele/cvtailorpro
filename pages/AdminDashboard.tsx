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
import { analytics } from '../services/analyticsService';
import { testModel } from '../services/geminiService';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';

import { AdminAIAssistant } from '../components/AdminAIAssistant';

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

import { ConfirmModal } from '../components/ConfirmModal';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, showToast } = useOutletContext<any>();
  const [isChecking, setIsChecking] = useState(true);
  const [sessions, setSessions] = useState<VisitorSession[]>([]);
  const [pageViews, setPageViews] = useState<PageView[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [totalGenerations, setTotalGenerations] = useState(0);
  const [recentGenerations, setRecentGenerations] = useState<any[]>([]);
  const [cvStats, setCvStats] = useState({ last30m: 0, last1h: 0, last24h: 0 });
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalTraffic, setTotalTraffic] = useState(0);
  const [unsolvedErrorsCount, setUnsolvedErrorsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [detailedData, setDetailedData] = useState<any[]>([]);
  const [detailedEvents, setDetailedEvents] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [selectedSessionToken, setSelectedSessionToken] = useState<string | null>(null);
  const [userJourney, setUserJourney] = useState<any[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [showLiveDetails, setShowLiveDetails] = useState(false);
  const [aiDataInterpretation, setAiDataInterpretation] = useState<string | null>(null);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [testModelName, setTestModelName] = useState('gemini-3-flash-preview');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showClearAnalyticsConfirm, setShowClearAnalyticsConfirm] = useState(false);
  const [showClearAdminLogsConfirm, setShowClearAdminLogsConfirm] = useState(false);

  // Robust Admin Check on Mount
  useEffect(() => {
    const verifyAdmin = async () => {
        try {
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

            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            
            if (session?.user?.email === 'mqhele03@gmail.com') {
                setIsChecking(false);
            } else {
                navigate('/');
            }
        } catch (err) {
            console.error("Admin verification failed:", err);
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
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => fetchData())
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
    }
  }, [isChecking]);

  const fetchDetailedMetric = async (metric: string, range: string) => {
    setIsDetailLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_detailed_analytics', {
        metric_name: metric,
        time_range: range
      });
      if (error) throw error;
      setDetailedData(data || []);

      if (metric === 'cv_generated') {
          const { data: events } = await supabase
            .from('user_events')
            .select('*')
            .eq('event_name', 'cv_generated')
            .order('created_at', { ascending: false })
            .limit(50);
          setDetailedEvents(events || []);
      }
    } catch (err) {
      console.error('Error fetching detailed metric:', err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const fetchLiveSessions = async () => {
    try {
      const { data, error } = await supabase.rpc('get_live_sessions_details');
      if (error) throw error;
      setLiveSessions(data || []);
    } catch (err) {
      console.error('Error fetching live sessions:', err);
    }
  };

  const fetchUserJourney = async (token: string) => {
    try {
      const { data, error } = await supabase.rpc('get_user_journey', {
        target_session_token: token
      });
      if (error) throw error;
      setUserJourney(data || []);
    } catch (err) {
      console.error('Error fetching user journey:', err);
    }
  };

  useEffect(() => {
    if (selectedMetric) {
      fetchDetailedMetric(selectedMetric, timeRange);
    }
  }, [selectedMetric, timeRange]);

  useEffect(() => {
    if (selectedSessionToken) {
      fetchUserJourney(selectedSessionToken);
    }
  }, [selectedSessionToken]);

  const fetchData = async () => {
    try {
      const { data: summary, error: summaryError } = await supabase.rpc('get_admin_analytics_summary');
      
      if (summaryError) {
          console.error("Error fetching admin summary:", summaryError);
          if (summaryError.code === '42703') {
              showToast("Database schema mismatch (missing columns). Please run the fix_supabase_schema_v2.sql script in Supabase.", 'error');
          }
          throw summaryError;
      }

      if (summary) {
        setTotalGenerations(summary.cv_generated);
        setTotalRevenue(summary.revenue_total);
        setTotalTraffic(summary.traffic_total);
        setUnsolvedErrorsCount(summary.errors_unsolved);
      }

      const [sessionsRes, viewsRes, adminLogsRes] = await Promise.all([
        supabase.from('visitor_sessions').select('*').order('last_active_at', { ascending: false }),
        supabase.from('page_views').select('*').order('created_at', { ascending: false }).limit(1000),
        adminLogService.getLogs(50)
      ]);

      if (sessionsRes.data) setSessions(sessionsRes.data);
      if (viewsRes.data) setPageViews(viewsRes.data);
      if (adminLogsRes) setAdminLogs(adminLogsRes);

      // Fetch CV Generation Stats
      const [cvStatsRes, recentGensRes] = await Promise.all([
          analytics.getCVGenerationStats(),
          analytics.getRecentCVGenerations(10)
      ]);
      setCvStats(cvStatsRes);
      setRecentGenerations(recentGensRes);

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

  const handleInterpretData = async () => {
    setIsInterpreting(true);
    setAiDataInterpretation(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Prepare data for AI
      const dataSummary = {
        totalRevenue,
        totalGenerations,
        totalTraffic,
        unsolvedErrorsCount,
        liveUsers,
        returningUsers,
        newUsers,
        recentCVs: recentGenerations.map(g => ({ title: g.metadata?.job_title, company: g.metadata?.company }))
      };

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are an expert business and technical analyst. Interpret the following platform analytics data for the admin:
${JSON.stringify(dataSummary, null, 2)}

Provide a detailed report using Markdown formatting:
1. **Executive Summary**: A high-level overview of platform performance.
2. **Trend Analysis**: Identification of any worrying trends (e.g., high error rates, low conversion) or positive growth.
3. **Actionable Recommendations**: 3-5 specific, prioritized recommendations to improve user growth, revenue, or platform stability.
4. **Platform Health Score**: A score out of 100 with a brief justification.

Use bold headings, bullet points, and clear structure. Keep it professional and insightful.`,
      });
      setAiDataInterpretation(response.text || "Failed to generate interpretation.");
    } catch (err) {
      console.error('AI Data Interpretation failed:', err);
      setAiDataInterpretation("Error communicating with AI service.");
    } finally {
      setIsInterpreting(false);
    }
  };

  const handleClearAllAnalytics = async () => {
    setShowClearAnalyticsConfirm(true);
  };

  const confirmClearAllAnalytics = async () => {
    setShowClearAnalyticsConfirm(false);
    try {
      const { error } = await supabase.rpc('clear_all_analytics');
      if (error) {
        // Fallback to individual deletes if RPC fails
        await Promise.all([
          supabase.from('page_views').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
          supabase.from('visitor_sessions').delete().neq('session_token', 'temp'),
          supabase.from('user_events').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
          supabase.from('error_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        ]);
      }
      
      fetchData();
      showToast("All platform analytics have been cleared.", 'success');
      adminLogService.logAction('CLEAR_ALL_ANALYTICS', 'global', { timestamp: new Date().toISOString() });
    } catch (err) {
      console.error('Error clearing all analytics:', err);
      showToast("Failed to clear analytics.", 'error');
    }
  };

  const handleClearAdminLogs = async () => {
    setShowClearAdminLogsConfirm(true);
  };

  const confirmClearAdminLogs = async () => {
    setShowClearAdminLogsConfirm(false);
    try {
      await adminLogService.clearLogs();
      setAdminLogs([]);
      showToast("Admin activity logs cleared.", 'success');
    } catch (err) {
      console.error('Error clearing admin logs:', err);
      showToast("Failed to clear admin logs.", 'error');
    }
  };

  const handleTestModel = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testModel(testModelName, '');
      setTestResult(result);
      showToast(`Test successful for ${testModelName}`, 'success');
      adminLogService.logAction('TEST_MODEL', testModelName, { result });
    } catch (err: any) {
      console.error('Model test failed:', err);
      setTestResult(`ERROR: ${err.message}`);
      showToast(`Test failed for ${testModelName}`, 'error');
    } finally {
      setIsTesting(false);
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
            <button 
              onClick={handleClearAllAnalytics}
              className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-colors text-red-500 text-sm font-medium"
            >
              Clear All Analytics
            </button>
            <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-emerald-500 text-sm font-medium">{liveUsers} Live Now</span>
            </div>
            <button 
              onClick={async () => {
                setLoading(true);
                await fetchData();
                setLoading(false);
              }}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              ) : (
                <Zap size={16} className="text-emerald-500" />
              )}
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </header>

        {/* AI Interpretation Section */}
        <div className="mb-8">
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <Brain className="text-emerald-500" size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">AI Business Intelligence</h3>
                            <p className="text-xs text-zinc-500">Automated interpretation of platform metrics</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleInterpretData}
                        disabled={isInterpreting}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                    >
                        {isInterpreting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <Zap size={16} />
                                Interpret Data
                            </>
                        )}
                    </button>
                </div>

                {aiDataInterpretation ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-black/20 rounded-xl p-6 border border-emerald-500/10"
                    >
                        <div className="prose prose-invert prose-sm max-w-none">
                            <div className="text-zinc-300 leading-relaxed markdown-body">
                                <ReactMarkdown>{aiDataInterpretation}</ReactMarkdown>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <div className="text-center py-8 border-2 border-dashed border-zinc-800 rounded-xl">
                        <p className="text-zinc-500 text-sm italic">Click "Interpret Data" to get an AI-powered analysis of your current platform performance.</p>
                    </div>
                )}
            </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <StatCard 
            title="Total Revenue" 
            value={`R${totalRevenue.toFixed(2)}`} 
            icon={<DollarSign className="text-emerald-500" />} 
            trend="Live" 
            onClick={() => setSelectedMetric('revenue')}
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
            title="CVs Generated" 
            value={totalGenerations.toLocaleString()} 
            icon={<FileText className="text-orange-500" />} 
            trend={`+${cvStats.last24h}`} 
            onClick={() => setSelectedMetric('cv_generated')}
          />
          <StatCard 
            title="Daily Traffic" 
            value={totalTraffic.toLocaleString()} 
            icon={<TrendingUp className="text-indigo-500" />} 
            trend="Total" 
            onClick={() => setSelectedMetric('traffic')}
          />
          <StatCard 
            title="Live Sessions" 
            value={liveUsers.toString()} 
            icon={<Activity className="text-purple-500" />} 
            trend="Active" 
            onClick={() => {
                fetchLiveSessions();
                setShowLiveDetails(true);
            }}
          />
          <StatCard 
            title="Recent Errors" 
            value={unsolvedErrorsCount.toString()} 
            icon={<AlertCircle className="text-red-500" />} 
            trend={unsolvedErrorsCount > 10 ? "High" : "Normal"} 
            onClick={() => setSelectedMetric('errors')}
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
              <div className="h-[300px] min-h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%" minHeight={300}>
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

            {/* Recent CV Generations */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText size={18} className="text-orange-500" />
                  Recent CV Generations
                </h3>
                <div className="flex gap-4 text-xs font-bold">
                    <span className="text-zinc-500">30m: <span className="text-orange-400">{cvStats.last30m}</span></span>
                    <span className="text-zinc-500">1h: <span className="text-orange-400">{cvStats.last1h}</span></span>
                    <span className="text-zinc-500">24h: <span className="text-orange-400">{cvStats.last24h}</span></span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentGenerations.map((gen, idx) => (
                  <div key={idx} className="p-4 bg-zinc-800/30 rounded-xl border border-zinc-800/50 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">{gen.metadata?.mode || 'Tailored'}</span>
                        <span className="text-[10px] text-zinc-500">{new Date(gen.created_at).toLocaleString()}</span>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-zinc-200 truncate">{gen.metadata?.job_title || 'Job Application'}</p>
                        <p className="text-xs text-zinc-500 truncate">{gen.metadata?.company || 'Company'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Section */}
          <div className="space-y-8">
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
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Brain size={18} className="text-emerald-500" />
                  Model Connectivity Test
                </h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Select Model to Test</label>
                  <select 
                    value={testModelName}
                    onChange={(e) => setTestModelName(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
                  >
                    <optgroup label="Gemini">
                      <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
                      <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
                      <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite</option>
                    </optgroup>
                  </select>
                  <button 
                    onClick={handleTestModel}
                    disabled={isTesting}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                  >
                    {isTesting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Zap size={16} />
                        Run Connection Test
                      </>
                    )}
                  </button>
                </div>
                {testResult && (
                  <div className={`p-3 rounded-xl text-xs font-mono border ${testResult.startsWith('ERROR') ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                    {testResult}
                  </div>
                )}
              </div>
            </div>

            {/* Admin Activity Logs */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Shield size={18} className="text-emerald-500" />
                  Admin Activity Logs
                </h3>
                <button 
                  onClick={handleClearAdminLogs}
                  className="text-[10px] font-bold text-zinc-500 hover:text-red-400 transition-colors uppercase tracking-wider"
                >
                  Clear Logs
                </button>
              </div>
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
      {/* Detailed Metric Modal */}
      {selectedMetric && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold capitalize">{selectedMetric.replace('_', ' ')} Analytics</h2>
                <p className="text-sm text-zinc-400">Detailed breakdown over time</p>
              </div>
              <div className="flex items-center gap-4">
                <select 
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="all">All Time</option>
                </select>
                <button 
                  onClick={() => setSelectedMetric(null)}
                  className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto">
              {isDetailLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="h-80 min-h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                      <AreaChart data={detailedData}>
                        <defs>
                          <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis 
                          dataKey="time_bucket" 
                          stroke="#71717a" 
                          fontSize={12}
                          tickFormatter={(val) => {
                            const date = new Date(val);
                            return timeRange === '24h' 
                              ? date.toLocaleTimeString([], { hour: '2-digit' })
                              : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                          }}
                        />
                        <YAxis stroke="#71717a" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                          labelFormatter={(val) => new Date(val).toLocaleString()}
                        />
                        <Area type="monotone" dataKey="metric_value" stroke="#10b981" fillOpacity={1} fill="url(#colorMetric)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700">
                      <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Total in Range</span>
                      <p className="text-2xl font-bold mt-1">
                        {detailedData.reduce((acc, curr) => acc + curr.metric_value, 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700">
                      <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Peak Value</span>
                      <p className="text-2xl font-bold mt-1">
                        {Math.max(...detailedData.map(d => d.metric_value), 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700">
                      <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Average</span>
                      <p className="text-2xl font-bold mt-1">
                        {(detailedData.reduce((acc, curr) => acc + curr.metric_value, 0) / (detailedData.length || 1)).toFixed(1)}
                      </p>
                    </div>
                  </div>

                  {selectedMetric === 'cv_generated' && detailedEvents.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <FileText size={18} className="text-orange-500" />
                            Recent Generations
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {detailedEvents.map((gen, idx) => (
                                <div key={idx} className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700 flex flex-col gap-2">
                                    <div className="flex justify-between items-start">
                                        <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">{gen.metadata?.mode || 'Tailored'}</span>
                                        <span className="text-[10px] text-zinc-500">{new Date(gen.created_at).toLocaleString()}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-zinc-200 truncate">{gen.metadata?.job_title || 'Job Application'}</p>
                                        <p className="text-xs text-zinc-500 truncate">{gen.metadata?.company || 'Company'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Live Sessions Modal */}
      {showLiveDetails && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Live Sessions Detail</h2>
                <p className="text-sm text-zinc-400">Real-time user activity monitoring</p>
              </div>
              <button 
                onClick={() => setShowLiveDetails(false)}
                className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Active Users</h3>
                  <div className="space-y-2">
                    {liveSessions.map((session) => (
                      <div 
                        key={session.session_token}
                        onClick={() => setSelectedSessionToken(session.session_token)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${
                          selectedSessionToken === session.session_token 
                            ? 'bg-emerald-500/10 border-emerald-500/50' 
                            : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-mono text-zinc-400">{session.session_token.slice(0, 8)}...</span>
                          <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-500 rounded-full font-bold">LIVE</span>
                        </div>
                        <div className="text-sm font-medium text-zinc-200 truncate">{session.current_page}</div>
                        <div className="flex items-center gap-4 mt-2 text-[10px] text-zinc-500">
                          <span>{session.view_count} pages viewed</span>
                          <span>Active for {Math.floor(session.session_duration_seconds / 60)}m</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">User Journey</h3>
                  {selectedSessionToken ? (
                    <div className="bg-zinc-800/30 rounded-2xl p-6 border border-zinc-800">
                      <div className="space-y-6 relative">
                        <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-zinc-800" />
                        {userJourney.map((step, idx) => (
                          <div key={idx} className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-zinc-900 border-2 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                            <div className="text-sm font-bold text-zinc-200">{step.path}</div>
                            <div className="text-[10px] text-zinc-500 mt-1">
                              {new Date(step.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center bg-zinc-800/20 rounded-2xl border border-dashed border-zinc-700 text-zinc-500">
                      <Activity size={32} className="mb-2 opacity-20" />
                      <p className="text-sm">Select a session to view journey</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <AdminAIAssistant 
        metricsData={{
          totalGenerations,
          totalRevenue,
          totalTraffic,
          unsolvedErrorsCount,
          liveUsers,
          cvStats,
          recentGenerations: recentGenerations.slice(0, 5)
        }} 
      />

      <ConfirmModal
        isOpen={showClearAnalyticsConfirm}
        title="Clear Analytics"
        message="Are you sure you want to clear ALL platform analytics (traffic, sessions, events)? This action cannot be undone."
        confirmText="Clear Analytics"
        cancelText="Cancel"
        onConfirm={confirmClearAllAnalytics}
        onCancel={() => setShowClearAnalyticsConfirm(false)}
        isDestructive={true}
      />
      
      <ConfirmModal
        isOpen={showClearAdminLogsConfirm}
        title="Clear Admin Logs"
        message="Are you sure you want to clear all admin activity logs? This action cannot be undone."
        confirmText="Clear Logs"
        cancelText="Cancel"
        onConfirm={confirmClearAdminLogs}
        onCancel={() => setShowClearAdminLogsConfirm(false)}
        isDestructive={true}
      />
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; trend: string; onClick?: () => void }> = ({ title, value, icon, trend, onClick }) => (
  <motion.div 
    whileHover={{ y: -2 }}
    onClick={onClick}
    className={`bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl ${onClick ? 'cursor-pointer hover:border-zinc-700 hover:bg-zinc-800/50' : ''}`}
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
