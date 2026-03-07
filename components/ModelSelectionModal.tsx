import React from 'react';
import { PLANS } from '../services/subscriptionService';
import { Check, Lock, Zap, ShieldCheck, Clock, Sparkles } from 'lucide-react';

interface ModelSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlanId: string;
  onUpgrade: (planId: string) => void;
}

export const ModelSelectionModal: React.FC<ModelSelectionModalProps> = ({ isOpen, onClose, currentPlanId, onUpgrade }) => {
  if (!isOpen) return null;

  const currentPlan = PLANS.find(p => p.id === currentPlanId) || PLANS[0];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">AI Model Selection</h2>
            <p className="text-sm text-slate-500">Choose the intelligence level for your CV tailoring.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const isHigher = PLANS.indexOf(plan) > PLANS.indexOf(currentPlan);
            
            return (
              <div 
                key={plan.id}
                className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer group ${
                  isCurrent 
                    ? 'border-indigo-600 bg-indigo-50/30' 
                    : 'border-slate-100 hover:border-slate-200 bg-white'
                }`}
                onClick={() => isHigher ? onUpgrade(plan.id) : null}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {plan.id === 'free' ? <Zap className="w-5 h-5" /> : 
                       plan.id === 'tier_1' ? <ShieldCheck className="w-5 h-5" /> :
                       plan.id === 'tier_2' ? <Clock className="w-5 h-5" /> :
                       <Sparkles className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        {plan.quality}
                        {isCurrent && <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Current</span>}
                      </h3>
                      <p className="text-xs text-slate-500">{plan.name} Plan</p>
                    </div>
                  </div>
                  {isHigher && (
                    <div className="flex items-center gap-1 text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform">
                      Upgrade <Lock className="w-3 h-3" />
                    </div>
                  )}
                  {isCurrent && <Check className="w-5 h-5 text-indigo-600" />}
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Capabilities</div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Speed</div>
                    <div className="text-xs text-slate-600 font-medium">
                        {plan.id === 'free' ? 'Basic tailoring' : 
                         plan.id === 'tier_1' ? 'Standard optimization' :
                         plan.id === 'tier_2' ? 'Advanced reasoning' :
                         'Deep thinking & logic'}
                    </div>
                    <div className="text-xs text-slate-600 font-medium">
                        {plan.id === 'free' ? 'Fast' : 
                         plan.id === 'tier_1' ? 'Very Fast' :
                         plan.id === 'tier_2' ? 'Instant' :
                         'Balanced'}
                    </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
