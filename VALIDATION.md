# Validation

The portable Next.js application was verified locally on 7 September 2026.

- Production Next.js build passed, including TypeScript checking and page generation.
- Five automated checks passed:
  1. Area/RT/category filtering, including Area 18, Area 1, RT 1 and RT 400.
  2. Upload metadata names and Area/RT boundary validation.
  3. Original image placement, proportions and header/footer geometry.
  4. Activity tag layout, custom background colour, and clipping added text away from logo artwork.
  5. The complete SQL schema executed against a local PostgreSQL-compatible PGlite database with mocked Supabase auth/storage schemas. Database role tests verified member uploads, shared reading, denial of member moderation and self-promotion, admin removal, invalid numeric limits and cross-user file paths.

The original RTI and Area 18 asset files were copied unchanged from the existing project. The composition code trims only the measured blank outer margins of those two supplied images.

Supabase packages are pinned and the npm lockfile is included. No service-role key, setup token, Sites credential, user password, or real environment file is in the package.

Limits: no live Supabase project or Vercel deployment was available for this work. PGlite verifies PostgreSQL constraints and RLS, but does not run Supabase Auth, its email service, Storage's file server or the Vercel runtime. Email delivery, deployed cookies, real uploads/downloads and browser visual checks remain deployment validation steps in SETUP.md. No live email delivery was triggered.
