
import { CLOUDCONVERT_API_KEY } from '../constants';

/**
 * Generates a PDF using the CloudConvert API.
 * Uses 'import/raw' -> 'convert' -> 'export/url' task flow.
 * Returns a Blob if successful, null if failed (triggering fallback).
 */
export const createPdfBlob = async (elementId: string): Promise<Blob | null> => {
    const element = document.getElementById(elementId);
    if (!element) return null;

    // Prepare HTML with embedded styles for the conversion service
    // We explicitly clear the background grid class to ensure a clean PDF
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
             body { margin: 0; padding: 0; font-family: 'Arial', sans-serif; background: white; -webkit-font-smoothing: antialiased; }
             * { box-sizing: border-box; }
             /* Hide the gray page break lines from the UI preview */
             .cv-preview-background { background: none !important; }
             /* Ensure no-break classes are respected */
             .no-break { page-break-inside: avoid; break-inside: avoid; }
             /* Reset transform scaling */
             .cv-absolute-container { transform: none !important; margin: 0 auto !important; width: 100% !important; height: auto !important; box-shadow: none !important; }
        </style>
    </head>
    <body>
        ${element.innerHTML}
    </body>
    </html>
    `;

    try {
        console.log("Starting CloudConvert Job...");
        
        // 1. Create Job with Tasks
        const jobResponse = await fetch('https://api.cloudconvert.com/v2/jobs', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CLOUDCONVERT_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "tasks": {
                    "import-html": {
                        "operation": "import/raw",
                        "file": htmlContent,
                        "filename": "cv.html"
                    },
                    "convert-pdf": {
                        "operation": "convert",
                        "input": "import-html",
                        "output_format": "pdf",
                        "engine": "chrome",
                        "engine_version": "117",
                        "print_background": true,
                        "display_header_footer": false
                    },
                    "export-url": {
                        "operation": "export/url",
                        "input": "convert-pdf"
                    }
                }
            })
        });

        if (!jobResponse.ok) {
            const errText = await jobResponse.text();
            throw new Error(`CloudConvert API Error: ${errText}`);
        }

        const jobData = await jobResponse.json();
        const jobId = jobData.data.id;

        // 2. Poll for Completion
        let exportUrl = null;
        let attempts = 0;
        const maxAttempts = 40; // Approx 40 seconds wait time

        while (!exportUrl && attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 1000));
            
            const statusRes = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
                headers: { 'Authorization': `Bearer ${CLOUDCONVERT_API_KEY}` }
            });
            
            if (!statusRes.ok) continue;
            
            const statusData = await statusRes.json();
            const job = statusData.data;
            
            if (job.status === 'error') {
                // Log detailed error from tasks if available
                const failedTask = job.tasks.find((t: any) => t.status === 'error');
                const msg = failedTask ? failedTask.message : "Job Failed";
                throw new Error(`CloudConvert Job Failed: ${msg}`);
            }
            
            if (job.status === 'finished') {
                const exportTask = job.tasks.find((t: any) => t.name === 'export-url');
                if (exportTask?.result?.files?.[0]?.url) {
                    exportUrl = exportTask.result.files[0].url;
                }
            }
            attempts++;
        }

        if (!exportUrl) throw new Error("CloudConvert Timed Out");

        // 3. Download the Result
        const pdfRes = await fetch(exportUrl);
        return await pdfRes.blob();

    } catch (error) {
        console.error("PDF Generation via CloudConvert failed:", error);
        // Returning null triggers the client-side window.print() fallback in the UI
        return null;
    }
};

/**
 * Legacy/Fallback alias.
 */
export const generatePdfFromApi = createPdfBlob;
