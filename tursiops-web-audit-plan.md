# Tursiops Web — Security Audit & Fix Plan

## How to use this plan with IBM Bob

Open the `tursiops-web` folder in VS Code (the one at `C:\Users\HP\Desktop\Ibm bob 2.0\Tursiops Web`).
Then give IBM Bob each sub-task prompt one at a time, in order.
Each prompt tells Bob exactly which file to read, what to look for, and what to fix.

---

## Repository Structure (confirmed from screenshots)

```
tursiops-web/
├── api/
│   └── index.js          ← Vercel serverless entry point
├── server/
│   ├── routes/
│   │   └── auth.js       ← signup / signin route handlers
│   └── utils/
│       ├── auth.js       ← JWT sign/verify helpers
│       └── db.js         ← Turso DB client + queries
├── app.js                ← Express app setup (middleware, routes)
├── server.js             ← local dev server entry
├── index.html            ← frontend signin/signup page
├── style.css             ← frontend styles
├── vercel.json           ← Vercel routing config
├── .env                  ← secrets (never committed)
├── .env.example          ← example env vars
└── package.json          ← dependencies
```

---

## Sub-Task 1 — Read and Inventory Every File

**IBM Bob Prompt:**
```
Read every file in this project one by one:
- package.json
- app.js
- server.js
- api/index.js
- server/routes/auth.js
- server/utils/auth.js
- server/utils/db.js
- index.html
- vercel.json
- .env.example

After reading all of them, give me a complete inventory:
1. What npm packages are used and their versions
2. What environment variables are expected
3. What API routes exist and what each one does
4. What database queries are made
5. What the JWT strategy is (secret, expiry, payload)
6. What the frontend does on signin and signup

Do NOT make any changes yet. Just read and report.
```

**Status:** `[ ] pending`

---

## Sub-Task 2 — Fix Authentication Security Issues

**IBM Bob Prompt:**
```
Read server/routes/auth.js and server/utils/auth.js carefully.

Find and fix ALL of the following issues. Make the changes directly in the files:

1. JWT SECRET STRENGTH
   - Check if JWT_SECRET is used from process.env
   - If it has a fallback hardcoded value like 'secret' or 'mysecret', remove it
   - The line should be: const secret = process.env.JWT_SECRET; and throw an error if it's missing at startup

2. JWT EXPIRY
   - Check if jwt.sign() sets an expiresIn option
   - If missing, add: expiresIn: '7d'
   - Example: jwt.sign(payload, secret, { expiresIn: '7d' })

3. PASSWORD HASHING
   - Check if bcrypt (or bcryptjs) is used when storing passwords
   - If passwords are stored as plain text, add bcrypt hashing:
     const hashed = await bcrypt.hash(password, 12);
   - On signin, use: const valid = await bcrypt.compare(password, user.password_hash);

4. MISSING INPUT VALIDATION
   - Check if signup validates: email format, password minimum length (at least 8 chars)
   - If not, add validation before any DB call:
     if (!email || !email.includes('@')) return res.status(400).json({ error: 'Invalid email' });
     if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

5. ERROR MESSAGES LEAKING INFO
   - Find any catch blocks that do: res.json({ error: err.message }) or similar
   - Replace with generic messages:
     - For signin failures: res.status(401).json({ error: 'Invalid email or password' })
     - For server errors: res.status(500).json({ error: 'Something went wrong' })
     - Keep console.error(err) for server-side logging

6. MISSING HTTP STATUS CODES
   - Ensure every error response has a proper status code (400, 401, 403, 500)
   - Ensure every success response uses 200 or 201 (for signup)

After making all changes, show me the full updated content of both files.
```

**Status:** `[ ] pending`

---

## Sub-Task 3 — Fix Database & Input Sanitisation

