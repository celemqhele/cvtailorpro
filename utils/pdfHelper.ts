
import { CLOUDCONVERT_KEY } from "../constants";

/**
 * Generates a PDF using the CloudConvert API v2.
 * Uses the updated key with full permissions.
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

    try {
        console.log("Requesting PDF from CloudConvert...");

        // 1. Create Job
        const createJobRes = await fetch('https://api.cloudconvert.com/v2/jobs', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CLOUDCONVERT_KEY}`,
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
            throw new Error(`CloudConvert Init Error: ${createJobRes.status}`);
        }

        const jobData = await createJobRes.json();
        const jobId = jobData.data.id;

        // 2. Poll for Completion
        let status = jobData.data.status;
        let exportUrl = null;

        while (status !== 'finished' && status !== 'error') {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
            
            const checkRes = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
                headers: { 'Authorization': `Bearer ${CLOUDCONVERT_KEY}` }
            });
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
            throw new Error("CloudConvert Processing Failed");
        }

        // 3. Download the PDF Blob
        const pdfRes = await fetch(exportUrl);
        return await pdfRes.blob();

    } catch (error) {
        console.error("CloudConvert Error:", error);
        // Fallback is explicitly disabled per user request.
        // We return null to signal failure, but the UI should handle the messaging.
        return null;
    }
};

/**
 * Legacy alias.
 */
export const generatePdfFromApi = createPdfBlob;
