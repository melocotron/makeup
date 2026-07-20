# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| < 0.2   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in **radiant-beauty**, please report
it privately to keep the project and its users safe.

**Email:** opensource@melocotron.dev (replace with the maintainer's actual
contact before publishing)

**Please do NOT** open a public GitHub issue for security vulnerabilities.

When reporting, please include:

- A clear description of the issue and its impact.
- Steps to reproduce, or a proof-of-concept.
- The commit/branch/tag where you observed the issue.
- Your assessment of the impact (data exposure, auth bypass, RCE, etc.).

## Response Timeline

- **Acknowledgement:** within 72 hours of the report.
- **Initial triage:** within 7 days.
- **Fix and disclosure:** coordinated with the reporter. Critical issues
  will be patched and a CVE / advisory released as soon as possible.

## Scope

The following are in scope:

- Authentication, authorization, and session handling (NextAuth v5).
- Server actions and server-side data access (Prisma queries).
- File upload and storage paths.
- Input validation and injection vectors (SQL, XSS, command injection).
- CSRF protection on state-changing endpoints.

Out of scope:

- Vulnerabilities in third-party packages (file them upstream).
- Denial of service via resource exhaustion against a single account.
- Social engineering of project maintainers.
