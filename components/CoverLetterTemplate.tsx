import React from 'react';
import { CVData } from '../types';

interface CoverLetterTemplateProps {
  content: string;
  userData: CVData;
}

const CoverLetterTemplate: React.FC<CoverLetterTemplateProps> = ({ content, userData }) => {
  // Styles based on MEASUREMENTS_SPEC for A4/Letter consistency
  const styles = {
    container: {
      width: '816px', // US Letter width at 96 DPI
      minHeight: '1056px',
      margin: '0 auto',
      padding: '72px', // 0.75 inch margin
      fontFamily: '"Times New Roman", Times, serif',
      fontSize: '12pt',
      lineHeight: '1.5',
      color: '#000000',
      backgroundColor: 'white',
      boxSizing: 'border-box' as const,
      textAlign: 'left' as const,
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
      textAlign: 'justify' as const,
      whiteSpace: 'pre-wrap' as const, // Preserves AI generated newlines
    }
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
    <div className="cv-absolute-container" style={styles.container}>
      {/* Consistent Header with CV */}
      <div style={styles.header}>
        <div style={styles.name}>{userData.name}</div>
        <div style={styles.contactInfo}>
          {contactParts.join(' | ')}
        </div>
      </div>

      {/* Main Content (Date, Recipient, Body, Sign-off) */}
      <div style={styles.body}>
        {content}
      </div>
    </div>
  );
};

export default CoverLetterTemplate;