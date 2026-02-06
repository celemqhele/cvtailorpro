import * as docx from "docx";
import saveAs from "file-saver";

export const generateWordDocument = async (
  filename: string,
  textContent: string,
  brandingImageBase64?: string,
  isWatermarked: boolean = false
) => {
  if (!textContent) {
    console.error("Document content is missing or empty.");
    return;
  }

  const { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, AlignmentType, BorderStyle, Header, Footer } = docx;

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
        spacing: { after: 200 } 
      }));
    } catch (e) {
      console.error("Failed to add image to doc", e);
    }
  }

  // 2. Parse Markdown Content into Styled Word Elements
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
        // Add a very small spacer for empty lines in source, but strictly controlled
        children.push(new Paragraph({ text: "", spacing: { after: 0 } })); 
        continue;
    }

    // Main Title (H1) - e.g. Candidate Name
    if (line.startsWith('# ')) {
      children.push(new Paragraph({
        text: line.replace('# ', '').toUpperCase(),
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 60 }, // Tightened spacing
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
        spacing: { before: 200, after: 60 }, // Tightened spacing
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
        spacing: { before: 120, after: 40 } // Tightened spacing
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
                color: "2E74B5" // Apply brand blue color to bold parts in bullets
            });
        }
        return new TextRun({ text: part });
      });

      children.push(new Paragraph({
        children: runs,
        bullet: {
          level: 0
        },
        spacing: { after: 0 } // No extra space after bullets for tight lists
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
                color: "2E74B5"
            });
        }
        return new TextRun({ text: part });
      });

      children.push(new Paragraph({
        children: runs,
        spacing: { after: 80 }, // Minimal space after paragraphs
        alignment: AlignmentType.JUSTIFIED
      }));
    }
  }

  // Define Headers (Used for Watermark)
  const headers = {
    default: new Header({
        children: isWatermarked ? [
            new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                    new TextRun({
                        text: "UNPAID PREVIEW • CV TAILOR PRO • UNPAID PREVIEW",
                        size: 24,
                        color: "FF0000",
                        bold: true,
                    }),
                ],
                spacing: { after: 200 }
            }),
             new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                    new TextRun({
                        text: "Please upgrade to remove this watermark.",
                        size: 16,
                        color: "808080",
                        italics: true
                    }),
                ],
                border: {
                    bottom: {
                        color: "FF0000",
                        space: 1,
                        style: BorderStyle.SINGLE,
                        size: 6
                    }
                },
                 spacing: { after: 400 }
            })
        ] : []
    })
  };

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
            spacing: { line: 240 }, // Single spacing (approx 1.0) to prevent gaps
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
        headers: headers,
        children: children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filePrefix = isWatermarked ? 'PREVIEW_' : 'TAILORED_';
  saveAs(blob, filePrefix + filename.replace('.txt', '.docx').replace('.md', '.docx'));
};
