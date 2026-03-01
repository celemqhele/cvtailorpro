# Admin Instructions for AI Assistant

## CRITICAL: REVIEW ADMIN LOGS
Every time you are prompted to make **ANY** changes to this application, you **MUST** first read the `admin_logs` table in Supabase (via `adminLogService.getLogs()` or by querying the database).

### Why?
The admin logs provide essential context on:
1.  Recent changes made by the administrator.
2.  Features that were recently added, modified, or deleted.
3.  The administrator's intent and workflow patterns.

### How to access logs:
-   Use the `adminLogService.getLogs()` method in the code.
-   Or query the `admin_logs` table directly using Supabase tools if available.

### Logged Actions:
-   `CREATE_JOB`: When a new job listing is added.
-   `DELETE_JOB`: When a job listing is removed.
-   `PUBLISH_ARTICLE`: When an AI-generated article is published.
-   `DELETE_ARTICLE`: When an article is removed.
-   `RESET_DAILY_CREDITS`: When the admin resets usage limits for all users.
-   `GENERATE_JOB_SPEC`: When the admin uses the LinkedIn scraper to generate a job spec.

**DO NOT PROCEED WITH CHANGES WITHOUT CHECKING THESE LOGS FOR CONTEXT.**
