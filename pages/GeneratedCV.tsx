import React from 'react';
import { Modal } from 'your-modal-library'; // Replace with actual modal library import

const GeneratedCV = () => {
    const [showPrintModal, setShowPrintModal] = React.useState(false);

    return (
        <div>
            {/* Other component code */}
            {showPrintModal && (
                <Modal
                    className="fixed inset-0 z-[100] backdrop"
                    onClose={() => setShowPrintModal(false)}
                >
                    <div className="bg-white rounded p-5">
                        <div className="flex items-center">
                            <span className="text-amber-500">
                                {/* Your amber warning icon */}
                            </span>
                            <h2 className="ml-2 text-lg font-semibold">Service Unavailable</h2>
                        </div>
                        <p className="mt-2">Unfortunately, PDF generation is currently unavailable. Please download your document in DOCX format.</p>
                        <button 
                            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
                            onClick={() => setShowPrintModal(false)}
                        >
                            Okay
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default GeneratedCV;