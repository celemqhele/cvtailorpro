
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: 'Guide' | 'Listicle' | 'Product';
  date: string;
  readTime: string;
  content: string; // Markdown supported
  imageUrl?: string;
}

const generateContent = (title: string) => `
# ${title}

## Introduction
In today's competitive job market, standing out is more important than ever. This article explores actionable strategies to help you navigate the recruitment process with confidence.

## Key Takeaways
*   **Relevance is Key:** Tailoring your application to the specific job description is the #1 factor in passing ATS scans.
*   **Metrics Matter:** Quantifying your achievements (e.g., "Increased sales by 20%") is far more powerful than listing duties.
*   **Professional Formatting:** Keep it clean, simple, and easy to read.

## The Strategy
Start by analyzing the job description. What are the top 3 skills they are asking for? Ensure those keywords appear in your professional summary and skills section.

## Conclusion
Preparation is 90% of success. Use tools like **CV Tailor Pro** to automate the tedious parts of customization so you can focus on interview prep.
`;

export const BLOG_POSTS: BlogPost[] = [
  // 5 Listicles
  {
    id: '1', slug: '5-red-flags-on-cv', title: '5 Red Flags Recruiters Look For on Your CV', 
    excerpt: 'Avoid these common mistakes that get your application rejected in less than 6 seconds.', 
    category: 'Listicle', date: '2024-02-10', readTime: '4 min', content: generateContent('5 Red Flags Recruiters Look For on Your CV')
  },
  {
    id: '2', slug: '10-power-words', title: '10 Power Words to Transform Your Resume', 
    excerpt: 'Stop using "Responsible for" and start using words that drive impact and show leadership.', 
    category: 'Listicle', date: '2024-02-08', readTime: '3 min', content: generateContent('10 Power Words to Transform Your Resume')
  },
  {
    id: '3', slug: '7-ats-myths', title: '7 ATS Myths Busted: How Robots Actually Read Your CV', 
    excerpt: 'We clarify the confusion around Applicant Tracking Systems and how to beat them honestly.', 
    category: 'Listicle', date: '2024-02-05', readTime: '5 min', content: generateContent('7 ATS Myths Busted')
  },
  {
    id: '4', slug: 'top-soft-skills-2024', title: 'Top 8 Soft Skills Employers Want in 2024', 
    excerpt: 'Hard skills get you the interview, but soft skills get you the job. Here is what is trending.', 
    category: 'Listicle', date: '2024-02-01', readTime: '4 min', content: generateContent('Top 8 Soft Skills Employers Want in 2024')
  },
  {
    id: '5', slug: 'cv-formatting-tools', title: '5 Tools to Format Your CV Perfectly', 
    excerpt: 'From Canva to Word to AI tools, we rank the best ways to structure your document.', 
    category: 'Listicle', date: '2024-01-28', readTime: '6 min', content: generateContent('5 Tools to Format Your CV Perfectly')
  },
  // 20 Articles
  {
    id: '6', slug: 'how-to-prep-for-interviews', title: 'How to Prep for Interviews: The STAR Method', 
    excerpt: 'Master behavioral interview questions using the Situation, Task, Action, Result framework.', 
    category: 'Guide', date: '2024-02-12', readTime: '8 min', content: generateContent('How to Prep for Interviews: The STAR Method')
  },
  {
    id: '7', slug: 'make-cv-from-scratch', title: 'How to Make Your CV From Scratch', 
    excerpt: 'A step-by-step guide for fresh graduates or career changers building their first professional document.', 
    category: 'Guide', date: '2024-02-11', readTime: '10 min', content: generateContent('How to Make Your CV From Scratch')
  },
  {
    id: '8', slug: 'why-our-tool-is-great', title: 'Why AI Tailoring Beats Generic Templates', 
    excerpt: 'Generic templates look nice but lack substance. Learn how AI injection helps you rank higher.', 
    category: 'Product', date: '2024-02-09', readTime: '3 min', content: generateContent('Why AI Tailoring Beats Generic Templates')
  },
  {
    id: '9', slug: 'writing-professional-summary', title: 'Writing a Professional Summary That Hooks Recruiters', 
    excerpt: 'The first 3 lines of your CV are the most critical. Here is how to nail them.', 
    category: 'Guide', date: '2024-02-07', readTime: '5 min', content: generateContent('Writing a Professional Summary That Hooks Recruiters')
  },
  {
    id: '10', slug: 'cover-letters-dead', title: 'Are Cover Letters Dead? When to Send One', 
    excerpt: 'Spoiler: They aren\'t dead, but they have changed. Learn when to skip and when to write.', 
    category: 'Guide', date: '2024-02-06', readTime: '4 min', content: generateContent('Are Cover Letters Dead?')
  },
  {
    id: '11', slug: 'career-gap-explanation', title: 'How to Explain Gaps in Your Employment History', 
    excerpt: 'Turn your sabbatical, layoff, or parental leave into a strength rather than a weakness.', 
    category: 'Guide', date: '2024-02-04', readTime: '6 min', content: generateContent('How to Explain Gaps in Your Employment History')
  },
  {
    id: '12', slug: 'salary-negotiation', title: 'The Art of Salary Negotiation for New Hires', 
    excerpt: 'Don\'t leave money on the table. Learn the polite yet firm way to ask for more.', 
    category: 'Guide', date: '2024-02-03', readTime: '7 min', content: generateContent('The Art of Salary Negotiation')
  },
  {
    id: '13', slug: 'linkedin-optimization', title: 'Optimizing Your LinkedIn Profile for Headhunters', 
    excerpt: 'Your CV is outbound marketing; LinkedIn is inbound. Make sure they match.', 
    category: 'Guide', date: '2024-01-30', readTime: '5 min', content: generateContent('Optimizing Your LinkedIn Profile')
  },
  {
    id: '14', slug: 'remote-work-cv', title: 'Tailoring Your CV for Remote Work Roles', 
    excerpt: 'Remote employers look for specific traits like autonomy and async communication skills.', 
    category: 'Guide', date: '2024-01-25', readTime: '4 min', content: generateContent('Tailoring Your CV for Remote Work Roles')
  },
  {
    id: '15', slug: 'tech-cv-guide', title: 'The Ultimate Guide to Technical Resumes', 
    excerpt: 'Developers and Engineers: Here is how to list your stack without cluttering the page.', 
    category: 'Guide', date: '2024-01-20', readTime: '6 min', content: generateContent('The Ultimate Guide to Technical Resumes')
  },
  {
    id: '16', slug: 'career-change-cv', title: 'Pivoting Careers: The Transferable Skills CV', 
    excerpt: 'Changing industries? Focus on what translates, not just what you did.', 
    category: 'Guide', date: '2024-01-18', readTime: '5 min', content: generateContent('Pivoting Careers: The Transferable Skills CV')
  },
  {
    id: '17', slug: 'executive-cv-tips', title: 'Executive CVs: How C-Suite Resumes Differ', 
    excerpt: 'Executives need to show ROI and Strategy, not just tasks. Here is the blueprint.', 
    category: 'Guide', date: '2024-01-15', readTime: '5 min', content: generateContent('Executive CVs: How C-Suite Resumes Differ')
  },
  {
    id: '18', slug: 'student-graduate-cv', title: 'No Experience? No Problem. The Graduate CV Guide', 
    excerpt: 'Leverage your academic projects and internships to land your first role.', 
    category: 'Guide', date: '2024-01-12', readTime: '4 min', content: generateContent('No Experience? No Problem')
  },
  {
    id: '19', slug: 'creative-industry-cv', title: 'Creative Portfolios vs. Standard CVs', 
    excerpt: 'Designers and Marketers: When to use a creative layout and when to stick to basics.', 
    category: 'Guide', date: '2024-01-10', readTime: '4 min', content: generateContent('Creative Portfolios vs. Standard CVs')
  },
  {
    id: '20', slug: 'video-interviews', title: 'Mastering the One-Way Video Interview', 
    excerpt: 'More companies are using AI video screening. Here is how to look natural on camera.', 
    category: 'Guide', date: '2024-01-08', readTime: '5 min', content: generateContent('Mastering the One-Way Video Interview')
  },
  {
    id: '21', slug: 'networking-emails', title: 'Writing Cold Networking Emails That Get Replies', 
    excerpt: 'The hidden job market is unlocked via networking. Here are templates that work.', 
    category: 'Guide', date: '2024-01-05', readTime: '3 min', content: generateContent('Writing Cold Networking Emails')
  },
  {
    id: '22', slug: 'reference-checks', title: 'Preparing Your References for the Call', 
    excerpt: 'Don\'t let a bad reference ruin a great offer. Coach your advocates.', 
    category: 'Guide', date: '2024-01-02', readTime: '3 min', content: generateContent('Preparing Your References')
  },
  {
    id: '23', slug: 'internal-promotion', title: 'Applying for an Internal Promotion', 
    excerpt: 'You still need a CV for internal roles. Treat it as seriously as an external application.', 
    category: 'Guide', date: '2023-12-28', readTime: '4 min', content: generateContent('Applying for an Internal Promotion')
  },
  {
    id: '24', slug: 'contract-vs-perm', title: 'Contract vs. Permanent: Positioning Yourself', 
    excerpt: 'How to label freelance work so it looks stable and professional.', 
    category: 'Guide', date: '2023-12-25', readTime: '4 min', content: generateContent('Contract vs. Permanent')
  },
  {
    id: '25', slug: 'final-proofread', title: 'The Final Proofread Checklist', 
    excerpt: 'The checklist you must run through before hitting "Submit" on any application.', 
    category: 'Guide', date: '2023-12-20', readTime: '2 min', content: generateContent('The Final Proofread Checklist')
  }
];
