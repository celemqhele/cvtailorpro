import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { blogPosts } from '../../data/blogData';
import { AdBanner } from '../../components/AdBanner';
import { Button } from '../../components/Button';

// This component acts as the Dynamic Template for any article/product
export const BlogPost: React.FC = () => {
  // 1. Get the dynamic slug from the URL
  const { slug } = useParams<{ slug: string }>();
  
  // 2. Fetch data based on slug (In a real app, this might be an API call)
  const post = blogPosts.find(p => p.id === slug);
  const relatedPosts = blogPosts.filter(p => p.category === post?.category && p.id !== post?.id).slice(0, 3);

  // 3. Handle 404
  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Dynamic Header / Hero Area */}
      <div className="bg-slate-50 border-b border-slate-200 py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <Link to="/blog" className="text-indigo-600 font-semibold mb-4 inline-flex items-center gap-2 hover:underline">
             ← Back to Library
          </Link>
          <span className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
            {post.category}
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-4 leading-tight">
            {post.title}
          </h1>
          <p className="text-slate-500">{post.date}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto py-12 px-6 grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Content Column */}
        <div className="lg:col-span-2">
          <article className="prose prose-lg prose-slate max-w-none text-slate-700">
             <ReactMarkdown>{post.content}</ReactMarkdown>
          </article>
          
          {/* Post-Content Ad */}
          <div className="mt-12 py-8 border-t border-slate-100">
             <AdBanner format="horizontal" />
          </div>
        </div>

        {/* Sidebar / CTA Column */}
        <div className="space-y-8">
           {/* Sticky CTA Card */}
           <div className="bg-indigo-900 rounded-2xl p-8 text-white shadow-xl sticky top-24">
              <h3 className="text-xl font-bold mb-3">Improve Your CV Today</h3>
              <p className="text-indigo-100 mb-6 text-sm leading-relaxed">
                Don't let a bad resume hold you back. Use our AI to tailor your CV to any job description in seconds.
              </p>
              <Link to="/app" className="block">
                  <Button className="w-full bg-white text-indigo-900 hover:bg-indigo-50 font-bold border-none">
                      Launch Dashboard
                  </Button>
              </Link>
              <p className="text-[10px] text-center mt-3 opacity-60">No credit card required for basic scan.</p>
           </div>

           {/* Related Content */}
           <div>
              <h4 className="font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">Related Articles</h4>
              <div className="space-y-4">
                {relatedPosts.map(rp => (
                  <Link key={rp.id} to={`/blog/${rp.id}`} className="block group">
                    <h5 className="font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {rp.title}
                    </h5>
                    <span className="text-xs text-slate-400">Read article →</span>
                  </Link>
                ))}
              </div>
           </div>
           
           {/* Sidebar Ad */}
           <div className="flex justify-center">
              <AdBanner format="rectangle" />
           </div>
        </div>
      </div>
    </div>
  );
};