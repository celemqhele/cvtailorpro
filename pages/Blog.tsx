
import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { CONTENT_ITEMS } from '../data/blogData';
import { AdBanner } from '../components/AdBanner';

export const Content: React.FC = () => {
  const { isPaidUser } = useOutletContext<any>();
  const videos = CONTENT_ITEMS.filter(post => post.category === 'Video');
  const articles = CONTENT_ITEMS.filter(post => post.category !== 'Video');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
        <div className="text-center mb-16">
            <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl">Career Success Hub</h1>
            <p className="mt-4 text-xl text-slate-500 max-w-2xl mx-auto">Masterclasses, guides, and expert insights to fast-track your employment.</p>
        </div>

        {/* Video Masterclasses Section */}
        <section className="mb-16">
            <div className="flex items-center justify-between mb-8 border-b border-slate-200 pb-4">
               <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                 <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                 Video Masterclasses
               </h2>
               <span className="text-sm font-medium text-slate-500">Watch & Learn</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {videos.map(video => (
                    <Link to={`/content/${video.slug}`} key={video.id} className="group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                        <div className="h-40 bg-slate-900 relative">
                             {/* YouTube Thumbnail Approximation */}
                             <img 
                                src={`https://img.youtube.com/vi/${video.videoUrl?.split('v=')[1]}/hqdefault.jpg`} 
                                alt={video.title} 
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                             />
                             <div className="absolute inset-0 flex items-center justify-center">
                                <div className="bg-red-600 text-white rounded-full p-3 shadow-lg group-hover:scale-110 transition-transform">
                                   <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                </div>
                             </div>
                             <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded font-bold">
                                {video.readTime}
                             </div>
                        </div>
                        <div className="p-4">
                            <h3 className="text-sm font-bold text-slate-900 mb-2 group-hover:text-indigo-600 line-clamp-2 leading-tight">{video.title}</h3>
                            <p className="text-xs text-slate-500 line-clamp-2 mb-3">{video.excerpt}</p>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Watch Video →</span>
                        </div>
                    </Link>
                ))}
            </div>
        </section>

        {/* Ad Break */}
        {!isPaidUser && <AdBanner type="external" className="my-12" />}

        {/* Written Guides */}
        <section>
            <div className="flex items-center justify-between mb-8 border-b border-slate-200 pb-4">
               <h2 className="text-2xl font-bold text-slate-900">In-Depth Guides & Articles</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {articles.map(post => (
                    <Link to={`/content/${post.slug}`} key={post.id} className="flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all group">
                         <div className="h-48 bg-gradient-to-br from-indigo-50 to-slate-100 flex flex-col justify-end p-6 relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-4 opacity-10">
                                 <svg className="w-24 h-24 text-indigo-600" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                             </div>
                             <span className="bg-white/80 backdrop-blur-sm self-start text-indigo-800 text-[10px] font-bold px-2 py-1 rounded mb-2 uppercase tracking-wide border border-indigo-100">{post.category}</span>
                             <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">{post.title}</h3>
                         </div>
                         <div className="p-6 flex-1 flex flex-col">
                             <p className="text-slate-600 text-sm mb-4 flex-1 line-clamp-3">{post.excerpt}</p>
                             <div className="flex items-center text-xs text-slate-400 gap-4 mt-auto pt-4 border-t border-slate-100">
                                <span className="flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    {post.readTime} read
                                </span>
                                <span className="font-bold text-indigo-600 group-hover:underline">Read Article</span>
                             </div>
                         </div>
                    </Link>
                 ))}
            </div>
        </section>
        
        <div className="mt-16 text-center">
            <p className="text-slate-400 text-sm">More content coming soon.</p>
        </div>
    </div>
  );
};
