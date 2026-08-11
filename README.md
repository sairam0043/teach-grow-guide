# Cuvasol Tutor

## Running locally

Requires Node.js 18+ (developed on v24). The app is two processes: a Vite
frontend on **:8080** and an Express/Mongoose backend on **:5000**.

### 1. Install

```powershell
npm run setup     # installs both frontend and backend dependencies
```

### 2. Configure

Two separate env files — Vite only reads `VITE_*` from the project root, and
the backend only reads `backend/.env`:

```powershell
copy .env.example .env
copy backend\.env.example backend\.env
```

Fill both in. At minimum the backend needs `MONGO_URI`; see the comments in
each template for the rest. Neither file is committed.

### 3. Run

Two terminals:

```powershell
npm run dev:backend    # Express on http://localhost:5000
```

```powershell
npm run dev            # Vite on http://localhost:8080
```

Then open http://localhost:8080. Check the API with
`curl http://localhost:5000/api/health`.

### Notes

- **Payments run in Sandbox Mock mode** when `RAZORPAY_KEY_ID` /
  `RAZORPAY_KEY_SECRET` are blank — fake `order_mock_*` orders, no card
  charged, signature verification skipped. Never put live `rzp_live_*` keys in
  `backend/.env`; use `rzp_test_*` keys if you need the real checkout flow.
- **Use port 8080.** Google Sign-In validates the browser origin against the
  authorized JavaScript origins in Google Cloud Console. If Vite falls back to
  8081+ because the port is taken, sign-in will fail.
- **Email is skipped** unless all four `SMTP_*` vars are set. Failures are
  caught and logged, so the surrounding request still succeeds.
- `NODE_ENV=production` skips `.env` loading entirely (see `backend/index.js`)
  and makes `JWT_SECRET` plus the Razorpay keys mandatory — the server refuses
  to boot without them.

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Demo credentials (Admin / Student / Tutor)

This project routes dashboards based on the `user_roles` table:

- Admin: `/dashboard/admin`
- Tutor: `/dashboard/tutor`
- Student: `/dashboard/student`

### Create the demo users

> **Stale:** this section predates the move to MongoDB. `scripts/create-demo-users.mjs`
> still talks to Supabase, which the running app no longer uses. Kept for
> reference until the script is ported or removed.

You need a Supabase **service role key** (do not commit it).

In PowerShell:

```powershell
$env:SUPABASE_URL="YOUR_SUPABASE_URL"
$env:SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY"
npm run demo:users
```

Optional (override the default password):

```powershell
$env:DEMO_PASSWORD="TempPass123!"
npm run demo:users
```

Note: the script also accepts `VITE_SUPABASE_URL` (from your existing `.env`) if you don’t want to set `SUPABASE_URL` separately.
It will also automatically read `.env` from the project root (it won’t print your keys).

### Demo logins

- **Admin**
  - Email: `admin.demo@teachgrow.local`
  - Password: `TempPass123!` (or your `DEMO_PASSWORD`)
- **Student**
  - Email: `student.demo@teachgrow.local`
  - Password: `TempPass123!` (or your `DEMO_PASSWORD`)
- **Tutor**
  - Email: `tutor.demo@teachgrow.local`
  - Password: `TempPass123!` (or your `DEMO_PASSWORD`)
