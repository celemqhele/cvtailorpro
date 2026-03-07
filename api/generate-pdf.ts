import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { Buffer } from 'buffer';

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
    
    if (!executablePath) {
      console.error('Chromium executable path not found');
      // Fallback for local development if needed, but on Vercel this is fatal
    }

    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: executablePath || undefined,
      headless: true, 
    });

    const page = await browser.newPage();
    
    // Set content and wait for it to be loaded
    // Using networkidle2 and a shorter timeout to avoid Vercel 10s limit
    await page.setContent(html, { 
      waitUntil: 'networkidle2',
      timeout: 7000 
    });

    // Small extra wait for fonts/styles to settle
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
    });

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Generated PDF is empty');
    }

    // Ensure we are sending a Buffer for binary compatibility
    const finalBuffer = Buffer.from(pdfBuffer);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', finalBuffer.length);
    res.setHeader('Content-Disposition', 'attachment; filename=cv.pdf');
    return res.send(finalBuffer);

  } catch (error: any) {
    console.error('PDF Generation Error (Puppeteer):', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}
