import { supabase } from "./supabaseClient";
import { v4 as uuidv4 } from 'uuid';

// Simple session management
const SESSION_KEY = 'cv_tailor_session_id';
const getSessionId = () => {
    let sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
        sessionId = uuidv4();
        localStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
};

export const analyticsService = {
    async trackPageView(path: string, userId?: string) {
        try {
            const sessionId = getSessionId();
            const { error } = await supabase
                .from('page_views')
                .insert([{
                    user_id: userId || null,
                    session_id: sessionId,
                    path,
                    referrer: document.referrer || null,
                    user_agent: navigator.userAgent,
                    created_at: new Date().toISOString()
                }]);
            
            if (error) console.error("Failed to track page view:", error);
        } catch (e) {
            console.error("Analytics tracking failed:", e);
        }
    },

    async getTrafficStats(days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data, error } = await supabase
            .from('page_views')
            .select('created_at, path, session_id')
            .gte('created_at', startDate.toISOString());
        
        if (error) throw error;
        return data;
    },

    async getRealtimeUsers() {
        // Users active in the last 30 mins, 1 hour, 24 hours
        const now = new Date();
        const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const { data, error } = await supabase
            .from('page_views')
            .select('session_id, created_at')
            .gte('created_at', twentyFourHoursAgo.toISOString());
        
        if (error) throw error;

        const stats = {
            last30m: new Set(data.filter(v => new Date(v.created_at) >= thirtyMinsAgo).map(v => v.session_id)).size,
            last1h: new Set(data.filter(v => new Date(v.created_at) >= oneHourAgo).map(v => v.session_id)).size,
            last24h: new Set(data.map(v => v.session_id)).size
        };

        return stats;
    },

    async getUserJourneys() {
        const { data, error } = await supabase
            .from('page_views')
            .select('session_id, path, created_at, user_id')
            .order('created_at', { ascending: true });
        
        if (error) throw error;

        // Group by session
        const journeys: Record<string, any[]> = {};
        data.forEach(view => {
            if (!journeys[view.session_id]) {
                journeys[view.session_id] = [];
            }
            journeys[view.session_id].push(view);
        });

        return Object.entries(journeys).map(([sessionId, steps]) => ({
            sessionId,
            userId: steps[0].user_id,
            startTime: steps[0].created_at,
            steps: steps.map(s => ({ path: s.path, time: s.created_at }))
        })).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    }
};
