import * as docx from "docx";
import saveAs from "file-saver";

export const generateWordDocument = async (
  filename: string,
  textContent: string,
  brandingImageBase64?: string
) => {
  if (!textContent) {
    console.error("Document content is missing or empty.");
    return;
  }

  const { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, AlignmentType, BorderStyle } = docx;

  const lines = textContent.split('\n');
  const children: (docx.Paragraph | docx.ImageRun)[] = [];

  // 1. Add Branding Image (Header Design)
  if (brandingImageBase64) {
    try {
      const imageBuffer = Uint8Array.from(atob(brandingImageBase64), c => c.charCodeAt(0));
      const image = new ImageRun({
        data: imageBuffer,
        transformation: {
          width: 600, // Header width
          height: 150,
        },
      });
      children.push(new Paragraph({
        children: [image],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 } // Space after header image
      }));
    } catch (e) {
      console.error("Failed to add image to doc", e);
    }
  }

  // 2. Parse Markdown Content into Styled Word Elements
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
        // Add a small spacer
        children.push(new Paragraph({ text: "", spacing: { after: 100 } })); 
        continue;
    }

    // Main Title (H1) - e.g. Candidate Name
    if (line.startsWith('# ')) {
      children.push(new Paragraph({
        text: line.replace('# ', '').toUpperCase(),
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 200 },
        border: {
          bottom: {
            color: "2E74B5", // Professional Blue
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6,
          }
        }
      }));
    } 
    // Section Headers (H2) - e.g. EXPERIENCE, EDUCATION
    else if (line.startsWith('## ')) {
      children.push(new Paragraph({
        text: line.replace('## ', '').toUpperCase(),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
        border: {
             bottom: {
                 color: "A0A0A0", // Light Grey
                 space: 1,
                 style: BorderStyle.SINGLE,
                 size: 4,
             },
         },
      }));
    } 
    // Sub-headers (H3) - e.g. Job Titles
    else if (line.startsWith('### ')) {
      children.push(new Paragraph({
        children: [new TextRun({
          text: line.replace('### ', ''),
          bold: true,
          size: 24, // 12pt
          color: "333333"
        })],
        spacing: { before: 200, after: 50 }
      }));
    } 
    // Bullet Points
    else if (line.startsWith('•') || line.startsWith('- ') || line.startsWith('* ')) {
      const cleanLine = line.replace(/^[•\-*]\s+/, '');
      
      // Handle bolding inside bullets (e.g. **Category**: Skills)
      const parts = cleanLine.split(/(\*\*.*?\*\*)/);
      const runs = parts.map(part => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return new TextRun({
                text: part.replace(/\*\*/g, ''),
                bold: true,
                color: "2E74B5" // Apply brand blue color to bold parts in bullets (Core Competencies)
            });
        }
        return new TextRun({ text: part });
      });

      children.push(new Paragraph({
        children: runs,
        bullet: {
          level: 0
        },
        spacing: { after: 50 }
      }));
    } 
    // Normal Text
    else {
      // Bold text detection for "Label: Value" patterns or **bold**
      const boldParts = line.split(/(\*\*.*?\*\*)/);
      const runs = boldParts.map(part => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return new TextRun({
                text: part.replace(/\*\*/g, ''),
                bold: true,
                color: "2E74B5" // Highlight key terms in blue
            });
        }
        return new TextRun({ text: part });
      });

      children.push(new Paragraph({
        children: runs,
        spacing: { after: 120 },
        alignment: AlignmentType.JUSTIFIED
      }));
    }
  }

  // 3. Document Styles Definition
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri", // Professional Sans-Serif
            size: 22, // 11pt
            color: "000000",
          },
          paragraph: {
            spacing: { line: 276 }, // 1.15 line spacing
          },
        },
        heading1: {
          run: {
            font: "Calibri",
            size: 48, // 24pt
            bold: true,
            color: "2E74B5",
          },
        },
        heading2: {
          run: {
            font: "Calibri",
            size: 28, // 14pt
            bold: true,
            color: "2E74B5", // Professional Blue
            allCaps: true,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename.replace('.txt', '.docx').replace('.md', '.docx'));
};