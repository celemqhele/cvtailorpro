
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { html } = request.body;

    if (!html) {
      return response.status(400).json({ error: 'Missing HTML content' });
    }

    // Configure font support for Vercel environment
    await chromium.font('https://raw.githack.com/googlefonts/noto-emoji/main/fonts/NotoColorEmoji.ttf');

    // Launch serverless browser
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    // Set Viewport to match the CV width (794px) exactly
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 1,
    });

    // Set the HTML content
    await page.setContent(html, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
    });

    // CRITICAL: Wait for fonts to be ready to prevent text merging/kerning issues
    await page.evaluateHandle('document.fonts.ready');

    // Generate PDF with EXACT dimensions
    const pdfBuffer = await page.pdf({
      printBackground: true,
      width: '794px', 
      height: '1123px',
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
    });

    await browser.close();

    // Return PDF
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', 'attachment; filename=cv.pdf');
    response.send(pdfBuffer);

  } catch (error) {
    console.error('PDF Generation Error:', error);
    response.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
