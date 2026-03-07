/** Updated: 2026-03-07 */
/** Pagination fix - section breaks and top margin on continuation pages */
// Helper function to perform the actual API call via backend proxy
const performPdfGenerationRequest = async (html: string): Promise<Blob> => {
    // Try the new Puppeteer-based generator first
    try {
        const response = await fetch("/api/generate-pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ html })
        });
        
        if (response.ok) {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/pdf")) {
                return await response.blob();
            }
            const errText = await response.text();
            console.warn("Puppeteer returned non-PDF response:", errText);
        } else {
            const errData = await response.json().catch(() => ({ error: "Unknown error" }));
            console.warn("Puppeteer PDF generation failed:", errData.error);
        }
    } catch (e) {
        console.warn("Puppeteer PDF generation error:", e);
    }

    // Fallback to CloudConvert proxy
    const response = await fetch("/api/pdf-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html })
    });
    
    if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/pdf")) {
            return await response.blob();
        }
        throw new Error("CloudConvert returned non-PDF response");
    }
    
    const err = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(`PDF Proxy Error: ${err.error}`);
};

/**
 * Generates a PDF using the backend proxy.
 */
export const createPdfBlob = async (elementId: string): Promise<Blob | null> => {
    const element = document.getElementById(elementId);
    if (!element) return null;

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
                line-height: 1.5;
             }
             
             a { color: inherit !important; text-decoration: none !important; }
             
             * { box-sizing: border-box; }
             
             .cv-preview-background { background: none !important; }
             
             .cv-absolute-container { 
                transform: none !important; 
                margin: 0 !important; 
                width: 100% !important; 
                height: auto !important; 
                box-shadow: none !important; 
                border: none !important;
             }
             
             * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
             
             @page {
                 size: A4;
                 margin: 40px;
             }
             
             .pdf-page-wrapper {
                background: white;
                width: 100%;
             }

             /* Headings should not be left orphaned at bottom of a page */
             h1, h2, h3 { 
                page-break-after: avoid; 
                break-after: avoid; 
                margin-top: 20px;
             }
             
             /* Sections can break between items, but not inside an item */
             .section-container { 
                page-break-inside: auto; 
                break-inside: auto; 
                margin-bottom: 24px; 
             }

             /* Keep section heading glued to whatever follows it */
             h2 + div, h2 + p, h2 + ul, h2 + table {
                break-before: avoid;
                page-break-before: avoid;
             }
             
             /* Individual experience blocks must never split */
             .experience-item {
                page-break-inside: avoid;
                break-inside: avoid;
                margin-bottom: 20px;
                display: block;
             }

             .skill-item, .education-item {
                page-break-inside: avoid;
                break-inside: avoid;
             }

             /* Allow lists to break between items, not inside them */
             ul {
                page-break-inside: auto;
                break-inside: auto;
             }
             
             li {
                page-break-inside: avoid;
                break-inside: avoid;
                margin-bottom: 4px;
             }

             p, div {
                orphans: 3;
                widows: 3;
             }
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
        const blob = await performPdfGenerationRequest(htmlContent);
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