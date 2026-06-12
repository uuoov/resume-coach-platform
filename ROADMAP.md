# Roadmap

This roadmap focuses on making Resume Coach Platform more useful for real job applications and easier for open-source contributors to understand.

## Now

- Keep the local demo runnable without PostgreSQL or external AI keys.
- Improve README screenshots and demo documentation.
- Maintain focused Jest coverage for parsing, JD analysis, matching, optimization, auth, and API routes.
- Keep Chinese PDF export reliable in Docker deployments.

## Next

- Add a one-command demo seed that creates a complete resume + JD + match result fixture.
- Add E2E tests for the main web flow: login, resume template, JD analysis, match report, optimization, PDF preview.
- Add labels and issues for `good first issue`, `documentation`, `frontend`, `backend`, and `demo`.
- Improve scoring explainability with clearer formulas and per-dimension evidence.
- Add example resumes and JDs for frontend, product manager, AI engineer, and data analyst roles.

## Later

- Add a hosted demo or a Docker Compose demo mode with preloaded sample data.
- Add an optional evaluation dataset for matching-quality regression tests.
- Add multi-language resume/JD examples.
- Add export templates for ATS-friendly PDF and compact one-page resumes.
- Add observability examples for production deployments.

## Good First Issues

- Add more demo screenshots for different roles.
- Improve the text in empty/error states.
- Add frontend E2E tests for the demo flow.
- Add a small CLI script that prints a demo match result as JSON.
- Add a docs section explaining how the matching weights work.
