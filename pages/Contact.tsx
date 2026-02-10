
import React, { useState } from 'react';
import { Button } from '../components/Button';
import { emailService } from '../services/emailService';

export const Contact: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<React.ReactNode | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('General Inquiry');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setError(null);

      try {
        await emailService.sendContactForm(name, email, subject, message);
        setSubmitted(true);
      } catch (err: any) {
        console.error("Contact submission failed:", err);
        // Fallback: Create a direct mailto link if the server fails
        const mailtoLink = `mailto:customerservice@goapply.co.za?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`)}`;
        
        setError(
          <span>
            System is temporarily offline. <a href={mailtoLink} className="underline font-bold text-red-800 hover:text-red-950">Click here to send email directly</a> via your mail app.
          </span>
        );
      } finally {
        setIsLoading(false);
      }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-16 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            
            {/* Contact Info */}
            <div>
                <h1 className="text-4xl font-extrabold text-slate-900 mb-6">Contact Us</h1>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                    Have questions about our AI, billing, or just want to say hello? We're here to help you land your dream job.
                </p>

                <div className="space-y-6">
                    <div className="flex items-start gap-4">
                        <div className="bg-indigo-100 p-3 rounded-lg text-indigo-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Email Support</h3>
                            <p className="text-slate-500">customerservice@goapply.co.za</p>
                            <p className="text-xs text-slate-400 mt-1">Response time: 24-48 hours</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="bg-indigo-100 p-3 rounded-lg text-indigo-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Location</h3>
                            <p className="text-slate-500">Johannesburg, South Africa</p>
                            <p className="text-xs text-slate-400 mt-1">GoApply HQ</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200">
                {submitted ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Message Sent!</h3>
                        <p className="text-slate-600">Thank you for contacting us. We will get back to you shortly.</p>
                        <button onClick={() => { setSubmitted(false); setMessage(''); setSubject('General Inquiry'); }} className="mt-6 text-indigo-600 font-bold hover:underline">Send another message</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
                        
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Your Name</label>
                            <input 
                                required type="text" 
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                placeholder="John Doe" 
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Email Address</label>
                            <input 
                                required type="email" 
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                placeholder="john@example.com" 
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Subject</label>
                            <select 
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                            >
                                <option>General Inquiry</option>
                                <option>Support / Technical Issue</option>
                                <option>Billing Question</option>
                                <option>Feature Request</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Message</label>
                            <textarea 
                                required rows={4} 
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                placeholder="How can we help you?"
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                            ></textarea>
                        </div>
                        <Button type="submit" isLoading={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-md">Send Message</Button>
                    </form>
                )}
            </div>
        </div>
    </div>
  );
};
