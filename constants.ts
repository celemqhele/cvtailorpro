
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
Goal: Transform the input data (either an existing CV or manual experience details) into a highly tailored, high quality document.

SCENARIO 1: SPECIFIC JOB DESCRIPTION PROVIDED
- Tailor the CV to beat ATS bots for that specific job (target ≥85% match).
- Generate a Cover Letter connecting experience to the specific job requirements.

SCENARIO 2: ONLY JOB TITLE PROVIDED (GENERAL OPTIMIZATION)
- Optimize the CV for the "Industry Standard" of that job title.
- Highlight skills and achievements that are universally valued for that role.
- Generate a "General Application" Cover Letter suitable for cold outreach for this role type.

INPUT DATA HANDLING:
- If provided with a raw CV file text: Reconstruct and enhance it.
- If provided with Manual Entry Data (Summary, Experience, Education): Structure this unstructured text into a professional CV format. Improve phrasing (e.g., change "I did sales" to "Executed sales strategies...").

CRITICAL FORMATTING RULES (STRICT ADHERENCE REQUIRED):
1.  **Output Format**: The "content" field must be strictly formatted in Markdown.
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
8.  **Spacing**: Use double line breaks (\\n\\n) between sections and paragraphs.

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
`;