**IBM Bob Prompt:**
```
Read server/utils/db.js carefully.

Find and fix ALL of the following issues:

1. SQL INJECTION PREVENTION
   - Check every database query
   - If any query uses string concatenation or template literals to insert user input directly like:
     db.execute(`SELECT * FROM users WHERE email = '${email}'`)
   - Replace with parameterised queries:
     db.execute('SELECT * FROM users WHERE email = ?', [email])
   - Turso/libsql uses: client.execute({ sql: 'SELECT...WHERE email = ?', args: [email] })

2. DB CONNECTION ERROR HANDLING
   - Check if the Turso client creation checks for missing TURSO_URL or TURSO_AUTH_TOKEN env vars
   - If not, add at the top of db.js:
     if (!process.env.TURSO_DATABASE_URL) throw new Error('TURSO_DATABASE_URL is not set');
     if (!process.env.TURSO_AUTH_TOKEN) throw new Error('TURSO_AUTH_TOKEN is not set');

3. USER EXISTENCE CHECK ON SIGNUP
   - In the signup query flow, verify there is a check for duplicate emails before INSERT
   - If missing, add: SELECT id FROM users WHERE email = ? before the INSERT
   - Return 409 Conflict if the email already exists:
     return res.status(409).json({ error: 'An account with this email already exists' })

4. RETURNED DATA SANITISATION
   - When a user row is fetched and returned in a response, ensure the password_hash field is NEVER included
   - If the query returns the full row, delete the password field before sending:
     delete user.password_hash; delete user.password;

After making all changes, show me the full updated db.js.
```

**Status:** `[ ] pending`

---

## Sub-Task 4 — Fix Express App Security (app.js)

**IBM Bob Prompt:**
```
Read app.js carefully.

Find and fix ALL of the following issues:

1. MISSING HELMET
   - Check if the 'helmet' package is used
   - If not, run: npm install helmet
   - Add at the top of app.js: const helmet = require('helmet');
   - Add before all routes: app.use(helmet());
   - Helmet adds security headers (XSS protection, no sniff, etc.)

2. MISSING RATE LIMITING
   - Check if 'express-rate-limit' is used
   - If not, run: npm install express-rate-limit
   - Add a rate limiter for auth routes:
     const rateLimit = require('express-rate-limit');
     const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many attempts, try again later' } });
     app.use('/api/auth', authLimiter);

3. CORS CONFIGURATION
   - Check if CORS is configured
   - If app.use(cors()) is used with no options, restrict it:
     app.use(cors({ origin: ['https://tursiops-web.vercel.app'], methods: ['GET', 'POST'], credentials: true }));
   - Also allow localhost for development:
     const allowedOrigins = ['https://tursiops-web.vercel.app', 'http://localhost:3000'];
     app.use(cors({ origin: (origin, cb) => { if (!origin || allowedOrigins.includes(origin)) cb(null, true); else cb(new Error('Not allowed by CORS')); }, credentials: true }));

4. REQUEST BODY SIZE LIMIT
   - Check if express.json() has a size limit
   - If it is just app.use(express.json()), change to:
     app.use(express.json({ limit: '10kb' }));

5. GLOBAL ERROR HANDLER
   - Check if there is a global error handler middleware at the bottom of app.js
   - If not, add before module.exports:
     app.use((err, req, res, next) => {
       console.error(err.stack);
       res.status(500).json({ error: 'Internal server error' });
     });

After all changes, show me the full updated app.js.
```

**Status:** `[ ] pending`

---

## Sub-Task 5 — Add VS Code Extension Callback to Auth Route

**IBM Bob Prompt:**
```
Read server/routes/auth.js.

Find the signin route handler (router.post('/signin', ...) or similar).

After the JWT token is successfully created and before (or instead of) the res.json() response, add this block:

// VS Code extension OAuth-style callback
if (req.query.redirect === 'vscode') {
  return res.redirect(
    `vscode://tursiops-ai.tursiops/auth?token=${token}&email=${encodeURIComponent(user.email)}`
  );
}

// Normal API response
res.json({ success: true, token, user: { id: user.id, email: user.email } });

Make sure:
- The redirect check comes BEFORE the res.json() line
- user.email exists in scope at that point (it should — it was just verified)
- token exists in scope at that point (it was just created by jwt.sign)

Also read index.html. Find the signin form's submit handler (the JavaScript fetch call that POSTs to the signin endpoint).

Add this to the fetch URL so the redirect param is preserved:

