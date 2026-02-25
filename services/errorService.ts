import { supabase } from "./supabaseClient";

export interface ErrorLog {
    message: string;
    stack?: string;
    path?: string;
    metadata?: any;
    user_id?: string;
}

export const errorService = {
    async logError(error: ErrorLog) {
        try {
            const { error: supabaseError } = await supabase
                .from('error_logs')
                .insert([{
                    ...error,
                    created_at: new Date().toISOString()
                }]);
            
            if (supabaseError) console.error("Failed to log error to Supabase:", supabaseError);
        } catch (e) {
            console.error("Error logging service failed:", e);
        }
    },

    async getLogs(limit = 100) {
        const { data, error } = await supabase
            .from('error_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        return data;
    }
};
