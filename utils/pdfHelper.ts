
import { jsPDF } from "jspdf";
import { HTML2PDF_KEY } from "../constants";

/**
 * Generates a selectable PDF using the browser's rendering engine (html2canvas internally via jsPDF.html)
 * Fallback or quick preview method.
 */
export const createPdfBlob = async (elementId: string): Promise<Blob | null> => {
    const originalElement = document.getElementById(elementId);
    if (!originalElement) return null;

    const clone = originalElement.cloneNode(true) as HTMLElement;
    clone.style.position = 'absolute';
    clone.style.top = '0';
    clone.style.left = '0';
    clone.style.zIndex = '-1000';
    clone.style.display = 'block';
    clone.id = `${elementId}-clone`;
    
    document.body.appendChild(clone);

    return new Promise((resolve) => {
        const doc = new jsPDF('p', 'pt', 'letter');
        const margin = 0;
        
        const html2canvasOptions = {
            scale: 2,
            useCORS: true,
            logging: false,
            windowWidth: 816
        };

        doc.html(clone, {
            callback: function (pdf) {
                const blob = pdf.output('blob');
                document.body.removeChild(clone);
                resolve(blob);
            },
            x: margin,
            y: margin,
            width: 612, 
            windowWidth: 816, 
            autoPaging: 'text', 
            html2canvas: html2canvasOptions
        });
    });
};

/**
 * Generates a PDF using the external HTML2PDF API for high-fidelity rendering.
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
                apiKey: HTML2PDF_KEY, // Some clients require it in body too
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
            throw new Error(`PDF API Error: ${response.status}`);
        }

        return await response.blob();
    } catch (e) {
        console.error("PDF API Generation failed, falling back to client-side", e);
        // Fallback to client-side generation if API fails
        return createPdfBlob(elementId);
    }
};
