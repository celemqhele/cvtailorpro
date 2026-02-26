
import React from 'react';
import { CVData } from '../types';

interface CVTemplateProps {
  data: CVData;
  isEditable?: boolean;
  onUpdate?: (newData: CVData) => void;
}

const CVTemplate: React.FC<CVTemplateProps> = ({ data, isEditable = false, onUpdate }) => {
  // Inline styles with absolute measurements based on MEASUREMENTS_SPEC.md
  // 96 DPI Standard: 1px = 1/96 inch
  const styles = {
    container: {
      width: '794px', // A4 Width at 96 DPI
      minHeight: '1123px', // A4 Height at 96 DPI
      margin: '0 auto',
      padding: '60px', // Approx 20mm margin (Standard A4 margin)
      fontFamily: 'Arial, Helvetica, sans-serif', 
      fontSize: '11px',
      lineHeight: '1.4', // Unitless for better inheritance
      color: '#1a1a1a',
      backgroundColor: 'white',
      boxSizing: 'border-box' as const,
      wordWrap: 'break-word' as const, 
      overflowWrap: 'break-word' as const,
      letterSpacing: '0.3px', // Adds slight spacing to prevent words merging in PDF
      outline: isEditable ? '2px dashed #10b981' : 'none',
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
      outline: 'none',
    },
    title: {
      fontSize: '13px',
      fontWeight: '600',
      color: '#2c3e50',
      marginBottom: '8px',
      outline: 'none',
    },
    contact: {
      fontSize: '10px',
      color: '#4a4a4a',
      marginTop: '8px',
      textAlign: 'center' as const,
      outline: 'none',
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
      outline: 'none',
    },
    summaryText: {
      margin: '0',
      textAlign: 'left' as const, // Changed from justify to left to fix PDF spacing artifacts
      lineHeight: '1.5',
      outline: 'none',
    },
    skillsGrid: {
      display: 'block',
    },
    skillItem: {
      lineHeight: '1.5',
      marginBottom: '8px',
      display: 'block',
      breakInside: 'avoid' as const,
      pageBreakInside: 'avoid' as const,
      outline: 'none',
    },
    skillCategory: {
      color: '#2c3e50',
      fontWeight: '600',
    },
    experienceItem: {
      marginBottom: '20px',
      breakInside: 'avoid' as const,
      pageBreakInside: 'avoid' as const
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
      outline: 'none',
    },
    jobDates: {
      fontSize: '10px',
      fontWeight: '600',
      color: '#555555',
      whiteSpace: 'nowrap' as const,
      textAlign: 'right' as const,
      verticalAlign: 'top' as const,
      outline: 'none',
    },
    companyName: {
      fontSize: '11px',
      fontWeight: '600',
      color: '#2c3e50',
      fontStyle: 'italic',
      marginTop: '2px',
      outline: 'none',
    },
    achievementsList: {
      margin: '8px 0 0 20px',
      padding: '0',
      listStyleType: 'disc',
    },
    achievementItem: {
      marginBottom: '5.6px',
      lineHeight: '1.5',
      textAlign: 'left' as const,
      outline: 'none',
    },
    educationItem: {
      marginBottom: '8px',
      lineHeight: '1.5',
      breakInside: 'avoid' as const,
      pageBreakInside: 'avoid' as const,
      outline: 'none',
    },
  };

  const handleBlur = (field: string, value: string, index?: number, subIndex?: number) => {
    if (!onUpdate) return;
    const newData = { ...data };
    
    if (field === 'name') newData.name = value;
    if (field === 'title') newData.title = value;
    if (field === 'summary') newData.summary = value;
    
    if (field === 'skill' && index !== undefined && newData.skills) {
        newData.skills[index].items = value;
    }
    
    if (field === 'jobTitle' && index !== undefined && newData.experience) {
        newData.experience[index].title = value;
    }
    if (field === 'jobCompany' && index !== undefined && newData.experience) {
        newData.experience[index].company = value;
    }
    if (field === 'jobDates' && index !== undefined && newData.experience) {
        newData.experience[index].dates = value;
    }
    if (field === 'jobAchievement' && index !== undefined && subIndex !== undefined && newData.experience) {
        newData.experience[index].achievements[subIndex] = value;
    }
    
    if (field === 'keyAchievement' && index !== undefined && newData.keyAchievements) {
        newData.keyAchievements[index] = value;
    }
    
    if (field === 'education' && index !== undefined && newData.education) {
        // Simple heuristic for education string edit
        newData.education[index].degree = value;
    }

    onUpdate(newData);
  };

  // Check valid LinkedIn
  const hasLinkedIn = data.linkedin && data.linkedin !== 'null' && data.linkedin !== 'N/A' && data.linkedin.trim() !== '';

  return (
    <div className={`cv-absolute-container cv-preview-background ${isEditable ? 'master-edit-active' : ''}`} style={styles.container}>
      {/* Header Section */}
      <header style={styles.header}>
        <h1 
          style={styles.name} 
          contentEditable={isEditable} 
          suppressContentEditableWarning 
          onBlur={(e) => handleBlur('name', e.currentTarget.innerText)}
        >
          {data.name}
        </h1>
        <div 
          style={styles.title} 
          contentEditable={isEditable} 
          suppressContentEditableWarning 
          onBlur={(e) => handleBlur('title', e.currentTarget.innerText)}
        >
          {data.title}
        </div>
        <div style={styles.contact}>
           {data.location} | {data.phone} | {data.email} {hasLinkedIn && `| ${data.linkedin}`}
        </div>
      </header>

      {/* Professional Summary */}
      {data.summary && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>PROFESSIONAL SUMMARY</h2>
          <p 
            style={styles.summaryText} 
            contentEditable={isEditable} 
            suppressContentEditableWarning 
            onBlur={(e) => handleBlur('summary', e.currentTarget.innerText)}
          >
            {data.summary}
          </p>
        </section>
      )}

      {/* Core Competencies */}
      {data.skills && data.skills.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>CORE COMPETENCIES</h2>
          <div style={styles.skillsGrid}>
            {data.skills.map((skill, index) => (
              <div key={index} style={styles.skillItem} className="no-break">
                <span style={styles.skillCategory}>{skill.category}:</span> 
                <span 
                  contentEditable={isEditable} 
                  suppressContentEditableWarning 
                  onBlur={(e) => handleBlur('skill', e.currentTarget.innerText, index)}
                >
                  {skill.items}
                </span>
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
            <div key={index} style={styles.experienceItem} className="no-break">
              <table style={styles.jobHeader}>
                <tbody>
                  <tr>
                    <td style={{ verticalAlign: 'top' }}>
                      <h3 
                        style={styles.jobTitle} 
                        contentEditable={isEditable} 
                        suppressContentEditableWarning 
                        onBlur={(e) => handleBlur('jobTitle', e.currentTarget.innerText, index)}
                      >
                        {job.title}
                      </h3>
                      <div 
                        style={styles.companyName} 
                        contentEditable={isEditable} 
                        suppressContentEditableWarning 
                        onBlur={(e) => handleBlur('jobCompany', e.currentTarget.innerText, index)}
                      >
                        {job.company}
                      </div>
                    </td>
                    <td 
                      style={styles.jobDates} 
                      contentEditable={isEditable} 
                      suppressContentEditableWarning 
                      onBlur={(e) => handleBlur('jobDates', e.currentTarget.innerText, index)}
                    >
                      {job.dates}
                    </td>
                  </tr>
                </tbody>
              </table>
              <ul style={styles.achievementsList}>
                {job.achievements.map((achievement, i) => (
                  <li 
                    key={i} 
                    style={styles.achievementItem} 
                    contentEditable={isEditable} 
                    suppressContentEditableWarning 
                    onBlur={(e) => handleBlur('jobAchievement', e.currentTarget.innerText, index, i)}
                  >
                    {achievement}
                  </li>
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
              <li 
                key={index} 
                style={styles.achievementItem} 
                contentEditable={isEditable} 
                suppressContentEditableWarning 
                onBlur={(e) => handleBlur('keyAchievement', e.currentTarget.innerText, index)}
              >
                {achievement}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Education */}
      {data.education && data.education.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>EDUCATION</h2>
          {data.education.map((edu, index) => (
            <div 
              key={index} 
              style={styles.educationItem} 
              className="no-break" 
              contentEditable={isEditable} 
              suppressContentEditableWarning 
              onBlur={(e) => handleBlur('education', e.currentTarget.innerText, index)}
            >
              <strong>{edu.degree}</strong>
              {edu.institution && <span> — {edu.institution}</span>}
              {edu.year && <span> ({edu.year})</span>}
            </div>
          ))}
        </section>
      )}

      {/* References */}
      {data.references && data.references.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>REFERENCES</h2>
          <div style={styles.skillsGrid}>
            {data.references.map((ref, index) => (
              <div key={index} style={styles.skillItem} className="no-break">
                <strong>{ref.name}</strong> — {ref.contact}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default CVTemplate;
