
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { BLOG_POSTS } from '../data/blogData';
import { AdBanner } from '../components/AdBanner';

export const BlogPost: React.FC = () => {
  const { slug } = useParams();
  const post = BLOG_POSTS.find(p => p.slug === slug);

  if (!post) {
    return (
        <div className="max-w-3xl mx-auto px-6 py-24 text-center">
            <h1 className="text-3xl font-bold text-slate-900">Article Not Found</h1>
            <Link to="/blog" className="text-indigo-600 hover:underline mt-4 block">Return to Blog</Link>
        </div>
    );
  }

  const markdownComponents = {
      h1: ({node, ...props}: any) => <h1 className="text-3xl font-extrabold text-slate-900 mt-8 mb-4" {...props} />,
      h2: ({node, ...props}: any) => <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4" {...props} />,
      p: ({node, ...props}: any) => <p className="mb-4 leading-relaxed text-slate-700 text-lg" {...props} />,
      ul: ({node, ...props}: any) => <ul className="list-disc pl-5 space-y-2 mb-6 text-slate-700" {...props} />,
      li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
      strong: ({node, ...props}: any) => <strong className="font-bold text-slate-900" {...props} />,
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 animate-fade-in">
        <Link to="/blog" className="text-sm font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-2 mb-8">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Articles
        </Link>
        
        <article>
            <div className="text-center mb-12">
                 <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-4 inline-block">{post.category}</span>
                 <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6">{post.title}</h1>
                 <div className="flex items-center justify-center text-slate-500 text-sm gap-6">
                     <span>{post.date}</span>
                     <span>{post.readTime} read</span>
                 </div>
            </div>
            
            <div className="prose prose-lg prose-indigo mx-auto bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-100">
                 <ReactMarkdown components={markdownComponents}>{post.content}</ReactMarkdown>
            </div>
        </article>
        
        {/* Ad Placement: Bottom of Article (High visibility, non-obtrusive) */}
        <div className="mt-8 mb-8">
             <AdBanner type="external" format="horizontal" />
        </div>
        
        <div className="mt-8 bg-indigo-900 rounded-2xl p-8 md:p-12 text-center text-white">
            <h3 className="text-2xl font-bold mb-4">Ready to put this advice into action?</h3>
            <p className="text-indigo-200 mb-8 max-w-xl mx-auto">Use our AI-powered tool to scan your CV against job descriptions and get hired faster.</p>
            <Link to="/guestuserdashboard" className="inline-block bg-white text-indigo-900 px-8 py-3 rounded-full font-bold hover:bg-indigo-50 transition-colors">
                Get Started for Free
            </Link>
        </div>
    </div>
  );
};