const urlParams = new URLSearchParams(window.location.search);
const redirectParam = urlParams.get('redirect') || '';
const response = await fetch(`/api/auth/signin?redirect=${redirectParam}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

Show me the updated server/routes/auth.js and the updated JavaScript section in index.html after the changes.
```

**Status:** `[ ] pending`

---

## Sub-Task 6 — Fix Frontend (index.html) Security & UX

**IBM Bob Prompt:**
```
Read index.html carefully.

Find and fix ALL of the following issues:

1. NO CLIENT-SIDE VALIDATION
   - Before the fetch call on signin, check:
     if (!email || !email.includes('@')) { showError('Please enter a valid email'); return; }
     if (!password || password.length < 8) { showError('Password must be at least 8 characters'); return; }
   - Same checks on signup form

2. PASSWORDS IN BROWSER CONSOLE
   - Search for any console.log that might print the password variable
   - Remove all console.log statements that contain: password, email, token, or user
   - console.error for errors is fine

3. TOKEN STORAGE IN BROWSER
   - If the response token is stored in localStorage like: localStorage.setItem('token', data.token)
   - This is a mild XSS risk. For a hackathon it is acceptable, but add a comment:
     // TODO: move to httpOnly cookie in production

4. ERROR DISPLAY
   - Make sure all fetch catch blocks show a user-friendly message in the UI (not alert())
   - If alert() is used, replace with a visible error div:
     document.getElementById('error-msg').textContent = 'Sign in failed. Check your email and password.';

5. LOADING STATE
   - When the form is submitted, disable the submit button to prevent double-submission:
     submitBtn.disabled = true;
     submitBtn.textContent = 'Signing in...';
   - Re-enable it in the finally block:
     submitBtn.disabled = false;
     submitBtn.textContent = 'Sign In';

Show me the updated index.html JavaScript section after all changes.
```

**Status:** `[ ] pending`

---

## Sub-Task 7 — Fix Environment Variables & Vercel Config

**IBM Bob Prompt:**
```
Read .env.example and vercel.json.

Do the following:

1. .env.example CHECK
   - Make sure these variables are listed (add any that are missing):
     TURSO_DATABASE_URL=
     TURSO_AUTH_TOKEN=
     JWT_SECRET=
     PORT=3000
   - If JWT_SECRET is missing from .env.example, add it

2. vercel.json CHECK
   - Make sure all routes are correctly forwarding to the API handler
   - The standard pattern for an Express app on Vercel is:
     {
       "version": 2,
       "builds": [{ "src": "api/index.js", "use": "@vercel/node" }],
       "routes": [{ "src": "/(.*)", "dest": "api/index.js" }]
     }
   - If this is already correct, leave it
   - If routes are missing the catch-all, add it

3. STARTUP VALIDATION
   - In api/index.js (the Vercel entry point), add at the very top before the app is used:
     const required = ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'JWT_SECRET'];
     required.forEach(key => {
       if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
     });
   - This causes Vercel to fail fast if secrets are missing instead of silently breaking

Show me the updated .env.example and vercel.json and the top section of api/index.js.
```

**Status:** `[ ] pending`

---

## Sub-Task 8 — Final Check: Run and Verify

**IBM Bob Prompt:**
```
Do a final review of the entire project. Read these files one more time:
- app.js
- server/routes/auth.js
- server/utils/auth.js
- server/utils/db.js
- api/index.js

Check for these remaining issues and fix any you find:

1. Are all async route handlers wrapped in try/catch? If any are missing, add them.
2. Is next(err) being called in catch blocks (for Express error handler to catch)? If not, change throw err to next(err) or call the error handler.
3. Is there a 404 handler for unknown routes? If not, add before the error handler:
   app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
4. Does signup correctly hash the password with bcrypt before storing? Confirm this is in place.
5. Does signin correctly compare with bcrypt.compare? Confirm this is in place.
6. Is the JWT token returned in signin NEVER logged to console? Check and remove if so.

After this review, give me a final summary of all the changes made across the entire project in this session.
```

**Status:** `[ ] pending`

---

## Packages to Install (run these in the tursiops-web folder)

Before running the Bob prompts, install the missing security packages:

```bash
npm install helmet express-rate-limit bcryptjs
```

These are needed for Sub-Tasks 2 and 4.

---

## Environment Variables to Set in Vercel Dashboard

After all fixes, go to your Vercel project → Settings → Environment Variables and make sure these are set:

| Variable | Description |
|---|---|
| `TURSO_DATABASE_URL` | Your Turso database URL (libsql://...) |
| `TURSO_AUTH_TOKEN` | Your Turso auth token |
| `JWT_SECRET` | A long random string — generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |

---

## Order to Run These Prompts in IBM Bob

1. Sub-Task 1 (inventory — no changes, just understand the code)
2. Sub-Task 7 (env vars and vercel config — foundational)
3. Sub-Task 3 (database fixes — most critical)
4. Sub-Task 2 (auth fixes — most critical)
5. Sub-Task 4 (Express app security)
6. Sub-Task 5 (VS Code callback — needed for extension)
7. Sub-Task 6 (frontend fixes)
8. Sub-Task 8 (final review)
