import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { html } = req.body;

  if (!html) {
    return res.status(400).json({ error: 'Missing HTML content' });
  }

  let browser = null;

  try {
    // Basic configuration for Vercel / Serverless
    const executablePath = await chromium.executablePath();
    
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: executablePath,
      headless: true, 
    });

    const page = await browser.newPage();
    
    // Set content and wait for it to be loaded
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px',
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=cv.pdf');
    return res.send(pdfBuffer);

  } catch (error: any) {
    console.error('PDF Generation Error (Puppeteer):', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}
