import { supabase } from "./supabaseClient";

export const metricsService = {
    async getCVGenerationStats() {
        // We use the 'applications' table as a proxy for successful generations
        const { data, error } = await supabase
            .from('applications')
            .select('created_at');
        
        if (error) throw error;
        return data;
    },

    async getRevenueStats() {
        const { data, error } = await supabase
            .from('orders')
            .select('amount, created_at, status')
            .eq('status', 'completed'); // Assuming 'completed' is the success status
        
        if (error) throw error;
        return data;
    },

    async getDashboardData() {
        const [cvData, revenueData] = await Promise.all([
            this.getCVGenerationStats(),
            this.getRevenueStats()
        ]);

        return {
            cvGenerations: cvData,
            revenue: revenueData
        };
    }
};
