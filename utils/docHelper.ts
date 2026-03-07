
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
                    table { width: 100%; border-collapse: collapse; margin-bottom: 0 !important; }
                    td { vertical-align: top; padding: 0 !important; }
                    /* Fix centering */
                    header { text-align: center !important; }
                    h1 { text-align: center !important; }
                    .header-title { text-align: center !important; }
                    /* Fix spacing */
                    h1, h2, h3, h4, p { margin-top: 0 !important; margin-bottom: 4px !important; }
                    .experience-item table { margin-bottom: 0 !important; }
                    ul { margin-top: 0 !important; margin-bottom: 0 !important; padding-left: 20px !important; }
                    li { margin-bottom: 2px !important; margin-top: 0 !important; }
                    .experience-item { margin-bottom: 10px !important; }
                </style>
            </head>
            <body>
                ${htmlContent}
            </body>
            </html>
        `;

        const blob = await asBlob(fullHtml, {
            orientation: 'portrait',
            margins: { top: 600, right: 600, bottom: 600, left: 600 } // 600 twips is approx 40px (40/96 * 1440)
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
