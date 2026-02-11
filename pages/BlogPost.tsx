
import React, { Fragment, useEffect, useState } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { contentService } from '../services/contentService';
import { ContentItem } from '../data/blogData';
import { AdBanner } from '../components/AdBanner';

export const ContentPost: React.FC = () => {
  const { slug } = useParams();
  const { isPaidUser } = useOutletContext<any>();
  const [post, setPost] = useState<ContentItem | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
      const fetchPost = async () => {
          if (!slug) return;
          try {
              const data = await contentService.getArticleBySlug(slug);
              setPost(data);
          } catch (e) {
              console.error("Failed to load post", e);
          } finally {
              setIsLoading(false);
          }
      };
      fetchPost();
  }, [slug]);

  if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      );
  }

  if (!post) {
    return (
        <div className="max-w-3xl mx-auto px-6 py-24 text-center">
            <h1 className="text-3xl font-bold text-slate-900">Content Not Found</h1>
            <Link to="/content" className="text-indigo-600 hover:underline mt-4 block">Return to Hub</Link>
        </div>
    );
  }

  // Function to inject ads into markdown text for non-pro users
  const renderContentWithAds = (content: string) => {
      // Split by double newline to get paragraphs
      const paragraphs = content.split('\n\n');
      
      return paragraphs.map((para, index) => {
          // Inject ad every 4 paragraphs if user is not paid
          const shouldShowAd = !isPaidUser && index > 0 && index % 4 === 0;
          
          return (
              <Fragment key={index}>
                  <ReactMarkdown 
                    components={{
                        h1: ({node, ...props}: any) => <h1 className="text-3xl font-extrabold text-slate-900 mt-10 mb-6 leading-tight" {...props} />,
                        h2: ({node, ...props}: any) => <h2 className="text-2xl font-bold text-slate-800 mt-10 mb-4 border-l-4 border-indigo-500 pl-4" {...props} />,
                        h3: ({node, ...props}: any) => <h3 className="text-xl font-bold text-slate-800 mt-8 mb-3" {...props} />,
                        p: ({node, ...props}: any) => <p className="mb-6 leading-relaxed text-slate-700 text-lg" {...props} />,
                        ul: ({node, ...props}: any) => <ul className="list-disc pl-6 space-y-3 mb-8 text-slate-700" {...props} />,
                        li: ({node, ...props}: any) => <li className="pl-1 leading-relaxed" {...props} />,
                        strong: ({node, ...props}: any) => <strong className="font-bold text-slate-900 bg-slate-100 px-1 rounded" {...props} />,
                    }}
                  >
                      {para}
                  </ReactMarkdown>
                  {shouldShowAd && (
                      <div className="my-10 bg-slate-50 border-y border-slate-100 py-6 -mx-6 px-6 md:-mx-12 md:px-12 flex justify-center">
                          <AdBanner variant="in-feed" />
                      </div>
                  )}
              </Fragment>
          );
      });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-8">
            <Link to="/content" className="hover:text-indigo-600">Content Hub</Link>
            <span>/</span>
            <span className="font-bold text-slate-900 truncate max-w-[200px]">{post.title}</span>
        </div>
        
        <article className="max-w-4xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="text-center p-8 md:p-12 border-b border-slate-100 bg-slate-50/50">
                 <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-4 inline-block bg-indigo-100 text-indigo-700">
                    {post.category}
                 </span>
                 <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6 leading-tight">{post.title}</h1>
                 <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-6 leading-relaxed font-light">{post.excerpt}</p>
                 <div className="flex items-center justify-center text-slate-400 text-sm gap-6 font-medium uppercase tracking-widest">
                     <span>{post.date}</span>
                     <span>•</span>
                     <span>{post.readTime}</span>
                 </div>
            </div>

            {/* Article Content */}
            <div className="p-8 md:p-16">
                 {/* Top Ad for Free Users */}
                 {!isPaidUser && (
                     <div className="mb-12 flex justify-center">
                        <AdBanner variant="display" />
                     </div>
                 )}

                 <div className="prose prose-lg prose-indigo max-w-none">
                     {renderContentWithAds(post.content)}
                 </div>

                 {/* Bottom Ad for Free Users */}
                 {!isPaidUser && (
                     <div className="mt-12 flex justify-center">
                        <AdBanner variant="multiplex" />
                     </div>
                 )}
            </div>

            {/* CTA Section */}
            <div className="bg-indigo-900 p-12 text-center text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="relative z-10">
                    <h3 className="text-3xl font-bold mb-4">Ready to put this advice into action?</h3>
                    <p className="text-indigo-200 mb-8 max-w-xl mx-auto text-lg">
                        Don't just read about it. Use our AI to scan your CV against job descriptions and get hired faster.
                    </p>
                    <Link to="/guestuserdashboard" className="inline-block bg-white text-indigo-900 px-10 py-4 rounded-full font-bold text-lg hover:bg-indigo-50 transition-transform hover:scale-105 shadow-xl">
                        Optimize My CV Now
                    </Link>
                </div>
            </div>
        </article>
    </div>
  );
};
