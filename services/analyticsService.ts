import { supabase } from './supabaseClient';
import { v4 as uuidv4 } from 'uuid';

const SESSION_KEY = 'cv_tailor_session_token';

export interface AnalyticsEvent {
    path: string;
    referrer?: string;
    duration?: number;
}

class AnalyticsService {
    private sessionToken: string;
    private isReturning: boolean = false;

    constructor() {
        const token = localStorage.getItem(SESSION_KEY);
        if (token) {
            this.sessionToken = token;
            this.isReturning = true;
        } else {
            this.sessionToken = uuidv4();
            localStorage.setItem(SESSION_KEY, this.sessionToken);
            this.isReturning = false;
        }
        this.initSession();
    }

    private async initSession() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            // Ignore admin activity
            if (user?.email === 'mqhele03@gmail.com') {
                return;
            }

            // Upsert session
            await supabase.from('visitor_sessions').upsert({
                session_token: this.sessionToken,
                user_id: user?.id || null,
                is_returning: this.isReturning,
                browser_info: {
                    userAgent: navigator.userAgent,
                    language: navigator.language,
                    platform: navigator.platform,
                    screen: `${window.screen.width}x${window.screen.height}`
                },
                last_active_at: new Date().toISOString()
            }, { onConflict: 'session_token' });
        } catch (err) {
            console.error('Failed to init analytics session:', err);
        }
    }

    async trackPageView(path: string, referrer?: string) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email === 'mqhele03@gmail.com') {
                return;
            }

            await supabase.from('page_views').insert({
                session_token: this.sessionToken,
                path,
                referrer: referrer || document.referrer
            });
            
            // Update last active
            await supabase.from('visitor_sessions')
                .update({ last_active_at: new Date().toISOString() })
                .eq('session_token', this.sessionToken);
        } catch (err) {
            console.error('Failed to track page view:', err);
        }
    }

    async logError(message: string, stack?: string) {
        try {
            await supabase.from('error_logs').insert({
                session_token: this.sessionToken,
                message: message,
                stack: stack,
                path: window.location.pathname
            });
        } catch (err) {
            console.error('Failed to log error:', err);
        }
    }

    getToken() {
        return this.sessionToken;
    }

    isReturningUser() {
        return this.isReturning;
    }

    async getTrafficStats() {
        const { data, error } = await supabase
            .from('page_views')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data;
    }

    async getRealtimeUsers() {
        const now = new Date();
        const last30m = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
        const last1h = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

        const [res30m, res1h, res24h] = await Promise.all([
            supabase.from('visitor_sessions').select('session_token', { count: 'exact' }).gt('last_active_at', last30m),
            supabase.from('visitor_sessions').select('session_token', { count: 'exact' }).gt('last_active_at', last1h),
            supabase.from('visitor_sessions').select('session_token', { count: 'exact' }).gt('last_active_at', last24h)
        ]);

        return {
            last30m: res30m.count || 0,
            last1h: res1h.count || 0,
            last24h: res24h.count || 0
        };
    }

    async getUserJourneys() {
        // Fetch recent page views and group by session
        const { data, error } = await supabase
            .from('page_views')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(500);
        
        if (error) throw error;

        const journeys: Record<string, any> = {};
        data.forEach((view: any) => {
            if (!journeys[view.session_token]) {
                journeys[view.session_token] = {
                    sessionId: view.session_token,
                    startTime: view.created_at,
                    steps: []
                };
            }
            journeys[view.session_token].steps.unshift({
                path: view.path,
                time: view.created_at
            });
        });

        return Object.values(journeys);
    }
}

export const analyticsService = new AnalyticsService();
export const analytics = analyticsService;
