import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export const generateScannedPdf = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error("Element not found:", elementId);
    return;
  }

  // Create canvas from element (converts text to image)
  const canvas = await html2canvas(element, {
    scale: 2, // Improve resolution
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff'
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.9);
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  // First page
  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
  heightLeft -= pdfHeight;

  // Subsequent pages if content overflows A4
  while (heightLeft > 0) {
    position = heightLeft - imgHeight; // This positioning logic for multipage images in jspdf is tricky, usually simpler to just slice
    // Simplified multipage approach for image-based PDFs often just puts the next slice on a new page
    // However, exact slicing is complex. 
    // For this use case, we will add pages and shift the image up, masking the rest.
    pdf.addPage();
    // Shift image up by page height * page number
    pdf.addImage(imgData, 'JPEG', 0, -(imgHeight - heightLeft), imgWidth, imgHeight); 
    heightLeft -= pdfHeight;
  }

  pdf.save(filename.replace(/\.(docx|txt|md)$/, '.pdf'));
};

export const generateSelectablePdf = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // jsPDF html method requires the element to be visible, but we can use the hidden container
    // We create a new instance with points as unit for better HTML mapping
    const doc = new jsPDF('p', 'pt', 'a4');
    
    // Approx A4 width in points is 595.28
    const margin = 30;
    const docWidth = 595.28 - (margin * 2);

    await doc.html(element, {
        callback: function(pdf) {
            pdf.save(filename.replace(/\.(docx|txt|md)$/, '.pdf'));
        },
        x: margin,
        y: margin,
        width: docWidth, 
        windowWidth: 800, // Important for layout calculation
        autoPaging: 'text'
    });
};