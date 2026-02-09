
import React from 'react';
import { Link } from 'react-router-dom';
import { BLOG_POSTS } from '../data/blogData';
import { AdBanner } from '../components/AdBanner';

export const Blog: React.FC = () => {
  const listicles = BLOG_POSTS.filter(post => post.category === 'Listicle');
  const guides = BLOG_POSTS.filter(post => post.category === 'Guide');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
        <div className="text-center mb-16">
            <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl">Career Advice & Insights</h1>
            <p className="mt-4 text-xl text-slate-500 max-w-2xl mx-auto">Expert tips on interviewing, CV writing, and landing your dream job.</p>
        </div>

        {/* Featured / Listicles */}
        <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-8 border-b border-slate-200 pb-4">Top 5 Quick Reads</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {listicles.map(post => (
                    <Link to={`/blog/${post.slug}`} key={post.id} className="group bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all">
                        <div className="h-48 bg-gradient-to-br from-indigo-500 to-purple-600 relative overflow-hidden">
                             <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
                             <div className="absolute bottom-4 left-4 right-4 text-white">
                                 <span className="bg-white/20 backdrop-blur-md px-2 py-1 rounded text-xs font-bold uppercase tracking-wide">{post.category}</span>
                             </div>
                        </div>
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">{post.title}</h3>
                            <p className="text-slate-500 text-sm mb-4 line-clamp-3">{post.excerpt}</p>
                            <div className="flex items-center text-xs text-slate-400 gap-4">
                                <span>{post.readTime} read</span>
                                <span>{post.date}</span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </section>

        {/* Pro Plan Interruption */}
        <AdBanner type="internal" className="my-16" />

        {/* Comprehensive Guides */}
        <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-8 border-b border-slate-200 pb-4">Comprehensive Guides</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {guides.map(post => (
                    <Link to={`/blog/${post.slug}`} key={post.id} className="flex flex-col md:flex-row bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all group">
                         <div className="md:w-1/3 bg-slate-100 flex items-center justify-center p-8">
                             <div className="text-4xl font-bold text-slate-300 group-hover:text-indigo-300 transition-colors">#{post.id}</div>
                         </div>
                         <div className="p-6 flex-1 flex flex-col justify-center">
                             <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">{post.title}</h3>
                             <p className="text-slate-500 text-sm mb-4">{post.excerpt}</p>
                             <div className="flex items-center text-xs text-slate-400 gap-4 mt-auto">
                                <span>{post.readTime} read</span>
                                <span className="font-medium text-indigo-600">Read Article →</span>
                             </div>
                         </div>
                    </Link>
                 ))}
            </div>
        </section>
    </div>
  );
};
