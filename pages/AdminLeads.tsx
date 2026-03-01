import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { 
  Users, Download, Calendar, Search, 
  ChevronLeft, ChevronRight, Mail, Filter
} from 'lucide-react';
import { motion } from 'motion/react';
import { isPreviewOrAdmin } from '../utils/envHelper';

interface Lead {
  id: string;
  email: string;
  source: string;
  created_at: string;
  metadata: any;
}

export const AdminLeads: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useOutletContext<any>();
  const [isChecking, setIsChecking] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const verifyAdmin = async () => {
        if (isPreviewOrAdmin()) {
            setIsChecking(false);
            return;
        }
        if (user?.email === 'mqhele03@gmail.com') {
            setIsChecking(false);
        } else {
            navigate('/');
        }
    };
    verifyAdmin();
  }, [user, navigate]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('leads').select('*').order('created_at', { ascending: false });
      
      if (filterDate) {
        const start = new Date(filterDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(filterDate);
        end.setHours(23, 59, 59, 999);
        query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  }, [filterDate]);

  useEffect(() => {
    if (!isChecking) {
        fetchLeads();
    }
  }, [isChecking, filterDate, fetchLeads]);

  const downloadLeads = () => {
    if (leads.length === 0) return;

    const headers = ['Email', 'Source', 'Date', 'Metadata'];
    const csvContent = [
      headers.join(','),
      ...leads.map(lead => [
        lead.email,
        lead.source,
        new Date(lead.created_at).toLocaleDateString(),
        JSON.stringify(lead.metadata || {}).replace(/,/g, ';')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = window.URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_${filterDate || 'all'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLeads = leads.filter(lead => 
    lead.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isChecking) return null;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <button 
              onClick={() => navigate('/admindashboard')}
              className="flex items-center gap-2 text-zinc-400 hover:text-white mb-4 transition-colors"
            >
              <ChevronLeft size={16} />
              Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Users className="text-emerald-500" />
              Lead Management
            </h1>
            <p className="text-zinc-400 mt-1">Capture and export potential customer data</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input 
                type="date" 
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <button 
              onClick={downloadLeads}
              disabled={leads.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all shadow-lg shadow-emerald-900/20"
            >
              <Download size={18} />
              Export CSV
            </button>
          </div>
        </header>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="text" 
                placeholder="Search by email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-800/50 border border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div className="text-sm text-zinc-400">
              Showing <span className="text-white font-bold">{filteredLeads.length}</span> leads
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-800/50 text-zinc-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Email Address</th>
                  <th className="px-6 py-4 font-semibold">Source</th>
                  <th className="px-6 py-4 font-semibold">Captured Date</th>
                  <th className="px-6 py-4 font-semibold">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
                        <span className="text-zinc-500 text-sm">Loading leads...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Mail className="text-zinc-700" size={48} />
                        <span className="text-zinc-500">No leads found for this period.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <Mail size={14} />
                          </div>
                          <span className="text-sm font-medium">{lead.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase rounded">
                          {lead.source}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-400">
                        {new Date(lead.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[10px] font-mono text-zinc-500 truncate max-w-[200px]">
                          {JSON.stringify(lead.metadata)}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
