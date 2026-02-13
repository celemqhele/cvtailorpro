
import { jsPDF } from "jspdf";
import { HTML2PDF_KEY } from "../constants";

/**
 * Generates a PDF using client-side rendering with Selectable Text (Vector PDF).
 * This uses jsPDF's .html() method which maps DOM nodes to PDF commands.
 */
export const createPdfBlob = async (elementId: string): Promise<Blob | null> => {
    const element = document.getElementById(elementId) as HTMLElement;
    if (!element) return null;

    try {
        // 1. Initialize PDF (A4: 595.28pt x 841.89pt)
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4'
        });

        // 2. Calculations
        // The CV Template is now designed at 794px width (approx 210mm at 96 DPI).
        // PDF A4 width is 595.28pt.
        const srcWidth = 794;
        const destWidth = 595.28; 
        
        // 3. Generate Vector PDF
        await new Promise<void>((resolve) => {
            pdf.html(element, {
                callback: (doc) => {
                    resolve();
                },
                x: 0,
                y: 0,
                // Setting width and windowWidth lets jsPDF auto-calculate the scale
                width: destWidth, 
                windowWidth: srcWidth, 
                autoPaging: 'text',
                html2canvas: {
                    // Removed explicit 'scale' to allow jsPDF to calculate it based on width/windowWidth.
                    // letterRendering: false prevents character overlap/kerning issues.
                    letterRendering: false,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                },
                margin: 0
            });
        });

        return pdf.output('blob');

    } catch (error) {
        console.error("Client-side PDF generation failed:", error);
        return null;
    }
};

/**
 * Generates a PDF using the external APIs for high-fidelity rendering.
 * Strategy: Primary API (html2pdf.app) -> Client-side Fallback.
 * Removed CustomJS due to configuration requirements.
 */
export const generatePdfFromApi = async (elementId: string): Promise<Blob | null> => {
    const element = document.getElementById(elementId);
    if (!element) return null;

    // Construct full HTML for the API
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
             body { margin: 0; padding: 0; font-family: 'Arial', sans-serif; background: white; }
             h1, h2, h3, h4, h5, h6 { margin: 0; font-weight: bold; }
             ul { margin: 0; padding-left: 1.2em; }
             li { margin-bottom: 0.2em; }
             /* Ensure page breaks are respected in external API too */
             .no-break { page-break-inside: avoid; break-inside: avoid; }
        </style>
    </head>
    <body>
        ${element.innerHTML}
    </body>
    </html>
    `;

    // 1. Attempt Primary API (html2pdf.app)
    try {
        console.log("Attempting PDF generation via Primary API...");
        const response = await fetch('https://api.html2pdf.app/v1/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${HTML2PDF_KEY}`
            },
            body: JSON.stringify({
                html: htmlContent,
                apiKey: HTML2PDF_KEY, 
                settings: {
                    format: 'A4',
                    landscape: false,
                    margin: { top: 0, right: 0, bottom: 0, left: 0 },
                    scale: 1,
                    printBackground: true
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Primary API Error: ${response.status}`);
        }

        return await response.blob();
    } catch (e) {
        console.warn("Primary API failed, falling back to client-side generation.", e);
        
        // 2. Fallback to Client-Side (jsPDF)
        return createPdfBlob(elementId);
    }
};
