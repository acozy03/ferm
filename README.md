# ferm

ferm is a Next.js application for tracking job applications, preparing for interviews, and managing follow-ups.

## Local development

Requirements:

- Node.js 22.13 or newer
- pnpm 11.18.0
- A Supabase project

Set up and start the application:

```sh
cp .env.example .env.local
pnpm install --frozen-lockfile
pnpm dev
```

Fill in the Supabase values in `.env.local` before opening <http://localhost:3000>. Other integrations in `.env.example` can be configured as needed for AI, voice, email, rate limiting, and browser-extension access.

## Checks

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
```

Use `pnpm format` to apply Prettier formatting. CI requires formatting, linting, type-checking, and the production build to pass.

## CI/CD

Pull requests and pushes to `master` run formatting, linting, type-checking, and a production build. Successful pushes to `master`, version tags, and manual workflow runs publish a container to `ghcr.io/cosentinode/ferm`.

Configure these GitHub repository variables so the published client bundle points at the production Supabase project:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`

All non-public values from `.env.example` must be supplied to the container at runtime. They are intentionally not baked into the image.

Build and run the image locally with:

```sh
docker build \
  --build-arg NEXT_PUBLIC_SITE_URL=http://localhost:3000 \
  --build-arg SITE_URL=http://localhost:3000 \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key \
  -t ferm .
docker run --env-file .env.local -p 3000:3000 ferm
```
