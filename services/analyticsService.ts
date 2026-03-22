/** Vercel Build Fix - TS1434 */
import { supabase } from './supabaseClient';
import { v4 as uuidv4 } from 'uuid';

const SESSION_KEY = 'cv_tailor_session_token';

export interface AnalyticsEvent {
    path: string;
    referrer?: string;
    duration?: number;
}

// Extend window for Google Analytics & Meta Pixel
declare global {
  interface Window {
    gtag?: (command: string, targetId: string, config?: any) => void;
    fbq?: (command: string, eventName: string, params?: any) => void;
  }
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
        // Initialize session and track initial page load immediately
        this.initSession().then(() => {
            this.trackPageView(window.location.pathname);
        });
    }

    private async initSession() {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            // Check if session already exists
            const { data: existingSession } = await supabase
                .from('visitor_sessions')
                .select('session_token')
                .eq('session_token', this.sessionToken)
                .single();

            if (!existingSession) {
                // Insert new session
                await supabase.from('visitor_sessions').insert({
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
                });
            } else {
                // Update last active
                await supabase.from('visitor_sessions')
                    .update({ last_active_at: new Date().toISOString() })
                    .eq('session_token', this.sessionToken);
            }
        } catch (err) {
            console.error('Failed to init analytics session:', err);
        }
    }

    async trackPageView(path: string, referrer?: string) {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            // Meta Pixel PageView
            if (window.fbq) {
                window.fbq('track', 'PageView');
            }

            // Google Analytics 4 PageView (Crucial for SPA route changes)
            if (window.gtag) {
                window.gtag('event', 'page_view', {
                    page_path: path,
                    page_location: window.location.href,
                    page_title: document.title
                });
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

    async trackEvent(eventName: string, metadata: any = {}) {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            // Meta Pixel Standard Events Mapping
            if (window.fbq) {
                switch (eventName) {
                    case 'cv_generated':
                    case 'lead_captured':
                        window.fbq('track', 'Lead', { content_name: eventName, ...metadata });
                        break;
                    case 'purchase_complete':
                        window.fbq('track', 'Purchase', { 
                            value: metadata.value || 0, 
                            currency: metadata.currency || 'ZAR',
                            content_name: metadata.plan_id
                        });
                        break;
                    case 'recruiter_search':
                        window.fbq('track', 'Search', { search_string: metadata.query });
                        break;
                    case 'view_job':
                        window.fbq('track', 'ViewContent', { 
                            content_name: metadata.job_title,
                            content_category: 'Jobs'
                        });
                        break;
                    default:
                        // Custom event
                        window.fbq('trackCustom', eventName, metadata);
                }
            }

            // Google Analytics (gtag) Mapping
            if (window.gtag) {
                switch (eventName) {
                    case 'cv_generated':
                        window.gtag('event', 'generate_lead', {
                            event_category: 'CV',
                            event_label: metadata.job_title || 'Unknown',
                            ...metadata
                        });
                        break;
                    case 'purchase_complete':
                        window.gtag('event', 'purchase', {
                            transaction_id: metadata.reference,
                            value: metadata.value || 0,
                            currency: metadata.currency || 'ZAR',
                            items: [{
                                item_id: metadata.plan_id,
                                item_name: metadata.plan_id,
                                price: metadata.value || 0,
                                quantity: 1
                            }]
                        });
                        break;
                    default:
                        window.gtag('event', eventName, metadata);
                }
            }

            await supabase.from('user_events').insert({
                session_token: this.sessionToken,
                user_id: user?.id || null,
                event_name: eventName,
                metadata: metadata
            });
        } catch (err) {
            console.error('Failed to track event:', err);
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

    async getCVGenerationStats() {
        const now = new Date();
        const last30m = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
        const last1h = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

        const [res30m, res1h, res24h] = await Promise.all([
            supabase.from('user_events').select('id', { count: 'exact' }).eq('event_name', 'cv_generated').gt('created_at', last30m),
            supabase.from('user_events').select('id', { count: 'exact' }).eq('event_name', 'cv_generated').gt('created_at', last1h),
            supabase.from('user_events').select('id', { count: 'exact' }).eq('event_name', 'cv_generated').gt('created_at', last24h)
        ]);

        return {
            last30m: res30m.count || 0,
            last1h: res1h.count || 0,
            last24h: res24h.count || 0
        };
    }

    async getDailyMetrics() {
        const { data: cvData, error: cvError } = await supabase
            .from('user_events')
            .select('created_at')
            .eq('event_name', 'cv_generated');
            
        if (cvError) throw cvError;

        const { data: revData, error: revError } = await supabase
            .from('user_events')
            .select('created_at, metadata')
            .eq('event_name', 'purchase_complete');
            
        if (revError) throw revError;

        const dailyStats: Record<string, { cvs: number, revenue: number }> = {};

        // Process CVs
        cvData?.forEach(event => {
            const date = new Date(event.created_at).toLocaleDateString();
            if (!dailyStats[date]) dailyStats[date] = { cvs: 0, revenue: 0 };
            dailyStats[date].cvs += 1;
        });

        // Process Revenue
        revData?.forEach(event => {
            const date = new Date(event.created_at).toLocaleDateString();
            if (!dailyStats[date]) dailyStats[date] = { cvs: 0, revenue: 0 };
            const amount = event.metadata?.value || 0;
            dailyStats[date].revenue += amount;
        });

        // Convert to array and sort by date
        return Object.entries(dailyStats)
            .map(([date, stats]) => ({
                date,
                cvs: stats.cvs,
                revenue: stats.revenue
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    async getFunnelData() {
        // Get counts for each step of the funnel
        const [pageViews, dataEntry, preview, generated, purchase] = await Promise.all([
            supabase.from('page_views').select('id', { count: 'exact' }),
            supabase.from('user_events').select('id', { count: 'exact' }).eq('event_name', 'data_entry_start'),
            supabase.from('user_events').select('id', { count: 'exact' }).eq('event_name', 'document_preview'),
            supabase.from('user_events').select('id', { count: 'exact' }).eq('event_name', 'cv_generated'),
            supabase.from('user_events').select('id', { count: 'exact' }).eq('event_name', 'purchase_complete')
        ]);

        return [
            { step: 'Site Visitors', count: pageViews.count || 0 },
            { step: 'Started Data Entry', count: dataEntry.count || 0 },
            { step: 'Previewed CV', count: preview.count || 0 },
            { step: 'Generated CV', count: generated.count || 0 },
            { step: 'Purchased Pro', count: purchase.count || 0 }
        ];
    }
    async getRecentCVGenerations(limit = 10) {
        const { data, error } = await supabase
            .from('user_events')
            .select('*')
            .eq('event_name', 'cv_generated')
            .order('created_at', { ascending: false })
            .limit(limit);
        
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
