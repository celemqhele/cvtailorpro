
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Search, 
  Users, 
  Briefcase, 
  ChevronRight, 
  Filter, 
  FileText, 
  MapPin, 
  Mail, 
  Phone,
  ArrowRight,
  Sparkles,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { UserProfile, CandidateProfile, RecruiterSearch } from '../types';
import { extractJobRequirements, rankCandidates } from '../services/geminiService';
import { RECRUITER_PLANS } from '../constants';
import { analytics } from '../services/analyticsService';

export const RecruiterDashboard: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [jobSpec, setJobSpec] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<CandidateProfile[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateProfile | null>(null);
  const [recentSearches, setRecentSearches] = useState<RecruiterSearch[]>([]);
  const [searchCredits, setSearchCredits] = useState<{ used: number; limit: number | 'Unlimited' }>({ used: 0, limit: 1 });

  useEffect(() => {
    fetchProfileAndCredits();
    fetchRecentSearches();
  }, []);

  const fetchProfileAndCredits = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setProfile(profileData);

      // Calculate searches used this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('recruiter_searches')
        .select('*', { count: 'exact', head: true })
        .eq('recruiter_id', user.id)
        .gte('created_at', startOfMonth.toISOString());

      if (!error) {
        const plan = RECRUITER_PLANS.find(p => p.id === (profileData?.plan_id || 'free')) || RECRUITER_PLANS[0];
        setSearchCredits({
          used: count || 0,
          limit: plan.searches as number | 'Unlimited'
        });
      }
    }
  };

  const fetchRecentSearches = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('recruiter_searches')
        .select('*')
        .eq('recruiter_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentSearches(data || []);
    }
  };

  const handleSearch = async () => {
    const hasCredits = searchCredits.limit === 'Unlimited' || searchCredits.used < (searchCredits.limit as number);
    if (!jobSpec.trim() || !hasCredits) return;
    
    setIsSearching(true);
    try {
      // 1. Extract requirements using AI
      const requirements = await extractJobRequirements(jobSpec, '');
      
      // 2. Fetch candidates from Supabase
      const { data: candidates } = await supabase
        .from('candidate_profiles')
        .select('*')
        .limit(50);

      if (!candidates || candidates.length === 0) {
        setResults([]);
        return;
      }

      // 3. Rank candidates using AI
      const candidateData = candidates.map((c: CandidateProfile) => ({ id: c.id, summary: c.summary, skills: c.skills, seniority: c.seniority }));
      const rankedIds = await rankCandidates(requirements, candidateData, '');

      const sortedResults = rankedIds
        .map((id: string) => candidates.find((c: CandidateProfile) => c.id === id))
        .filter(Boolean);

      setResults(sortedResults);
      
      // 4. Save search and update credits
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('recruiter_searches').insert({
          recruiter_id: user.id,
          query_text: jobSpec.substring(0, 200),
          query_params: requirements,
          results_count: sortedResults.length
        });
        
        // Refresh credits
        fetchProfileAndCredits();
        fetchRecentSearches();

        // Track Search in Meta Pixel & DB
        analytics.trackEvent('recruiter_search', {
            query: jobSpec.substring(0, 100),
            results_count: sortedResults.length
        });
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              Recruiter Command Center <Sparkles className="w-6 h-6 text-indigo-600" />
            </h1>
            <p className="text-gray-500 mt-1">Find the perfect match for your job specifications.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center">
                <Search className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Search Credits</p>
                <p className="text-xl font-bold text-gray-900">
                  {searchCredits.limit === 'Unlimited' 
                    ? 'Unlimited' 
                    : `${(searchCredits.limit as number) - searchCredits.used} / ${searchCredits.limit}`}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Resets on the 1st of each month</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Search & Recent */}
          <div className="lg:col-span-1 space-y-8">
            {/* Search Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Search className="w-5 h-5 text-indigo-600" /> New Search
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Job Specification or Link</label>
                  <textarea
                    value={jobSpec}
                    onChange={(e) => setJobSpec(e.target.value)}
                    placeholder="Paste job description, requirements, or a link to the job post..."
                    className="w-full h-48 p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !jobSpec.trim() || (searchCredits.limit !== 'Unlimited' && searchCredits.used >= (searchCredits.limit as number))}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-100"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Analyzing & Matching...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" /> Search Database
                    </>
                  )}
                </button>
                {searchCredits.limit !== 'Unlimited' && searchCredits.used >= (searchCredits.limit as number) && (
                  <p className="text-xs text-red-500 text-center">You've reached your monthly search limit. Upgrade for more.</p>
                )}
              </div>
            </div>

            {/* Recent Searches */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-600" /> Recent Searches
              </h2>
              <div className="space-y-3">
                {recentSearches.length > 0 ? (
                  recentSearches.map((search) => (
                    <div key={search.id} className="p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-gray-100">
                      <p className="text-sm font-medium text-gray-900 truncate">{search.query_text}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-500">{new Date(search.created_at).toLocaleDateString()}</span>
                        <span className="text-xs font-semibold text-indigo-600">{search.results_count} candidates</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic">No recent searches found.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 min-h-[600px] flex flex-col">
              <div className="p-6 border-bottom border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" /> 
                  {results.length > 0 ? `Found ${results.length} Candidates` : 'Search Results'}
                </h2>
                {results.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                      <Filter className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 p-6">
                {isSearching ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                      <Sparkles className="w-6 h-6 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">AI is matching candidates</h3>
                      <p className="text-gray-500 max-w-xs">Our AI is analyzing your job spec and scanning thousands of profiles to find the perfect fit.</p>
                    </div>
                  </div>
                ) : results.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.map((candidate, index) => (
                      <motion.div
                        key={candidate.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => setSelectedCandidate(candidate)}
                        className={`p-5 rounded-2xl border cursor-pointer transition-all hover:shadow-md ${
                          selectedCandidate?.id === candidate.id 
                            ? 'border-indigo-600 bg-indigo-50/30 ring-1 ring-indigo-600' 
                            : 'border-gray-100 bg-white hover:border-indigo-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-xl font-bold text-gray-400">
                            {candidate.full_name.charAt(0)}
                          </div>
                          {index === 0 && (
                            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Strongest Match</span>
                          )}
                        </div>
                        <h3 className="font-bold text-gray-900">{candidate.full_name}</h3>
                        <p className="text-sm text-indigo-600 font-medium mb-3">{candidate.seniority} {candidate.job_type}</p>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-4">{candidate.summary}</p>
                        <div className="flex flex-wrap gap-1">
                          {candidate.skills.slice(0, 3).map(skill => (
                            <span key={skill} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">{skill}</span>
                          ))}
                          {candidate.skills.length > 3 && (
                            <span className="text-[10px] text-gray-400">+{candidate.skills.length - 3} more</span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                    <Users className="w-16 h-16 text-gray-300" />
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">No results yet</h3>
                      <p className="text-gray-500 max-w-xs">Enter a job specification on the left to start finding candidates.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Candidate Detail Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="p-8 border-b border-gray-100 flex items-start justify-between bg-indigo-600 text-white">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center text-3xl font-bold">
                  {selectedCandidate.full_name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-3xl font-bold">{selectedCandidate.full_name}</h2>
                  <p className="text-indigo-100 text-lg">{selectedCandidate.seniority} {selectedCandidate.job_type}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-indigo-100">
                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {selectedCandidate.location}</span>
                    <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> {selectedCandidate.email}</span>
                    <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {selectedCandidate.phone}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCandidate(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <ChevronRight className="w-6 h-6 rotate-90" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                  <section>
                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-600" /> Professional Summary
                    </h3>
                    <p className="text-gray-600 leading-relaxed">{selectedCandidate.summary}</p>
                  </section>

                  <section>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-indigo-600" /> Experience
                    </h3>
                    <div className="space-y-6">
                      {(selectedCandidate.experience as any[]).map((exp, i) => (
                        <div key={i} className="relative pl-6 border-l-2 border-indigo-100">
                          <div className="absolute -left-[9px] top-0 w-4 h-4 bg-indigo-600 rounded-full border-4 border-white" />
                          <h4 className="font-bold text-gray-900">{exp.title}</h4>
                          <p className="text-sm text-indigo-600 font-medium">{exp.company} • {exp.dates}</p>
                          <ul className="mt-2 space-y-1">
                            {exp.achievements?.map((ach: string, j: number) => (
                              <li key={j} className="text-sm text-gray-600 flex items-start gap-2">
                                <span className="mt-1.5 w-1 h-1 bg-gray-400 rounded-full flex-shrink-0" />
                                {ach}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="space-y-8">
                  <section>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Top Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedCandidate.skills.map(skill => (
                        <span key={skill} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-sm font-medium border border-indigo-100">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </section>

                  <section className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Recruiter Actions</h3>
                    <div className="space-y-3">
                      <button className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                        <Mail className="w-4 h-4" /> Contact Candidate
                      </button>
                      <button className="w-full bg-white text-gray-700 border border-gray-200 py-3 rounded-xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                        <FileText className="w-4 h-4" /> Download Full CV
                      </button>
                      <button className="w-full text-indigo-600 py-2 text-sm font-semibold hover:underline">
                        Save to Shortlist
                      </button>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
