
import React from 'react';
import { CVData } from '../types';

interface CVTemplateProps {
  data: CVData;
}

const CVTemplate: React.FC<CVTemplateProps> = ({ data }) => {
  // Inline styles with absolute measurements based on MEASUREMENTS_SPEC.md
  // 96 DPI Standard: 1px = 1/96 inch
  const styles = {
    container: {
      width: '816px', // 8.5 inches at 96 DPI (US Letter)
      minHeight: '1056px', // 11 inches (Minimum height)
      margin: '0 auto',
      padding: '72px', // 0.75 inches
      fontFamily: 'Calibri, Arial, sans-serif',
      fontSize: '11px',
      lineHeight: '1.4', // Unitless for better inheritance
      color: '#1a1a1a',
      backgroundColor: 'white',
      boxSizing: 'border-box' as const,
    },
    header: {
      textAlign: 'center' as const,
      marginBottom: '24px',
      paddingBottom: '16px',
      borderBottom: '2px solid #2c3e50',
    },
    name: {
      fontSize: '24px',
      fontWeight: '700',
      letterSpacing: '0.5px',
      margin: '0 0 4px 0',
      textTransform: 'uppercase' as const,
      color: '#1a1a1a',
    },
    title: {
      fontSize: '13px',
      fontWeight: '600',
      color: '#2c3e50',
      marginBottom: '8px',
    },
    contact: {
      fontSize: '10px',
      color: '#4a4a4a',
      marginTop: '8px',
      textAlign: 'center' as const,
    },
    separator: {
      margin: '0 8px',
      color: '#999999',
    },
    section: {
      marginBottom: '20px',
    },
    sectionTitle: {
      fontSize: '13px',
      fontWeight: '700',
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
      color: '#2c3e50',
      margin: '0 0 12px 0',
      paddingBottom: '4px',
      borderBottom: '1.5px solid #95a5a6',
    },
    summaryText: {
      margin: '0',
      textAlign: 'justify' as const,
      lineHeight: '1.5',
    },
    skillsGrid: {
      display: 'block',
    },
    skillItem: {
      lineHeight: '1.5',
      marginBottom: '8px',
      display: 'block'
    },
    skillCategory: {
      color: '#2c3e50',
      fontWeight: '600',
    },
    experienceItem: {
      marginBottom: '20px',
    },
    jobHeader: {
      marginBottom: '8px',
      width: '100%',
      borderCollapse: 'collapse' as const,
    },
    jobTitle: {
      fontSize: '12px',
      fontWeight: '700',
      margin: '0',
      color: '#1a1a1a',
      textAlign: 'left' as const,
    },
    jobDates: {
      fontSize: '10px',
      fontWeight: '600',
      color: '#555555',
      whiteSpace: 'nowrap' as const,
      textAlign: 'right' as const,
      verticalAlign: 'top' as const,
    },
    companyName: {
      fontSize: '11px',
      fontWeight: '600',
      color: '#2c3e50',
      fontStyle: 'italic',
      marginTop: '2px',
    },
    achievementsList: {
      margin: '8px 0 0 20px',
      padding: '0',
      listStyleType: 'disc',
    },
    achievementItem: {
      marginBottom: '5.6px',
      lineHeight: '1.5',
    },
    educationItem: {
      marginBottom: '8px',
      lineHeight: '1.5',
    },
  };

  // Contact Info Parts
  const contactInfo = [
    data.location,
    data.phone,
    data.email,
    data.linkedin && (
      <a 
        key="linkedin" 
        href={data.linkedin} 
        target="_blank" 
        rel="noopener noreferrer" 
        style={{ color: '#4a4a4a', textDecoration: 'none' }}
      >
        {data.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, 'in/')}
      </a>
    )
  ].filter(Boolean);

  return (
    <div className="cv-absolute-container" style={styles.container}>
      {/* Header Section */}
      <header style={styles.header}>
        <h1 style={styles.name}>{data.name}</h1>
        <div style={styles.title}>{data.title}</div>
        <div style={styles.contact}>
           {contactInfo.map((item, index) => (
              <span key={index}>
                {item}
                {index < contactInfo.length - 1 && <span style={styles.separator}>|</span>}
              </span>
           ))}
        </div>
      </header>

      {/* Professional Summary */}
      {data.summary && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>PROFESSIONAL SUMMARY</h2>
          <p style={styles.summaryText}>{data.summary}</p>
        </section>
      )}

      {/* Core Competencies */}
      {data.skills && data.skills.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>CORE COMPETENCIES</h2>
          <div style={styles.skillsGrid}>
            {data.skills.map((skill, index) => (
              <div key={index} style={styles.skillItem}>
                <span style={styles.skillCategory}>{skill.category}:</span> {skill.items}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Professional Experience */}
      {data.experience && data.experience.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>PROFESSIONAL EXPERIENCE</h2>
          {data.experience.map((job, index) => (
            <div key={index} style={styles.experienceItem}>
              {/* Use Table for Title/Date alignment to support DOCX conversion better than Flexbox */}
              <table style={styles.jobHeader}>
                <tbody>
                  <tr>
                    <td style={{ verticalAlign: 'top' }}>
                      <h3 style={styles.jobTitle}>{job.title}</h3>
                      <div style={styles.companyName}>{job.company}</div>
                    </td>
                    <td style={styles.jobDates}>
                      {job.dates}
                    </td>
                  </tr>
                </tbody>
              </table>
              <ul style={styles.achievementsList}>
                {job.achievements.map((achievement, i) => (
                  <li key={i} style={styles.achievementItem}>{achievement}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {/* Key Achievements */}
      {data.keyAchievements && data.keyAchievements.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>KEY ACHIEVEMENTS</h2>
          <ul style={styles.achievementsList}>
            {data.keyAchievements.map((achievement, index) => (
              <li key={index} style={styles.achievementItem}>{achievement}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Education */}
      {data.education && data.education.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>EDUCATION</h2>
          {data.education.map((edu, index) => (
            <div key={index} style={styles.educationItem}>
              <strong>{edu.degree}</strong>
              {edu.institution && <span> — {edu.institution}</span>}
              {edu.year && <span> ({edu.year})</span>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
};

export default CVTemplate;
