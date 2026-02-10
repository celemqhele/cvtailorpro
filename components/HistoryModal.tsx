
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SavedApplication } from '../types';
import { authService } from '../services/authService';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadApplication?: (app: SavedApplication) => void; // Optional now
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, onLoadApplication }) => {
  const [history, setHistory] = useState<SavedApplication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await authService.getHistory();
      setHistory(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this saved application? This cannot be undone.")) return;
    
    try {
      await authService.deleteApplication(id);
      setHistory(prev => prev.filter(app => app.id !== id));
    } catch (error) {
      console.error("Failed to delete", error);
      alert("Failed to delete application. Please try again.");
    }
  };

  const handleOpenCV = (appId: string) => {
      onClose();
      navigate(`/cv-generated/${appId}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full h-[80vh] flex flex-col overflow-hidden">
        
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-xl font-bold text-slate-800">Your Application History</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
               <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <p>No saved applications found.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {history.map((app) => (
                <div key={app.id} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 group">
                  <div className="flex-1 cursor-pointer" onClick={() => handleOpenCV(app.id)}>
                    <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{app.job_title || "Untitled Role"}</h4>
                    <p className="text-sm text-slate-500">{app.company_name || "Unknown Company"}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                       <span>{new Date(app.created_at).toLocaleDateString()}</span>
                       {app.match_score && (
                         <span className={`px-2 py-0.5 rounded-full ${app.match_score > 70 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                           {app.match_score}% Match
                         </span>
                       )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleOpenCV(app.id)}
                      className="px-4 py-2 bg-indigo-50 text-indigo-700 font-semibold rounded-lg text-sm hover:bg-indigo-100 transition-colors"
                    >
                      View
                    </button>
                    <button 
                      onClick={(e) => handleDelete(app.id, e)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Application"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
