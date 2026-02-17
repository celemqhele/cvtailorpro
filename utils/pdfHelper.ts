

import { CLOUDCONVERT_KEY, CLOUDCONVERT_KEY_BACKUP } from "../constants";

// Helper function to perform the actual API call for a specific key
const performCloudConvertRequest = async (htmlContent: string, apiKey: string): Promise<Blob> => {
    // 1. Create Job
    const createJobRes = await fetch('https://api.cloudconvert.com/v2/jobs', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "tasks": {
                "import-html": {
                    "operation": "import/raw",
                    "file": htmlContent,
                    "filename": "cv.html"
                },
                "convert-to-pdf": {
                    "operation": "convert",
                    "input": "import-html",
                    "output_format": "pdf",
                    "engine": "chrome",
                    "engine_version": "143",
                    "pixel_density": 300,
                    "print_background": true
                },
                "export-pdf": {
                    "operation": "export/url",
                    "input": "convert-to-pdf",
                    "inline": false,
                    "archive_multiple_files": false
                }
            }
        })
    });

    if (!createJobRes.ok) {
        const errText = await createJobRes.text();
        throw new Error(`CloudConvert Init Error: ${createJobRes.status} - ${errText}`);
    }

    const jobData = await createJobRes.json();
    const jobId = jobData.data.id;

    // 2. Poll for Completion
    let status = jobData.data.status;
    let exportUrl = null;

    // Timeout safety
    const startTime = Date.now();
    
    while (status !== 'finished' && status !== 'error') {
        if (Date.now() - startTime > 60000) { // 60s timeout
             throw new Error("CloudConvert Timed Out");
        }

        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
        
        const checkRes = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        
        if (!checkRes.ok) {
             throw new Error("Failed to check job status");
        }

        const checkData = await checkRes.json();
        status = checkData.data.status;

        if (status === 'finished') {
            const tasks = checkData.data.tasks;
            const exportTask = tasks.find((t: any) => t.name === 'export-pdf');
            if (exportTask && exportTask.result && exportTask.result.files && exportTask.result.files.length > 0) {
                exportUrl = exportTask.result.files[0].url;
            }
        }
    }

    if (status === 'error' || !exportUrl) {
        throw new Error("CloudConvert Processing Failed or No URL returned");
    }

    // 3. Download the PDF Blob
    const pdfRes = await fetch(exportUrl);
    if (!pdfRes.ok) throw new Error("Failed to download PDF result");
    return await pdfRes.blob();
};

/**
 * Generates a PDF using the CloudConvert API v2.
 * Attempts to use the primary key first, then falls back to backup key.
 */
export const createPdfBlob = async (elementId: string): Promise<Blob | null> => {
    const element = document.getElementById(elementId);
    if (!element) return null;

    // Prepare HTML with embedded styles for CloudConvert
    // We explicitly include Tailwind CDN to ensure proper rendering in their Chrome engine
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
             /* Hide the gray page break lines from the UI preview */
             .cv-preview-background { background: none !important; }
             /* Ensure no-break classes are respected */
             .no-break { page-break-inside: avoid; break-inside: avoid; }
             /* Reset transform scaling */
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

    // Define keys strategy: Try primary, then backup
    const keys = [CLOUDCONVERT_KEY, CLOUDCONVERT_KEY_BACKUP];

    for (let i = 0; i < keys.length; i++) {
        const apiKey = keys[i];
        try {
            console.log(`Requesting PDF from CloudConvert (Key ${i + 1})...`);
            const blob = await performCloudConvertRequest(htmlContent, apiKey);
            console.log("PDF generated successfully.");
            return blob;
        } catch (error) {
            console.warn(`CloudConvert Key ${i + 1} failed:`, error);
            // If this was the last key, log error and fail gracefully
            if (i === keys.length - 1) {
                console.error("All CloudConvert keys failed.");
            }
        }
    }

    // Return null to signal failure to the UI
    return null;
};

/**
 * Legacy alias.
 */
export const generatePdfFromApi = createPdfBlob;