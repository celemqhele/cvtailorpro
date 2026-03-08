import { supabase } from './supabaseClient';

export const progressService = {
    async startJob(userId: string, type: 'cv' | 'skeleton' = 'cv') {
        if (!userId) return;
        
        const { error } = await supabase
            .from('generation_progress')
            .upsert({ 
                user_id: userId, 
                started_at: new Date().toISOString(),
                status: 'processing',
                type
            });
            
        if (error) console.error("Failed to start job progress", error);
    },

    async completeJob(userId: string) {
        if (!userId) return;

        const { error } = await supabase
            .from('generation_progress')
            .delete()
            .eq('user_id', userId);

        if (error) console.error("Failed to complete job progress", error);
    },

    async getActiveJob(userId: string) {
        if (!userId) return null;

        const { data, error } = await supabase
            .from('generation_progress')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) return null;
        
        // Check if job is stale (> 5 minutes)
        const startedAt = new Date(data.started_at).getTime();
        const now = Date.now();
        if (now - startedAt > 5 * 60 * 1000) {
            await this.completeJob(userId);
            return null;
        }

        return data;
    }
};
