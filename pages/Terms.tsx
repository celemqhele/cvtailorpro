
import React from 'react';

export const Terms: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 animate-fade-in">
        <h1 className="text-4xl font-bold text-slate-900 mb-8 border-b pb-4">Terms and Conditions</h1>
        
        <div className="prose prose-slate max-w-none text-slate-600">
          <p className="text-sm text-slate-400 mb-8">Last Updated: February 2024</p>

          <section className="mb-8">
            <h3 className="text-xl font-bold text-slate-800 mb-3">1. Agreement to Terms</h3>
            <p>These Terms of Service constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and GoApply ("we," "us" or "our"), concerning your access to and use of the CV Tailor Pro website and service.</p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-bold text-slate-800 mb-3">2. Intellectual Property Rights</h3>
            <p>Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Site (collectively, the "Content") are owned or controlled by us or licensed to us, and are protected by copyright and trademark laws.</p>
            <p>The content you generate (CVs and Cover Letters) belongs to you.</p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-bold text-slate-800 mb-3">3. User Representations</h3>
            <p>By using the Site, you represent and warrant that:</p>
            <ul className="list-disc pl-5 space-y-2">
                <li>All registration information you submit will be true, accurate, current, and complete.</li>
                <li>You have the legal capacity and you agree to comply with these Terms of Service.</li>
                <li>You are not a minor in the jurisdiction in which you reside.</li>
                <li>You will not access the Site through automated or non-human means, whether through a bot, script or otherwise.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-bold text-slate-800 mb-3">4. Prohibited Activities</h3>
            <p>You may not use the Site for any purpose other than that for which we make the Site available. The Site may not be used in connection with any commercial endeavors except those that are specifically endorsed or approved by us.</p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-bold text-slate-800 mb-3">5. Payment and Refunds</h3>
            <p>All payments for Pro plans are one-time, non-recurring transactions. We do not offer refunds once the service has been accessed or used, except where required by law.</p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-bold text-slate-800 mb-3">6. Limitation of Liability</h3>
            <p>In no event will we or our directors, employees, or agents be liable to you or any third party for any direct, indirect, consequential, exemplary, incidental, special, or punitive damages, including lost profit, lost revenue, loss of data, or other damages arising from your use of the site.</p>
          </section>
          
           <section className="mb-8">
            <h3 className="text-xl font-bold text-slate-800 mb-3">7. Contact Us</h3>
            <p>In order to resolve a complaint regarding the Site or to receive further information regarding use of the Site, please contact us at:</p>
            <p className="font-bold">customerservice@goapply.co.za</p>
          </section>
        </div>
    </div>
  );
};
