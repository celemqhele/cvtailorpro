
/* eslint-disable no-undef */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { htmlContent } = req.body;
  if (!htmlContent) {
    return res.status(400).json({ error: 'Missing htmlContent' });
  }

  const keys = [process.env.CLOUDCONVERT_KEY, process.env.CLOUDCONVERT_KEY_BACKUP].filter(Boolean);

  if (keys.length === 0) {
    return res.status(500).json({ error: 'CloudConvert keys not configured' });
  }

  for (const apiKey of keys) {
    try {
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
        throw new Error(`CloudConvert Init Error: ${createJobRes.status}`);
      }

      const jobData = await createJobRes.json();
      const jobId = jobData.data.id;

      // 2. Poll for Completion
      let status = jobData.data.status;
      let exportUrl = null;
      const startTime = Date.now();
      
      while (status !== 'finished' && status !== 'error') {
        if (Date.now() - startTime > 60000) throw new Error("CloudConvert Timed Out");
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const checkRes = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const checkData = await checkRes.json();
        status = checkData.data.status;

        if (status === 'finished') {
          const exportTask = checkData.data.tasks.find(t => t.name === 'export-pdf');
          exportUrl = exportTask?.result?.files?.[0]?.url;
        }
      }

      if (status === 'error' || !exportUrl) throw new Error("CloudConvert Processing Failed");

      // 3. Get the PDF
      const pdfRes = await fetch(exportUrl);
      const pdfBuffer = await pdfRes.arrayBuffer();

      res.setHeader('Content-Type', 'application/pdf');
      return res.send(global.Buffer.from(pdfBuffer));

    } catch (error) {
      console.warn("CloudConvert attempt failed in backend:", error.message);
    }
  }

  return res.status(503).json({ error: 'All CloudConvert keys failed' });
}
