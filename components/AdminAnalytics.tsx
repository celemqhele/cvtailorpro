import React, { useState, useEffect } from 'react';
import { analyticsService } from '../services/analyticsService';
import { metricsService } from '../services/metricsService';
import { errorService } from '../services/errorService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

export const AdminAnalytics: React.FC = () => {
    const [trafficData, setTrafficData] = useState<any[]>([]);
    const [realtime, setRealtime] = useState<any>(null);
    const [journeys, setJourneys] = useState<any[]>([]);
    const [metrics, setMetrics] = useState<any>(null);
    const [errorLogs, setErrorLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadAllData();
        const interval = setInterval(loadAllData, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    const loadAllData = async () => {
        try {
            const [traffic, rt, userJourneys, dashboardMetrics, logs] = await Promise.all([
                analyticsService.getTrafficStats(),
                analyticsService.getRealtimeUsers(),
                analyticsService.getUserJourneys(),
                metricsService.getDashboardData(),
                errorService.getLogs()
            ]);

            // Process traffic for graph
            const dailyTraffic: Record<string, number> = {};
            traffic.forEach((v: any) => {
                const date = new Date(v.created_at).toLocaleDateString();
                dailyTraffic[date] = (dailyTraffic[date] || 0) + 1;
            });
            const trafficChart = Object.entries(dailyTraffic).map(([date, count]) => ({ date, count }));

            // Process CV generations for graph
            const dailyCVs: Record<string, number> = {};
            dashboardMetrics.cvGenerations.forEach((v: any) => {
                const date = new Date(v.created_at).toLocaleDateString();
                dailyCVs[date] = (dailyCVs[date] || 0) + 1;
            });
            const cvChart = Object.entries(dailyCVs).map(([date, count]) => ({ date, count }));

            // Process Revenue for graph
            const dailyRevenue: Record<string, number> = {};
            dashboardMetrics.revenue.forEach((v: any) => {
                const date = new Date(v.created_at).toLocaleDateString();
                dailyRevenue[date] = (dailyRevenue[date] || 0) + v.amount;
            });
            const revenueChart = Object.entries(dailyRevenue).map(([date, amount]) => ({ date, amount }));

            setTrafficData(trafficChart);
            setRealtime(rt);
            setJourneys(userJourneys);
            setMetrics({ ...dashboardMetrics, cvChart, revenueChart });
            setErrorLogs(logs);
        } catch (e) {
            console.error("Failed to load analytics:", e);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500">Loading Analytics...</div>;

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* Realtime Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Live (30m)</p>
                    <h3 className="text-3xl font-black text-indigo-600">{realtime?.last30m || 0}</h3>
                    <p className="text-slate-500 text-xs mt-2">Active sessions</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Last Hour</p>
                    <h3 className="text-3xl font-black text-slate-800">{realtime?.last1h || 0}</h3>
                    <p className="text-slate-500 text-xs mt-2">Unique visitors</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Last 24 Hours</p>
                    <h3 className="text-3xl font-black text-slate-800">{realtime?.last24h || 0}</h3>
                    <p className="text-slate-500 text-xs mt-2">Total traffic</p>
                </div>
            </div>

            {/* Traffic Graph */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Traffic Overview (Daily)</h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trafficData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" fontSize={10} tickMargin={10} axisLine={false} tickLine={false} />
                            <YAxis fontSize={10} axisLine={false} tickLine={false} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: '#4f46e5' }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* CV Generations Graph */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">CV Generations</h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={metrics?.cvChart}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} />
                                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Revenue Graph */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Revenue (ZAR)</h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={metrics?.revenueChart}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} />
                                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Error Logs */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">Recent Error Logs</h3>
                    <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase">System Health</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Message</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Path</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {errorLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 text-xs text-slate-500 whitespace-nowrap">
                                        {new Date(log.created_at).toLocaleString()}
                                    </td>
                                    <td className="p-4 text-xs font-medium text-red-600 max-w-md truncate">
                                        {log.message}
                                    </td>
                                    <td className="p-4 text-xs text-slate-600">
                                        {log.path}
                                    </td>
                                    <td className="p-4">
                                        <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-slate-100 text-slate-600 uppercase">
                                            {log.metadata?.type || 'unknown'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {errorLogs.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-400 text-sm italic">No errors logged recently.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* User Journeys */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">User Journeys (Recent Sessions)</h3>
                    <span className="bg-indigo-100 text-indigo-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Behavior</span>
                </div>
                <div className="divide-y divide-slate-100">
                    {journeys.slice(0, 20).map((journey) => (
                        <div key={journey.sessionId} className="p-6 hover:bg-slate-50 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Session ID</p>
                                    <p className="text-sm font-mono text-slate-600">{journey.sessionId.substring(0, 8)}...</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Started At</p>
                                    <p className="text-sm text-slate-600">{new Date(journey.startTime).toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {journey.steps.map((step: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 shadow-sm">
                                            {step.path}
                                        </div>
                                        {idx < journey.steps.length - 1 && (
                                            <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {journeys.length === 0 && (
                        <div className="p-8 text-center text-slate-400 text-sm italic">No user journeys tracked yet.</div>
                    )}
                </div>
            </div>
        </div>
    );
};
