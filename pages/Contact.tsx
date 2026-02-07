import React, { useState } from 'react';
import { Button } from '../components/Button';

export const Contact: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    // In a real app, this would send data to a backend
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Get in Touch</h1>
        <p className="text-lg text-slate-600">Have questions about your subscription or need help?</p>
      </div>

      <div className="grid md:grid-cols-2 gap-12">
        {/* Contact Info */}
        <div className="bg-indigo-50 rounded-2xl p-8 border border-indigo-100">
           <h3 className="text-2xl font-bold text-slate-900 mb-6">Contact Information</h3>
           
           <div className="space-y-6">
              <div className="flex items-center gap-4">
                 <div className="bg-white p-3 rounded-full shadow-sm text-indigo-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                 </div>
                 <div>
                    <p className="text-sm font-bold text-slate-500 uppercase">Email</p>
                    <a href="mailto:customerservice@goapply.co.za" className="text-lg font-medium text-slate-900 hover:text-indigo-600">customerservice@goapply.co.za</a>
                 </div>
              </div>

              <div className="flex items-center gap-4">
                 <div className="bg-white p-3 rounded-full shadow-sm text-indigo-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 </div>
                 <div>
                    <p className="text-sm font-bold text-slate-500 uppercase">Response Time</p>
                    <p className="text-lg font-medium text-slate-900">Within 24 Hours</p>
                 </div>
              </div>
           </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
           {submitted ? (
             <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Message Sent!</h3>
                <p className="text-slate-600 mt-2">We'll get back to you shortly.</p>
                <button onClick={() => setSubmitted(false)} className="mt-6 text-indigo-600 font-bold text-sm hover:underline">Send another message</button>
             </div>
           ) : (
             <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">Name</label>
                   <input required type="text" className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="John Doe" />
                </div>
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                   <input required type="email" className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="john@example.com" />
                </div>
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">Message</label>
                   <textarea required className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none" placeholder="How can we help?"></textarea>
                </div>
                <Button type="submit" className="w-full bg-slate-800 hover:bg-slate-900">Send Message</Button>
             </form>
           )}
        </div>
      </div>
    </div>
  );
};