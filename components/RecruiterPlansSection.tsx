
import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Zap, Users, Search, Sparkles } from 'lucide-react';

const RECRUITER_PLANS = [
  { 
    id: 'recruiter_free', 
    name: 'Free', 
    price: 0, 
    searches: 1, 
    candidates: 2, 
    description: 'Perfect for trying out our AI matching technology.',
    features: ['1 AI Search', 'View 2 candidates per search', 'Basic matching', 'Email support']
  },
  { 
    id: 'recruiter_starter', 
    name: 'Starter', 
    price: 2500, 
    searches: 10, 
    candidates: 10, 
    description: 'Ideal for small businesses with occasional hiring needs.',
    features: ['10 AI Searches', 'View 10 candidates per search', 'Priority matching', 'Export candidate summaries']
  },
  { 
    id: 'recruiter_growth', 
    name: 'Growth', 
    price: 7500, 
    searches: 30, 
    candidates: 25, 
    description: 'Best for growing teams with regular hiring requirements.',
    popular: true,
    features: ['30 AI Searches', 'View 25 candidates per search', 'Advanced AI ranking', 'Direct candidate contact', 'Priority support']
  },
  { 
    id: 'recruiter_pro', 
    name: 'Pro', 
    price: 25000, 
    searches: 'Unlimited', 
    candidates: 'Full Access', 
    description: 'For high-volume recruitment agencies and large enterprises.',
    features: ['Unlimited AI Searches', 'Full candidate access', 'Custom AI matching rules', 'Dedicated account manager', 'API Access']
  },
];

interface RecruiterPlansSectionProps {
  onSelectPlan: (planId: string) => void;
  userPlanId?: string;
}

export const RecruiterPlansSection: React.FC<RecruiterPlansSectionProps> = ({ onSelectPlan, userPlanId }) => {
  return (
    <section className="py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Professional Recruitment Access</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Get full control with our <span className="font-bold text-blue-600">one-time 30-day passes</span>. <br/>
            No recurring billing. No auto-renewal. You choose when to renew.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {RECRUITER_PLANS.map((plan, idx) => {
            const isCurrent = userPlanId === plan.id;
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className={`relative flex flex-col p-8 rounded-[2rem] transition-all duration-300 ${
                  plan.popular 
                  ? 'bg-white border-2 border-blue-500 shadow-2xl scale-105 z-10' 
                  : 'bg-white border border-slate-200 shadow-sm hover:shadow-xl'
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">
                    Most Popular
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900">R{plan.price.toLocaleString()}</span>
                    <span className="text-slate-500 text-sm font-medium">/ 30 days</span>
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold uppercase tracking-wider">
                    <Zap size={12} />
                    Once-off Payment
                  </div>
                  <p className="text-slate-500 text-sm mt-4 leading-relaxed">
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-4 mb-10 flex-1">
                  {plan.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-3 text-sm text-slate-600">
                      <CheckCircle2 size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => onSelectPlan(plan.id)}
                  disabled={isCurrent}
                  className={`w-full py-4 rounded-2xl font-bold transition-all ${
                    isCurrent
                    ? 'bg-slate-100 text-slate-400 cursor-default'
                    : plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {isCurrent ? 'Current Plan' : 'Choose ' + plan.name}
                </button>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-20 bg-blue-50 rounded-[2.5rem] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <h3 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Sparkles className="text-blue-600" />
              Need a custom enterprise solution?
            </h3>
            <p className="text-slate-600">
              We offer tailored packages for large recruitment firms, including custom AI model training, ATS integrations, and dedicated support.
            </p>
          </div>
          <button className="px-8 py-4 bg-white text-blue-600 font-bold rounded-2xl border border-blue-100 hover:bg-blue-100 transition-all whitespace-nowrap">
            Contact Sales
          </button>
        </div>
      </div>
    </section>
  );
};
