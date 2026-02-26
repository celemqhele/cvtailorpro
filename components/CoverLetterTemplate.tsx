
import React from 'react';
import { CVData } from '../types';

interface CoverLetterTemplateProps {
  content: string;
  userData: CVData;
  isEditable?: boolean;
  onUpdate?: (newContent: string) => void;
}

const CoverLetterTemplate: React.FC<CoverLetterTemplateProps> = ({ content, userData, isEditable = false, onUpdate }) => {
  // Styles based on MEASUREMENTS_SPEC for A4/Letter consistency
  const styles = {
    container: {
      width: '794px', // A4 width at 96 DPI
      minHeight: '1123px', // A4 height at 96 DPI
      margin: '0 auto',
      padding: '60px', // Approx 20mm margin
      fontFamily: '"Times New Roman", Times, serif',
      fontSize: '12pt',
      lineHeight: '1.5',
      color: '#000000',
      backgroundColor: 'white',
      boxSizing: 'border-box' as const,
      textAlign: 'left' as const,
      outline: isEditable ? '2px dashed #10b981' : 'none',
    },
    header: {
      textAlign: 'center' as const,
      marginBottom: '32px',
      borderBottom: '1px solid #000',
      paddingBottom: '16px',
    },
    name: {
      fontSize: '20pt',
      fontWeight: 'bold',
      marginBottom: '4px',
      textTransform: 'uppercase' as const,
    },
    contactInfo: {
      fontSize: '10pt',
      color: '#333',
    },
    body: {
      textAlign: 'left' as const, // Changed from justify to left to prevent PDF artifacts
      outline: 'none',
    },
    paragraph: {
      marginBottom: '12pt', // Distinct paragraph spacing for Word/PDF
      minHeight: '12pt', // Ensures empty lines are preserved
    }
  };

  const handleBlur = (newContent: string) => {
    if (onUpdate) onUpdate(newContent);
  };

  // Check valid LinkedIn
  const hasLinkedIn = userData.linkedin && userData.linkedin !== 'null' && userData.linkedin.trim() !== '';

  const contactParts = [
    userData.location,
    userData.phone,
    userData.email,
    hasLinkedIn ? userData.linkedin?.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, 'in/') : null
  ].filter(Boolean);

  return (
    <div className={`cv-absolute-container cv-preview-background ${isEditable ? 'master-edit-active' : ''}`} style={styles.container}>
      {/* Consistent Header with CV */}
      <div style={styles.header}>
        <div style={styles.name}>{userData.name}</div>
        <div style={styles.contactInfo}>
          {contactParts.join(' | ')}
        </div>
      </div>

      {/* Main Content (Date, Recipient, Body, Sign-off) */}
      <div 
        style={styles.body} 
        contentEditable={isEditable} 
        suppressContentEditableWarning 
        onBlur={(e) => handleBlur(e.currentTarget.innerText)}
      >
        {content.split('\n').map((line, index) => (
          <div key={index} style={styles.paragraph}>
            {line.trim() === '' ? '\u00A0' : line}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CoverLetterTemplate;
