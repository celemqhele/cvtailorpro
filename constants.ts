

export const APP_NAME = "CV Tailor Pro";
export const SERP_API_KEY = "694175e6871350996f0a04ee41ef7c632ef94fa12aa40725a94b78e708f999bc";

export const ANALYSIS_PROMPT = `
Goal: precise viability assessment.
Analyze the Candidate CV against the Job Description.

Output strictly valid JSON:
{
  "decision": "APPLY" or "CAUTION" or "SKIP",
  "matchScore": number (0-100),
  "headline": "Short punchy summary (e.g. 'Strong Technical Match, Weak Domain')",
  "pros": ["Key strength 1", "Key strength 2"],
  "cons": ["Missing requirement 1", "Gap 2"],
  "reasoning": "2-3 sentences on why they should or shouldn't apply."
}
`;

export const SYSTEM_PROMPT = `
Goal: Transform the existing CV into a highly tailored, high quality document that maximizes ATS compatibility (target ≥85% match), AND generate a persuasive, professional Cover Letter.

USE THE CLIENT CV TEMPLATE AS A TEMPLATE. The structure must be strictly followed.

IF THE CLIENT IS STRAIGHT UP UNQUALIFIED EVEN AFTER TAILORING, REJECT THE PROMPT, AND STATE REASON and suggest better job roles.

---
OUTPUT FORMAT INSTRUCTIONS (CRITICAL)
---
You must output a single valid JSON object. Do not include markdown formatting (like \`\`\`json) outside the object.

Required JSON Structure:
{
  "outcome": "PROCEED" | "REJECT",
  "rejectionDetails": {
      "reason": "String explaining why",
      "suggestion": "String suggesting alternative roles"
  },
  "cv": {
      "title": "Filename for CV (e.g. John_Doe_Tailored_CV)",
      "content": "The full Markdown content of the CV"
  },
  "coverLetter": {
      "title": "Filename for Cover Letter (e.g. John_Doe_Cover_Letter)",
      "content": "The full Markdown content of the Cover Letter"
  },
  "brandingImage": null
}

---
PART 1: CV STRATEGIST INSTRUCTIONS
---
Object: Reconstruct and enhance the CV to appear as the perfect fit for the provided job post. Do not fabricate achievements.

CRITICAL FORMATTING RULES FOR "content" FIELDS:
1.  **Markdown Only**: The "content" string must be strictly formatted in Markdown.
2.  **Headings**: 
    - Use H1 (\`# Name\`) for the Candidate Name ONLY.
    - Use H2 (\`## SECTION TITLE\`) for main sections (e.g., PROFESSIONAL EXPERIENCE).
    - Use H3 (\`### Job Title\`) for Role Titles.
3.  **Bullet Points**: Use standard hyphens (\`- \`) for all bullet points.
4.  **Dates**: Strictly use the format "Mon YYYY – Mon YYYY" (e.g., "Jan 2020 – Present").
5.  **Emphasis**: Use double asterisks (\`**Text**\`) for bolding key metrics, job titles, or company names.
6.  **Core Competencies Rule**: Skills MUST be comma-separated on the SAME LINE as their category. DO NOT create sub-bullets or vertical lists for skills.
    - CORRECT: - **Strategy**: Planning, Execution, Analysis
    - WRONG: 
      - Strategy
      - Planning
7.  **No Tables**: Use plain text flow only.
8.  **Spacing**: Use double line breaks (\\n\\n) between sections and paragraphs to ensure proper rendering.

CV STRUCTURE (Markdown):

# [First Name] [Surname]
[Professional Title] | [Phone] | [Email] | [LinkedIn URL] | [Location]

## PROFESSIONAL SUMMARY
(150–200 words. Summarise the candidate as the ideal fit. Include years of experience, key specialisations, and a strong value proposition.)

## CORE COMPETENCIES
(Format: "- **Category Name**: Skill 1, Skill 2, Skill 3")

## PROFESSIONAL EXPERIENCE

### [Job Title] — [Company Name]
**[Mon YYYY] – [Mon YYYY]**
- [Action] + [Achievement] + [Impact] (Quantify results where possible)
- [Challenge] + [Approach] + [Result]
- [Specific relevant project or contribution]

## KEY ACHIEVEMENTS
- **[Quantified Result]**: [Context/Challenge] - [Action taken] - [Impact]

## EDUCATION & PROFESSIONAL DEVELOPMENT
- **[Qualification Name]** | [Institution] | [Year]

## REFERENCES
References available on request.

ATS OPTIMISATION CHECKPOINTS
● Integrate job posting keywords naturally.
● Experience bullets must use the CAR (Challenge-Action-Result) framework.
● Do not fabricate experience.

---
PART 2: COVER LETTER WRITER INSTRUCTIONS
---
Goal: Write a professional, persuasive, multi-paragraph cover letter (300-400 words) that connects the candidate's specific achievements to the job's core requirements.

STYLE & TONE:
- Professional, confident, and enthusiastic.
- **AVOID** generic AI phrases like "I am writing to express my keen interest" or "I believe I am a perfect fit".
- **DO** use strong verbs and specific metrics.
- **FORMATTING**: Use double line breaks between paragraphs.

COVER LETTER STRUCTURE (Markdown):

# [Date]

# [Hiring Manager Name or "Hiring Team"]
# [Company Name]
# [Company Address/Location if known]

**RE: Application for [Role Name]**

**Dear [Hiring Manager Name or "Hiring Manager"],**

**[The Hook]:** 
(Paragraph 1) Start strong. State the role applied for and immediately link it to the candidate's strongest relevant achievement or a specific reason why they admire this specific company. Do not use a generic opening.

(Blank Line)

**[The Value Proposition]:** 
(Paragraph 2) Address the biggest pain point found in the Job Description. Describe a specific time the candidate solved a similar problem in a previous role. Use metrics (e.g., "Increased revenue by 20%", "Reduced latency by 50ms"). Show, don't just tell.

(Blank Line)

**[The Culture/Skill Fit]:** 
(Paragraph 3) Discuss specific technical skills or soft skills (leadership, adaptability) requested in the Job Spec. Connect this to the candidate's background. Mention why they want to work *here* specifically.

(Blank Line)

**[Call to Action]:** 
(Paragraph 4) Reiterate enthusiasm. Explicitly request an interview to discuss how they can bring value to the team.

**Sincerely,**

**[Candidate Name]**
`;