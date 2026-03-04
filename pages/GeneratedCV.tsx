import React, { useState } from 'react';

const GeneratedCV = () => {
  const [showPrintModal, setShowPrintModal] = useState(false);
  // Add other states here

  return (
    <div>
      {/* Existing content */}

      {/* Print Fallback Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-lg font-bold text-amber-600">Service Unavailable</h2>
            <p>We are sorry, but the PDF is currently unavailable.</p>
            <button onClick={() => setShowPrintModal(false)} className="mt-4 bg-amber-500 text-white px-4 py-2 rounded">
              Okay
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneratedCV;