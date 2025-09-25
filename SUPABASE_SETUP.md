# Supabase Integration Setup Guide

This guide will help you set up Supabase with your job tracking application step by step.

## Prerequisites

- A Supabase account (sign up at [supabase.com](https://supabase.com))
- Node.js and npm installed

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter a project name (e.g., "job-tracker")
5. Enter a database password (save this!)
6. Select a region close to your users
7. Click "Create new project"

## Step 2: Install Dependencies

Add the required Supabase packages to your project:

\`\`\`bash
npm install @supabase/supabase-js @supabase/ssr swr date-fns
\`\`\`

## Step 3: Get Your Supabase Credentials

1. In your Supabase dashboard, go to Settings → API
2. Copy your Project URL and anon/public key
3. Create a `.env.local` file in your project root:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
\`\`\`

## Step 4: Set Up the Database

### Option A: Using the Supabase Dashboard (Recommended)

1. Go to the SQL Editor in your Supabase dashboard
2. Copy and paste the contents of `scripts/01_create_tables.sql`
3. Click "Run" to create the tables
4. Repeat for `scripts/02_create_functions.sql`
5. Optionally run `scripts/03_seed_data.sql` for sample data

### Option B: Using the Scripts in v0

1. In v0, navigate to the Scripts folder
2. Run the SQL scripts in order:
   - `01_create_tables.sql`
   - `02_create_functions.sql`
   - `03_seed_data.sql` (optional)

## Step 5: Configure Row Level Security (RLS)

For now, we'll disable RLS for development. In production, you should enable proper RLS policies.

In the Supabase SQL Editor, run:

\`\`\`sql
-- Disable RLS for development (NOT recommended for production)
ALTER TABLE job_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE interviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log DISABLE ROW LEVEL SECURITY;
\`\`\`

## Step 6: Test the Connection

1. Start your development server: `npm run dev`
2. Open your application in the browser
3. Try adding a new job application
4. Check your Supabase dashboard to see if the data appears

## Step 7: Enable Real-time (Optional)

To get real-time updates when data changes:

1. In Supabase dashboard, go to Database → Replication
2. Enable replication for the tables you want to sync in real-time
3. The application will automatically receive updates

## Troubleshooting

### Common Issues

1. **"Invalid API key" error**
   - Double-check your environment variables
   - Make sure you're using the anon/public key, not the service role key
   - Restart your development server after adding environment variables

2. **"relation does not exist" error**
   - Make sure you've run all the SQL scripts
   - Check that the tables were created in the public schema

3. **CORS errors**
   - Ensure you're using the correct Supabase URL
   - Check that your domain is allowed in Supabase settings

4. **Data not appearing**
   - Check the browser console for errors
   - Verify the API routes are working by visiting them directly
   - Check Supabase logs in the dashboard

### Production Considerations

Before deploying to production:

1. **Enable Row Level Security (RLS)**
   \`\`\`sql
   ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
   ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
   ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
   \`\`\`

2. **Create RLS policies** for user-specific data access

3. **Set up authentication** if you need user accounts

4. **Configure environment variables** in your deployment platform

## Database Schema Overview

The application uses three main tables:

- **job_applications**: Stores job application data
- **interviews**: Stores interview information linked to applications
- **activity_log**: Tracks changes and activities for audit trail

All tables include automatic timestamps and proper indexing for performance.

## API Endpoints

The application provides these API endpoints:

- `GET/POST /api/job-applications` - List and create applications
- `GET/PUT/DELETE /api/job-applications/[id]` - Individual application operations
- `PUT/DELETE /api/job-applications/bulk` - Bulk operations
- `GET/POST /api/interviews` - Interview management
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/activity-log` - Activity timeline

## Support

If you encounter issues:

1. Check the browser console for errors
2. Review the Supabase dashboard logs
3. Ensure all environment variables are set correctly
4. Verify the database schema matches the expected structure
\`\`\`

```json file="" isHidden
