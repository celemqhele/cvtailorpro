import React from 'react';
import { Link } from 'react-router-dom';
import { blogPosts } from '../../data/blogData';
import { AdBanner } from '../../components/AdBanner';

export const BlogIndex: React.FC = () => {
  const categories = Array.from(new Set(blogPosts.map(post => post.category)));

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Career Advice Blog</h1>
        <p className="text-lg text-slate-600">Tips on landing interviews, optimizing your CV, and growing your career.</p>
      </div>

      <AdBanner className="mb-12" />

      {categories.map(category => (
        <div key={category} className="mb-12">
          <h2 className="text-2xl font-bold text-indigo-700 mb-6 border-b border-indigo-100 pb-2">{category}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogPosts.filter(p => p.category === category).map(post => (
              <Link to={`/blog/${post.id}`} key={post.id} className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden hover:shadow-xl hover:border-indigo-200 transition-all group">
                 <div className="p-6">
                    <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors">{post.title}</h3>
                    <p className="text-slate-600 text-sm mb-4 line-clamp-3">{post.summary}</p>
                    <div className="flex justify-between items-center mt-auto">
                        <span className="text-xs text-slate-400">{post.date}</span>
                        <span className="text-sm font-bold text-indigo-500">Read More →</span>
                    </div>
                 </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};