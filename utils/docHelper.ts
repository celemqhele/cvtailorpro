
import { CLOUDCONVERT_API_KEY } from '../constants';
import saveAs from "file-saver";

/**
 * Generates a DOCX Blob using CloudConvert API.
 */
export const createWordBlob = async (elementId: string): Promise<Blob | null> => {
    const element = document.getElementById(elementId);
    if (!element) return null;

    // Prepare HTML
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.4; color: #000; }
            h1, h2, h3 { color: #2c3e50; }
            table { width: 100%; border-collapse: collapse; }
            td { vertical-align: top; }
            /* Reset preview styles */
            .cv-preview-background { background: none !important; }
            .no-break { page-break-inside: avoid; break-inside: avoid; }
            /* Ensure layout matches print */
            .cv-absolute-container { transform: none !important; margin: 0 auto !important; width: 100% !important; height: auto !important; box-shadow: none !important; }
        </style>
    </head>
    <body>
        ${element.innerHTML}
    </body>
    </html>
    `;

    try {
        console.log("Starting CloudConvert DOCX Job...");
        
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
                    "convert-docx": {
                        "operation": "convert",
                        "input": "import-html",
                        "output_format": "docx",
                        "engine": "pandoc" 
                    },
                    "export-url": {
                        "operation": "export/url",
                        "input": "convert-docx"
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

        // Poll for completion
        let exportUrl = null;
        let attempts = 0;
        const maxAttempts = 60; // 60 seconds timeout

        while (!exportUrl && attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 1000));
            
            const statusRes = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
                headers: { 'Authorization': `Bearer ${CLOUDCONVERT_API_KEY}` }
            });
            
            if (!statusRes.ok) continue;
            
            const statusData = await statusRes.json();
            const job = statusData.data;
            
            if (job.status === 'error') {
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

        const pdfRes = await fetch(exportUrl);
        return await pdfRes.blob();

    } catch (error) {
        console.error("DOCX Generation via CloudConvert failed:", error);
        return null;
    }
};

/**
 * Legacy wrapper for compatibility if needed, though mostly unused now.
 */
export const generateWordDocument = async (filename: string, elementId: string) => {
    const blob = await createWordBlob(elementId);
    if (blob) {
        saveAs(blob, filename.replace(/\.(txt|md|pdf)$/, '') + '.docx');
    } else {
        alert("Failed to generate Word document.");
    }
};
