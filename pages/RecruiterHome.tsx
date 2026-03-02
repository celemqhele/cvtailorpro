
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Search, 
  Users, 
  Zap, 
  Shield, 
  Briefcase, 
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Database
} from 'lucide-react';

export const RecruiterHome: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-3xl opacity-50" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto">
            {/* Mode Switcher */}
            <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 mb-10">
              <Link 
                to="/" 
                className="px-6 py-2 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-700"
              >
                For Applicants
              </Link>
              <Link 
                to="/recruiter" 
                className="px-6 py-2 rounded-xl text-sm font-bold bg-white text-blue-600 shadow-sm"
              >
                For Recruiters
              </Link>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-medium mb-6"
            >
              <Sparkles size={16} />
              <span>AI-Powered Talent Matching</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-6xl font-bold text-slate-900 tracking-tight mb-6"
            >
              Find Your Next <span className="text-blue-600">Star Candidate</span> in Seconds
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-slate-600 mb-10 leading-relaxed"
            >
              Stop sifting through thousands of irrelevant CVs. Our AI analyzes your job spec and matches it against our database of pre-vetted, headhunt-ready candidates.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                to="/recruiter-dashboard"
                className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 group"
              >
                Start Searching Now
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/pricing?tab=recruiter"
                className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
              >
                View Recruiter Plans
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Why Recruiters Choose Us</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Our platform is designed to make the hiring process as efficient and accurate as possible.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Zap className="text-amber-500" />,
                title: "Instant Matching",
                description: "Paste your job spec and get a ranked list of candidates instantly. No manual filtering required."
              },
              {
                icon: <Database className="text-blue-500" />,
                title: "Vetted Database",
                description: "Access a growing database of candidates who have explicitly opted in to be headhunted."
              },
              {
                icon: <Shield className="text-emerald-500" />,
                title: "AI Analysis",
                description: "Our AI extracts the core requirements of your job and the core strengths of candidates for a perfect match."
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100"
              >
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-900 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
              <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-500 rounded-full blur-[120px]" />
              <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-indigo-500 rounded-full blur-[120px]" />
            </div>
            
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Ready to find your next hire?</h2>
              <p className="text-slate-400 text-xl mb-10 max-w-2xl mx-auto">
                Join hundreds of recruiters who are saving hours every week using our AI matching technology.
              </p>
              <Link
                to="/recruiter-dashboard"
                className="inline-flex items-center gap-2 px-10 py-5 bg-white text-slate-900 font-bold rounded-2xl hover:bg-slate-100 transition-all shadow-xl"
              >
                Get Started for Free
                <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
