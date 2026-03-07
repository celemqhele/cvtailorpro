/** Updated: 2026-03-06 */
import { Buffer } from 'buffer';

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { html } = request.body;

    if (!html) {
      return response.status(400).json({ error: 'Missing HTML content' });
    }

    const keys: string[] = [
      process.env.CLOUDCONVERT_KEY,
      process.env.CLOUDCONVERT_KEY_BACKUP
    ].filter((key): key is string => typeof key === 'string');

    if (keys.length === 0) {
      return response.status(500).json({ error: 'No CloudConvert API keys configured' });
    }

    // Try Puppeteer first
    try {
      console.log('Attempting PDF generation with Puppeteer...');
      const pdfBuffer = await generateWithPuppeteer(html);
      response.setHeader('Content-Type', 'application/pdf');
      response.setHeader('Content-Disposition', 'attachment; filename=cv.pdf');
      return response.send(pdfBuffer);
    } catch (puppeteerError: any) {
      console.error('Puppeteer failed:', puppeteerError);
      // Continue to CloudConvert fallback
    }

    // Fallback: CloudConvert
    for (const apiKey of keys) {
      try {
        const pdfBuffer = await generateWithCloudConvert(html, apiKey);
        response.setHeader('Content-Type', 'application/pdf');
        response.setHeader('Content-Disposition', 'attachment; filename=cv.pdf');
        return response.send(pdfBuffer);
      } catch (error: any) {
        console.warn(`CloudConvert key failed:`, error.message);
        // If it's a specific error we can't recover from with another key, we might want to log more
        continue;
      }
    }

  } catch (error: any) {
    console.error('PDF Generation Error:', error);
    response.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

async function generateWithCloudConvert(html: string, apiKey: string): Promise<Buffer> {
  const jobResponse = await fetch('https://api.cloudconvert.com/v2/jobs', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tasks: {
        'import-html': {
          operation: 'import/raw',
          file: html,
          filename: 'input.html',
        },
        'convert-to-pdf': {
          operation: 'convert',
          input: 'import-html',
          output_format: 'pdf',
          engine: 'chrome',
          margin_top: 0,
          margin_right: 0,
          margin_bottom: 0,
          margin_left: 0,
          print_background: true,
          display_header_footer: false,
          page_width: 210,
          page_height: 297,
          viewport_width: 794,
        },
        'export-pdf': {
          operation: 'export/url',
          input: 'convert-to-pdf',
        },
      },
    }),
  });

  if (!jobResponse.ok) {
    const errorText = await jobResponse.text();
    throw new Error(`CloudConvert job creation failed: ${errorText}`);
  }

  const jobData = await jobResponse.json();
  let jobStatus = jobData.data;
  let attempts = 0;
  const maxAttempts = 30;

  while (
    jobStatus.status !== 'finished' &&
    jobStatus.status !== 'error' &&
    attempts < maxAttempts
  ) {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const statusResponse = await fetch(
      `https://api.cloudconvert.com/v2/jobs/${jobStatus.id}`,
      {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      }
    );

    if (!statusResponse.ok) throw new Error('Failed to check status');

    jobStatus = (await statusResponse.json()).data;
    attempts++;
  }

  if (jobStatus.status === 'error') {
    const errorTask = jobStatus.tasks.find((t: any) => t.status === 'error');
    throw new Error(`Job failed: ${errorTask?.message || 'Unknown error'}`);
  }
  if (attempts >= maxAttempts) throw new Error('Job timed out');

  const exportTask = jobStatus.tasks.find((t: any) => t.name === 'export-pdf');
  if (!exportTask?.result?.files?.[0]?.url) {
    throw new Error('No download URL');
  }

  const pdfResponse = await fetch(exportTask.result.files[0].url);
  if (!pdfResponse.ok) throw new Error('Failed to download PDF');

  return Buffer.from(await pdfResponse.arrayBuffer());
}

async function generateWithPuppeteer(html: string): Promise<Buffer> {
  const chromium = await import('@sparticuz/chromium');
  const puppeteer = await import('puppeteer-core');

  let browser;
  try {
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || await chromium.default.executablePath();
    
    // If we have an executable path, we can try to launch
    browser = await puppeteer.default.launch({
      args: executablePath ? [...chromium.default.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] : ['--no-sandbox'],
      defaultViewport: chromium.default.defaultViewport,
      executablePath: executablePath,
      headless: chromium.default.headless === 'new' ? 'new' : true,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    // Set a reasonable timeout
    page.setDefaultNavigationTimeout(30000);
    
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
    await page.setContent(html, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
    });

    await page.evaluateHandle('document.fonts.ready');

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
      preferCSSPageSize: true,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
