# Contributing

Thanks for helping improve Resume Coach Platform. The best contributions are small, reproducible, and easy to review.

## Quick Setup

```bash
npm install
cd frontend
npm install
cd ..
```

Run backend checks:

```bash
npm run lint
npm run build
npm test
```

Run frontend checks:

```bash
cd frontend
npm run lint
npm run build
```

## Local Demo Mode

You can run the product flow without PostgreSQL or external AI keys:

```bash
# Terminal 1
set AUTH_MEMORY_FALLBACK=true
set JWT_SECRET=resume-coach-local-demo-secret-key-123456
npm run dev

# Terminal 2
cd frontend
npm run dev -- --host=127.0.0.1 --port=5173
```

Open `http://127.0.0.1:5173` and log in with:

```txt
email: admin@example.com
password: 123456
```

## What To Include In A PR

- A short description of the user-visible change.
- Screenshots for UI changes.
- Tests or a clear explanation when tests are not applicable.
- Any migration, environment, or deployment notes.

## Contribution Ideas

- Improve scoring explainability.
- Add role-specific demo resumes and JDs.
- Add Playwright E2E coverage for the demo flow.
- Improve PDF layout and ATS-friendly export styles.
- Add better empty states and error handling in the frontend.

## Style Notes

- Keep changes focused and easy to review.
- Prefer existing project patterns over introducing new frameworks.
- Do not commit `.env`, API keys, personal resumes, or private company data.
- For Chinese document handling, normalize extracted text to UTF-8 before analysis.
