import React from 'react';

export const Terms: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 md:p-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-8 border-b border-slate-200 pb-4">Terms and Conditions</h1>
        
        <div className="prose prose-slate max-w-none">
          <section className="mb-8">
            <h3 className="text-xl font-bold text-slate-900 mb-4">1. Acceptance of Terms</h3>
            <p>
              By accessing and using CV Tailor Pro ("the Service"), you accept and agree to be bound by the terms and provision of this agreement.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-bold text-slate-900 mb-4">2. Description of Service</h3>
            <p>
              CV Tailor Pro provides AI-powered document tailoring services. We generate content based on user input. We do not guarantee employment or interview offers resulting from the use of our documents.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-bold text-slate-900 mb-4">3. Payments and Refunds</h3>
            <ul className="list-disc pl-5 space-y-2">
               <li>All prices are in South African Rand (ZAR).</li>
               <li>
                 <strong>Single Downloads (R20):</strong> These are non-refundable once the file has been generated/unlocked.
               </li>
               <li>
                 <strong>Subscriptions (Pro Plus):</strong> Subscriptions can be cancelled at any time but remain active until the end of the billing period. Refunds for unused time are not provided.
               </li>
            </ul>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-bold text-slate-900 mb-4">4. User Content</h3>
            <p>
              You retain all rights to the personal data and CVs you upload. By uploading content, you grant us permission to process it solely for the purpose of generating your tailored documents. We do not claim ownership of your work history or personal details.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-bold text-slate-900 mb-4">5. Limitation of Liability</h3>
            <p>
              CV Tailor Pro shall not be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the service.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};