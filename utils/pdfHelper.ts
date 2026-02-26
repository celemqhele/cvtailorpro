

import { CLOUDCONVERT_KEY, CLOUDCONVERT_KEY_BACKUP } from "../constants";

// Helper function to perform the actual API call via backend proxy
const performCloudConvertRequest = async (htmlContent: string): Promise<Blob> => {
    const response = await fetch("/api/pdf-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ htmlContent })
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
             body { margin: 0; padding: 0; font-family: 'Arial', sans-serif; background: white; -webkit-font-smoothing: antialiased; }
             * { box-sizing: border-box; }
             .cv-preview-background { background: none !important; }
             .no-break { page-break-inside: avoid; break-inside: avoid; }
             .cv-absolute-container { transform: none !important; margin: 0 auto !important; width: 100% !important; height: auto !important; box-shadow: none !important; }
        </style>
    </head>
    <body>
        <div class="p-8">
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