
/**
 * Generates a PDF using the Vercel Serverless Function (Puppeteer).
 * This ensures high-fidelity rendering identical to Chrome's print-to-pdf.
 */
export const createPdfBlob = async (elementId: string): Promise<Blob | null> => {
    const element = document.getElementById(elementId);
    if (!element) return null;

    // 1. Prepare Full HTML
    // We explicitly include the Google Fonts link so the serverless browser can download them.
    // CSS overrides ensure 1:1 scaling and remove the background grid.
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
             /* Reset & Basics */
             body { margin: 0; padding: 0; font-family: 'Arial', sans-serif; -webkit-font-smoothing: antialiased; background: white; width: 794px; overflow: hidden; }
             * { box-sizing: border-box; }
             
             /* Hide the gray page break lines from the UI preview */
             .cv-preview-background { background: none !important; }
             
             /* Ensure no-break classes are respected by Puppeteer */
             .no-break { page-break-inside: avoid; break-inside: avoid; }
             
             /* Reset any transform scaling from the preview to force 1:1 print output */
             .cv-absolute-container { transform: none !important; margin: 0 auto !important; width: 100% !important; height: auto !important; box-shadow: none !important; }
        </style>
    </head>
    <body>
        ${element.innerHTML}
    </body>
    </html>
    `;

    try {
        // 2. Call API
        // Note: '/api/generate-pdf' will work on Vercel production.
        // Locally, you must use `vercel dev` to test this, as standard `vite` doesn't handle /api routes.
        console.log("Requesting PDF from Serverless Function...");
        
        const response = await fetch('/api/generate-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ html: htmlContent })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Server Error: ${response.status} - ${err}`);
        }

        return await response.blob();

    } catch (error) {
        console.error("Serverless PDF generation failed:", error);
        alert("PDF Generation failed. If you are running locally, ensure you are using 'vercel dev'. Otherwise, please try again.");
        return null;
    }
};

/**
 * Legacy/Fallback alias. Both now point to the robust Serverless method.
 */
export const generatePdfFromApi = createPdfBlob;
