# Round Table Flyer Finisher — Vercel + Supabase

This is the independent Next.js version. It does not depend on ChatGPT login, Sites, D1 or R2. The old Sites publication is not modified by this package.

## Included

- Email signup, email confirmation, login, logout and password reset.
- Signup profile: name, Area 1–18 and RT 1–400. Area-to-RT mappings are not assumed.
- Shared logo collection: Official, Area, Table and Chairman categories.
- Independent Area, RT and logo-type filters. National logos remain visible across areas; an RT filter retains area-wide logos. Filters narrow the picker; changing a filter does not remove already selected logos.
- Table names are generated as RT 1 through RT 400. Area logo names are generated as Area 1 through Area 18. This does not invent logos for areas or tables that have not uploaded one.
- Members upload original logos; admins remove any logo and can upload official logos.
- Original RTI and Area 18 assets are bundled. Member uploads go to a private Supabase Storage bucket.
- All ten activity tags, five bundled fonts, up to six text blocks, custom strip colours and JPEG export at quality 0.95.
- App footer: Developed by aaibuilt.com | 7009191914 | LMF Tr Sanyam Tayal.
- The footer credit is on app pages, not stamped onto exported flyers.

## 1. Create a Supabase project

Use a new project so the supplied setup cannot collide with unrelated tables. In Supabase's SQL Editor, run `supabase/schema.sql` once. It creates profiles, admin roles, logo metadata, the private `logos` storage bucket, constraints and row-level security policies. The script intentionally fails if this schema already exists; do not rerun it over a working database.

In Authentication, enable the Email provider and email confirmation. Leave anonymous sign-in disabled. Configure a minimum password length of 8 or more. Configure your own SMTP provider for real member invitations, confirmations and resets; Supabase's default email service is unsuitable for a general member rollout. No email has been sent by this preparation work.

Copy the project URL and the **publishable key** from the project's Connect/API keys panel. This app does not need a secret/service-role key.

## 2. Deploy to your Vercel account

Unzip the project. Put its contents in your own GitHub repository, then import the repository into Vercel. The project root is the folder containing `package.json`.

- Framework: Next.js (also set in `vercel.json`).
- Node.js: 22.x.
- Install: `npm ci`.
- Build: `npm run build`.
- Add both environment variables from `.env.example` in Vercel, for the deployment environments you intend to use:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Deploy. Next.js embeds these public settings at build time; redeploy after changing them.

Alternatively, use the Vercel CLI from the project root if you do not want Git integration. Do not upload `node_modules`, `.next` or private environment files.

The app builds before Supabase is configured, but signup and member storage remain unavailable until the real environment settings and SQL are installed.

## 3. Configure authentication URLs and email templates

After you know the Vercel URL (or your own domain), set Supabase Authentication → URL Configuration → Site URL to that HTTPS origin, e.g. `https://flyers.example.org`.

Allow these exact redirect URLs for each intended origin:
- `https://flyers.example.org/auth/callback`
- `https://flyers.example.org/auth/confirm`

For local development also allow `http://localhost:3000/auth/callback` and `http://localhost:3000/auth/confirm`. Use a separate Supabase project for untrusted preview deployments. Do not use a broad wildcard for arbitrary third-party domains.

Set the **Confirm signup** email link to:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirm your email</a>
```

Set the **Reset password** email link to:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset your password</a>
```

These token-hash routes support opening confirmation links on another device. They are verified on the server. The reset route establishes a session and then sends the user to `/reset-password`. Default PKCE signup callbacks are also handled at `/auth/callback`.

## 4. Give yourself admin access

1. Open `/signup`, create your account and confirm your email.
2. Edit `supabase/make-admin.sql` to use your actual confirmed signup email.
3. Run it in Supabase's SQL Editor. Its final query must return your email.
4. Sign in and open Logo collection. You now have deletion buttons and the Official upload category.

Members cannot grant themselves admin privileges through their profile or browser. Admin status is stored in a separate protected table. Keep the Supabase dashboard and Vercel account under your control.

## 5. Member use

Share the Vercel URL. Members create their own email accounts at `/signup`; they do not need ChatGPT. Everyone who signs up has member upload access, as requested. This is open signup, not verification of Round Table membership. If restricted membership is required later, add an invitation or approval process before rollout.

Members select their Area and RT during signup. In Logo collection they choose Table, Area or Chairman, select the relevant Area, and choose RT 1–400 for Table uploads. Files must be PNG, JPG or WebP and under 3 MB; this stays below Vercel's request payload limit. Transparent originals work best on coloured strips. Backgrounds inside the logo files remain unchanged.

The original two logos are default selections. Check the selected logos before export, especially after changing filters. Tags and added text are rendered without regenerating logo artwork. Flyer image processing stays on the member's device.

Removing a logo sets `removed_at` and hides it from the shared picker. It does not change previously downloaded flyers. A database administrator can restore it by clearing `removed_at`. The original file is retained; physical cleanup can be performed through the Supabase Storage API after a deliberate retention decision.

## 6. Validate your live setup

- Create one owner account and one separate member account, with email confirmation.
- Confirm member uploads succeed and appear to the other account.
- Confirm a member cannot remove a logo or add an Official logo, including via direct API requests.
- Confirm the owner can remove a member logo and it disappears on refresh.
- Test Area 1 and Area 18, RT 1 and RT 400, and Area Logos filtering.
- Test confirmation and password recovery by opening an email link on a second device.
- Upload a flyer; add logos, tags and text; change the strip colour; download and open the JPEG.
- Check mobile layout and font appearance on a real phone.

Local validation is described in `VALIDATION.md`. Live Supabase email delivery and Vercel hosting cannot be validated until your accounts are connected/configured.

## Local commands

```bash
npm ci
cp .env.example .env.local
# Fill in your real Supabase public values in .env.local
npm run dev
npm run typecheck
npm test
npm run build
```

## Moving data from the Sites edition

The provided original RTI and Area 18 files are already included. Additional logos uploaded to the previous Sites edition are not automatically transferred: download those originals and upload them into this app. Sites admin identity is not reused; assign your confirmed Supabase email using the SQL above. This avoids carrying over an unrelated account identifier.

## References

- Supabase SSR: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Supabase email limits/SMTP: https://supabase.com/docs/guides/auth/auth-smtp
- Vercel Next.js: https://vercel.com/docs/frameworks/full-stack/nextjs
