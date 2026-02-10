
import React from 'react';

const REVIEWS = [
  {
    id: 1,
    quote: "Amazing, the analysis of whether your cv is a match or not is very impressive. I’m also happy with the fact that when you generate the cv it also creates a covering letter for you as well. 10/10 no notes on that",
    author: "Happy User",
    rating: 5
  },
  {
    id: 2,
    quote: "Wow👏🏽👏🏽 I am honestly impressed!!! The cv format 🤌🏽",
    author: "Happy User",
    rating: 5
  },
  {
    id: 3,
    quote: "I love it so much, I just created my cv now, and I love it, thank you so much. My friends are also going to use it for their cvs",
    author: "Happy User",
    rating: 5
  }
];

export const Testimonials: React.FC = () => {
  return (
    <section className="py-16 bg-white border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-slate-900">What our users say</h2>
          <p className="mt-4 text-lg text-slate-600">Join thousands of job seekers landing interviews.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {REVIEWS.map((review) => (
            <div key={review.id} className="bg-slate-50 p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col relative hover:shadow-md transition-shadow">
              {/* Quote Icon */}
              <div className="absolute top-4 right-6 text-indigo-100">
                <svg className="w-12 h-12 transform rotate-180" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.896 14.383 16.33 15.125 15.382C16.824 13.208 18.216 11.236 18.72 9.006C18.96 7.954 18.96 6.969 18.72 6.136H15.003L15.003 3H21.003V6.26C21.003 12.316 18.019 17.512 14.017 21ZM5.01697 21L5.01697 18C5.01697 16.896 5.38297 16.33 6.12497 15.382C7.82397 13.208 9.21597 11.236 9.71997 9.006C9.95997 7.954 9.95997 6.969 9.71997 6.136H6.00297L6.00297 3H12.003V6.26C12.003 12.316 9.01897 17.512 5.01697 21Z"/></svg>
              </div>
              
              <div className="flex text-amber-400 mb-4">
                {[...Array(review.rating)].map((_, i) => (
                  <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                ))}
              </div>

              <p className="text-slate-700 italic flex-grow relative z-10 leading-relaxed">"{review.quote}"</p>
              
              <div className="mt-6 pt-4 border-t border-slate-200 flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                    {review.author.charAt(0)}
                 </div>
                 <span className="text-sm font-bold text-slate-900">{review.author}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
