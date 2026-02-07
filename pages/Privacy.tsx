import React from 'react';

export const Privacy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 md:p-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-8 border-b border-slate-200 pb-4">Privacy Policy</h1>
        
        <div className="prose prose-slate max-w-none">
          <section className="mb-8">
            <h3 className="text-xl font-bold text-slate-900 mb-4">1. Introduction</h3>
            <p>
              Welcome to CV Tailor Pro ("we," "our," or "us"). We are committed to protecting your personal information.
              This policy explains how we handle your data when you use our CV tailoring service.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-bold text-slate-900 mb-4">2. Data Retention & Cloud Storage</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Transaction IDs:</strong> We store <strong>Pro Plus IDs</strong> (Subscriptions) and <strong>Order IDs</strong> (Single Downloads) in our secure database to verify your purchase status and manage subscription validity.
              </li>
              <li>
                <strong>Generated Content:</strong> For paid orders (identified by an Order ID), we securely store the generated CV and Cover Letter text in our database. This allows you to <strong>restore your document</strong> from any device using your Order ID.
              </li>
              <li>
                <strong>Uploaded Files:</strong> The original files you upload are processed in-memory and are <strong>NOT</strong> permanently stored on our servers.
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-bold text-slate-900 mb-4">3. Third-Party AI Services</h3>
             <p>
              We utilize Cerebras AI (powering models like Llama 3.3 70B) to process text. By using this tool, you acknowledge that your input data is sent to the Cerebras API solely for the purpose of generating your tailored application.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-bold text-slate-900 mb-4">4. Payment Information</h3>
            <p>
              Payments are processed securely via Paystack. We do not store your credit card details. We only store the transaction reference linked to your Order ID or Subscription ID to confirm payment success.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-bold text-slate-900 mb-4">5. Contact</h3>
            <p>
              Questions? Contact us at <a href="mailto:customerservice@goapply.co.za" className="text-indigo-600 hover:underline">customerservice@goapply.co.za</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};