

import { supabase } from './supabaseClient';
import { CONTENT_ITEMS, ContentItem } from '../data/blogData';
import { naturalizeText } from '../utils/textHelpers';

// Helper to convert DB snake_case to app camelCase
const transformArticle = (dbArticle: any): ContentItem => ({
    id: dbArticle.id,
    slug: dbArticle.slug,
    title: naturalizeText(dbArticle.title),
    excerpt: naturalizeText(dbArticle.excerpt),
    summary: naturalizeText(dbArticle.excerpt), // Map excerpt to summary
    category: dbArticle.category,
    date: new Date(dbArticle.created_at).toISOString().split('T')[0],
    readTime: dbArticle.read_time,
    content: naturalizeText(dbArticle.content)
});

export const contentService = {
    /**
     * Fetches all articles (both DB and Static).
     */
    async getAllArticles(): Promise<ContentItem[]> {
        const { data, error } = await supabase
            .from('articles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Failed to fetch DB articles:", error);
            return CONTENT_ITEMS;
        }

        const dbArticles = data.map(transformArticle);
        
        // Merge DB articles with Static articles
        // Prefer DB articles if slugs collide (optional logic, but here we just concat)
        return [...dbArticles, ...CONTENT_ITEMS];
    },

    /**
     * Fetches a single article by slug.
     */
    async getArticleBySlug(slug: string): Promise<ContentItem | undefined> {
        // 1. Try DB
        const { data, error } = await supabase
            .from('articles')
            .select('*')
            .eq('slug', slug)
            .single();

        if (data && !error) {
            return transformArticle(data);
        }

        // 2. Fallback to Static
        return CONTENT_ITEMS.find(item => item.slug === slug);
    },

    /**
     * Creates a new article in the DB.
     */
    async createArticle(article: Omit<ContentItem, 'id' | 'date'>) {
        const { error } = await supabase
            .from('articles')
            .insert({
                title: article.title,
                slug: article.slug,
                excerpt: article.excerpt,
                content: article.content,
                category: article.category,
                read_time: article.readTime
            });
        
        if (error) throw error;
    },

    /**
     * Deletes an article (DB only).
     */
    async deleteArticle(id: string) {
        const { error } = await supabase
            .from('articles')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
    }
};