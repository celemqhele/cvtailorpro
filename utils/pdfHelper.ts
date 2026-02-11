
import { jsPDF } from "jspdf";
import { HTML2PDF_KEY } from "../constants";

/**
 * Generates a PDF using client-side rendering with Selectable Text (Vector PDF).
 * This uses jsPDF's .html() method which maps DOM nodes to PDF commands.
 * It is superior to html2canvas-only approaches as text remains highlightable.
 */
export const createPdfBlob = async (elementId: string): Promise<Blob | null> => {
    const element = document.getElementById(elementId) as HTMLElement;
    if (!element) return null;

    try {
        // 1. Initialize PDF (US Letter: 612pt x 792pt)
        // 'pt' unit is essential for consistent mapping from CSS px
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'letter'
        });

        // 2. Calculations
        // The CV Template is designed at 816px width (approx 8.5in at 96 DPI).
        // PDF US Letter width is 612pt (8.5in at 72 DPI).
        // We need to scale the content down to fit the PDF coordinate system.
        const srcWidth = 816;
        const destWidth = 612; // 8.5 inches * 72 pt/inch
        const scaleFactor = destWidth / srcWidth; // approx 0.75

        // 3. Generate Vector PDF
        // .html() is async and uses a promise
        await new Promise<void>((resolve) => {
            pdf.html(element, {
                callback: (doc) => {
                    resolve();
                },
                x: 0,
                y: 0,
                width: destWidth, // Target width in PDF units
                windowWidth: srcWidth, // Virtual window width to force correct CSS layout
                autoPaging: 'text', // Better page breaking for text
                html2canvas: {
                    scale: scaleFactor, // Scale the snapshot to fit PDF points
                    useCORS: true,
                    logging: false,
                    letterRendering: true, // Improves text clarity
                },
                margin: 0 // We rely on the CSS padding inside the element
            });
        });

        return pdf.output('blob');

    } catch (error) {
        console.error("Client-side PDF generation failed:", error);
        return null;
    }
};

/**
 * Generates a PDF using the external HTML2PDF API for high-fidelity rendering.
 * Falls back to client-side vector generation if API fails.
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
             body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; background: white; }
             /* Ensure specific template styles are captured */
             h1, h2, h3, h4, h5, h6 { margin: 0; font-weight: bold; }
             ul { margin: 0; padding-left: 1.2em; }
             li { margin-bottom: 0.2em; }
        </style>
    </head>
    <body>
        ${element.innerHTML}
    </body>
    </html>
    `;

    try {
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
                    format: 'Letter',
                    landscape: false,
                    margin: { top: 0, right: 0, bottom: 0, left: 0 },
                    scale: 1,
                    printBackground: true
                }
            })
        });

        if (!response.ok) {
            console.warn(`PDF API Error: ${response.status}, failing over to local.`);
            throw new Error(`PDF API Error: ${response.status}`);
        }

        return await response.blob();
    } catch (e) {
        console.warn("PDF API Generation failed, falling back to client-side", e);
        // Fallback to client-side generation if API fails
        return createPdfBlob(elementId);
    }
};
