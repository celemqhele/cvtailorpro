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

    // Try CloudConvert keys in order
    for (const apiKey of keys) {
      try {
        const pdfBuffer = await generateWithCloudConvert(html, apiKey);
        response.setHeader('Content-Type', 'application/pdf');
        response.setHeader('Content-Disposition', 'attachment; filename=cv.pdf');
        return response.send(pdfBuffer);
      } catch (error: any) {
        console.warn(`CloudConvert key failed:`, error.message);
        continue;
      }
    }

    // Final fallback: Puppeteer
    console.log('All CloudConvert keys exhausted, falling back to Puppeteer');
    const pdfBuffer = await generateWithPuppeteer(html);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', 'attachment; filename=cv.pdf');
    return response.send(pdfBuffer);

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
  const uploadTask = jobData.data.tasks.find((t: any) => t.name === 'import-html');

  if (!uploadTask?.result?.form) {
    throw new Error('Failed to get upload URL');
  }

  const uploadFormData = new FormData();
  Object.entries(uploadTask.result.form.parameters).forEach(([key, value]) => {
    uploadFormData.append(key, value as string);
  });
  uploadFormData.append('file', new Blob([html], { type: 'text/html' }), 'input.html');

  const uploadResponse = await fetch(uploadTask.result.form.url, {
    method: 'POST',
    body: uploadFormData,
  });

  if (!uploadResponse.ok) {
    throw new Error('Failed to upload HTML');
  }

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

  if (jobStatus.status === 'error') throw new Error('Job failed');
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

  await chromium.default.font(
    'https://raw.githack.com/googlefonts/noto-emoji/main/fonts/NotoColorEmoji.ttf'
  );

  const browser = await puppeteer.default.launch({
    args: chromium.default.args,
    defaultViewport: chromium.default.defaultViewport,
    executablePath: await chromium.default.executablePath(),
    headless: chromium.default.headless,
    ignoreHTTPSErrors: true,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
  await page.setContent(html, {
    waitUntil: ['networkidle0', 'domcontentloaded'],
  });

  await page.evaluateHandle('document.fonts.ready');

  const pdfBuffer = await page.pdf({
    printBackground: true,
    width: '794px',
    height: '1123px',
    margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
  });

  await browser.close();
  return pdfBuffer;
}