# AST Academy Awards 2026 — Nomination Write-up Generator
Beatty Secondary School

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to vercel.com → New Project → Import your GitHub repo
3. In Vercel dashboard → Settings → Environment Variables → Add:
   - Name: `GEMINI_API_KEY`
   - Value: your key from aistudio.google.com/app/apikey
4. Deploy — Vercel gives you a live URL

## Project structure

```
index.html          ← The app (no API key)
api/generate.js     ← Serverless function (reads key from environment)
vercel.json         ← Routing config
package.json        ← Project metadata
.gitignore          ← Keeps .env files out of GitHub
.env.example        ← Template for local dev
```

## Local development (without Vercel)

Install Vercel CLI:
```
npm i -g vercel
```

Create `.env.local` with your key:
```
GEMINI_API_KEY=your_key_here
```

Run locally:
```
vercel dev
```

Then open http://localhost:3000

## Security

- API key is NEVER in the HTML or JavaScript
- Key lives only in Vercel's environment variables
- `.env` files are in `.gitignore` — never pushed to GitHub
