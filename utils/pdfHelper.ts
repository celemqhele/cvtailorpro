

/** Updated: 2026-03-06 */
/** Vercel Build Fix - TS1434 */
// Helper function to perform the actual API call via backend proxy
const performCloudConvertRequest = async (html: string): Promise<Blob> => {
    const response = await fetch("/api/pdf-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`PDF Proxy Error: ${err.error}`);
    }

    return await response.blob();
};

/**
 * Generates a PDF using the backend proxy.
 */
export const createPdfBlob = async (elementId: string): Promise<Blob | null> => {
    const element = document.getElementById(elementId);
    if (!element) return null;

    // Prepare HTML with embedded styles for CloudConvert
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
             @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
             
             body { 
                margin: 0; 
                padding: 0; 
                font-family: 'Inter', sans-serif; 
                background: white; 
                -webkit-font-smoothing: antialiased; 
                color: #1e293b;
             }
             
             * { box-sizing: border-box; }
             
             /* Remove background patterns for PDF */
             .cv-preview-background { background: none !important; }
             
             /* PDF Specific Layout */
             .cv-absolute-container { 
                transform: none !important; 
                margin: 0 !important; 
                width: 100% !important; 
                height: auto !important; 
                box-shadow: none !important; 
                border: none !important;
             }
             
             /* Ensure colors are preserved */
             * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
             
             @page {
                 margin: 0;
                 size: A4;
             }
             
             .pdf-page-wrapper {
                padding: 40px;
                background: white;
                width: 210mm;
             }

             /* Prevent awkward breaks */
             h1, h2, h3 { page-break-after: avoid; break-after: avoid; }
             .section-container { page-break-inside: avoid; break-inside: avoid; margin-bottom: 20px; }
             li { page-break-inside: avoid; break-inside: avoid; }
        </style>
    </head>
    <body>
        <div class="pdf-page-wrapper">
            ${element.innerHTML}
        </div>
    </body>
    </html>
    `;

    try {
        console.log("Requesting PDF from backend proxy...");
        const blob = await performCloudConvertRequest(htmlContent);
        console.log("PDF generated successfully.");
        return blob;
    } catch (error) {
        console.error("PDF generation failed:", error);
        return null;
    }
};

/**
 * Legacy alias.
 */
export const generatePdfFromApi = createPdfBlob;