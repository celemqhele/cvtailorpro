
import React from 'react';

export const Privacy: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 animate-fade-in">
        <h1 className="text-4xl font-bold text-slate-900 mb-8 border-b pb-4">Privacy Policy & POPIA Compliance</h1>
        
        <div className="prose prose-slate max-w-none text-slate-600">
          <p className="text-sm text-slate-400 mb-6 italic">Last Updated: February 2024</p>

          <section className="mb-8">
            <h3 className="text-xl font-bold text-slate-800 mb-3">1. Introduction & Acceptance</h3>
            <p>By using CV Tailor Pro ("the Service"), operated by GoApply, you agree to this Privacy Policy. We are committed to protecting your personal information in accordance with the <strong>Protection of Personal Information Act 4 of 2013 (POPIA)</strong> of South Africa.</p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-bold text-slate-800 mb-3">2. Data Collection & Storage</h3>
            <p>We collect and store specific information to provide the Service. Under POPIA, we act as the Responsible Party for the following data:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>User Account Data:</strong> Name, email address, and encrypted password authentication data.</li>
              <li><strong>Usage History:</strong> We store a log of your generated applications (including Job Titles, Company Names, and generated text) to allow you to retrieve them later.</li>
              <li><strong>CV Data Storage:</strong> To improve your user experience, <strong>we store the extracted text content of your most recently uploaded CV</strong> in our database. This allows you to generate multiple tailored applications without needing to re-upload your file every time. We do <em>not</em> store the original binary file (PDF/Docx) permanently; only the extracted text is saved to your profile.</li>
              <li><strong>Transaction Data:</strong> We store Order IDs and Subscription status. We do NOT store credit card numbers or banking details; these are handled securely by our payment processor (Paystack).</li>
            </ul>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-bold text-slate-800 mb-3">3. POPIA Compliance (South Africa)</h3>
            <p>In compliance with POPIA, we ensure that:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
                <li><strong>Purpose Specification:</strong> Data is collected solely for the purpose of generating tailored CVs, Cover Letters, and managing your subscription.</li>
                <li><strong>Processing Limitation:</strong> We only process personal information that is adequate, relevant, and not excessive for the purpose of generating your job application documents.</li>
                <li><strong>Security Safeguards:</strong> We utilize industry-standard encryption (via Supabase) to protect your data integrity and confidentiality.</li>
                <li><strong>Data Subject Participation:</strong> You have the right to request access to, correction of, or deletion of your personal information. You may delete your account and all associated data at any time by contacting support.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-bold text-slate-800 mb-3">4. Third-Party AI Processing (Operator Agreement)</h3>
             <p>
                This service utilizes Third-Party Artificial Intelligence providers (specifically Cerebras AI and Google Gemini) to process your data. 
                By using this tool, you grant us permission to send your <strong>anonymized CV text</strong> and <strong>Job Descriptions</strong> to these providers for the sole purpose of content generation. 
                These providers do not retain your data for model training purposes.
             </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-bold text-slate-800 mb-3">5. User Obligations & Quality</h3>
            <p>You agree not to upload sensitive personal data (e.g., ID numbers, health data, biometric data) that is irrelevant to a job application. You are responsible for ensuring the accuracy of the personal information you provide.</p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-bold text-slate-800 mb-3">6. Contact Information Officer</h3>
            <p>If you have any questions regarding your personal information or wish to exercise your rights under POPIA, please contact our Information Officer at:</p>
            <p className="mt-2 font-medium"><a href="mailto:customerservice@goapply.co.za" className="text-indigo-600 hover:underline">customerservice@goapply.co.za</a></p>
            <p className="text-sm text-slate-500 mt-1">Physical Address: Durban, South Africa</p>
          </section>
        </div>
    </div>
  );
};
