
import React, { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { contentService } from '../services/contentService';
import { ContentItem } from '../data/blogData';
import { AdBanner } from '../components/AdBanner';

export const Content: React.FC = () => {
  const { isPaidUser } = useOutletContext<any>();
  const [articles, setArticles] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
      const fetchContent = async () => {
          try {
              const data = await contentService.getAllArticles();
              setArticles(data);
          } catch (e) {
              console.error("Failed to load articles", e);
          } finally {
              setIsLoading(false);
          }
      };
      fetchContent();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
        <div className="text-center mb-16">
            <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl">Career Success Hub</h1>
            <p className="mt-4 text-xl text-slate-500 max-w-2xl mx-auto">Expert guides, strategic advice, and deep dives to help you fast-track your employment journey.</p>
        </div>

        {/* Ad Break - Top */}
        {!isPaidUser && <AdBanner variant="display" className="mb-12" />}

        {/* Main Content Grid */}
        <section>
            <div className="flex items-center justify-between mb-8 border-b border-slate-200 pb-4">
               <h2 className="text-2xl font-bold text-slate-900">Latest Articles</h2>
            </div>
            
            {isLoading ? (
                <div className="flex justify-center py-20">
                    <svg className="animate-spin h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {articles.map(post => (
                        <Link to={`/content/${post.slug}`} key={post.id} className="flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 group transform hover:-translate-y-1">
                            <div className="h-48 bg-gradient-to-br from-indigo-50 to-slate-100 flex flex-col justify-end p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10 transition-transform group-hover:scale-110">
                                    <svg className="w-24 h-24 text-indigo-600" fill="currentColor" viewBox="0 0 24 24"><path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/><path d="M14 17H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                                </div>
                                <span className="bg-white/90 backdrop-blur-sm self-start text-indigo-800 text-[10px] font-bold px-2 py-1 rounded mb-2 uppercase tracking-wide border border-indigo-100 shadow-sm">{post.category}</span>
                                <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight line-clamp-2">{post.title}</h3>
                            </div>
                            <div className="p-6 flex-1 flex flex-col">
                                <p className="text-slate-600 text-sm mb-4 flex-1 line-clamp-3 leading-relaxed">{post.excerpt}</p>
                                <div className="flex items-center justify-between text-xs text-slate-400 mt-auto pt-4 border-t border-slate-100">
                                    <span className="flex items-center gap-1 font-medium">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        {post.readTime}
                                    </span>
                                    <span className="font-bold text-indigo-600 group-hover:underline flex items-center gap-1">
                                        Read Article 
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </section>

        {/* Ad Break - Bottom */}
        {!isPaidUser && <AdBanner variant="multiplex" className="mt-16" />}
        
        <div className="mt-16 bg-slate-50 rounded-2xl p-8 text-center border border-slate-200">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Want tailored career advice?</h3>
            <p className="text-slate-600 mb-6">Our AI tool doesn't just write CVs; it helps you understand your career gaps.</p>
            <Link to="/guestuserdashboard" className="inline-block px-6 py-3 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 transition-colors">
                Analyze My CV Now
            </Link>
        </div>
    </div>
  );
};
