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

Pull requests and pushes to `master` run formatting, linting, type-checking, and a production build. After the checks pass on a push or manual run from `master`, GitHub Actions builds an image, publishes it to `gcr.io/ferm-ferm/ferm`, and deploys it to the `ferm` Cloud Run service in `us-central1`.

Deployment uses Google Workload Identity Federation, so GitHub does not store a service-account key. It requires these repository variables:

- `GCP_PROJECT_ID`
- `GCP_REGION`
- `CLOUD_RUN_SERVICE`
- `WIF_PROVIDER`
- `WIF_SERVICE_ACCOUNT`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`

The workflow only changes the deployed image. Existing Cloud Run runtime configuration, including non-public values from `.env.example`, remains attached to the service and is not baked into the image.

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
