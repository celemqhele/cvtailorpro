
import saveAs from "file-saver";
import { asBlob } from "html-docx-js-typescript";

/**
 * Generates a DOCX Blob from HTML content.
 * Uses html-docx-js-typescript to preserve visual fidelity from the preview.
 */
export const createHtmlToDocxBlob = async (htmlContent: string): Promise<Blob | null> => {
    try {
        // Wrap the partial HTML in a full standard HTML document structure for the converter
        // We inject the base font styles to ensure defaults match
        const fullHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.4; }
                    h1, h2, h3 { color: #2c3e50; }
                    table { width: 100%; border-collapse: collapse; }
                    td { vertical-align: top; }
                </style>
            </head>
            <body>
                ${htmlContent}
            </body>
            </html>
        `;

        const blob = await asBlob(fullHtml, {
            orientation: 'portrait',
            margins: { top: 720, right: 720, bottom: 720, left: 720 } // twips (1440 twips = 1 inch). 720 = 0.5 inch (approx)
        });
        
        return blob as Blob;
    } catch (error) {
        console.error("HTML to DOCX conversion failed:", error);
        return null;
    }
};

export const generateWordDocument = async (
  filename: string,
  elementId: string
) => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error("Content element not found");
        return;
    }

    const htmlContent = element.innerHTML;
    const blob = await createHtmlToDocxBlob(htmlContent);

    if (blob) {
        saveAs(blob, filename.replace(/\.(txt|md)$/, '.docx'));
    } else {
        alert("Failed to generate Word document.");
    }
};

export const createWordBlob = async (elementId: string): Promise<Blob | null> => {
     const element = document.getElementById(elementId);
     if (!element) return null;
     return createHtmlToDocxBlob(element.innerHTML);
};
