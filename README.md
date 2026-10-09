# Relay

A Kanban task board. Create tasks, drag them across To Do, In Progress, In Review and Done, and keep track of who is on what.

Built with React, TypeScript and Vite on the frontend, and Supabase for the database and auth. There is no separate backend. The app talks to Supabase directly and Row Level Security keeps every guest's data private.

## Features

- Drag and drop between columns and reorder inside a column (mouse, touch and keyboard)
- Guest accounts. A session is created on first visit, no sign up needed
- Task details with description, priority and due date
- Team members with assignee avatars on cards
- Labels with board filtering
- Comments on each task
- Activity log for every task, written by database triggers
- Due date badges for overdue, due today and due soon
- Search plus filters for priority, assignee and label
- Board summary with total, done and overdue counts

## Run it locally

You need Node 20 or newer and a free Supabase project.

1. Install dependencies

   ```bash
   npm install
   ```

2. Set up the database. Open the SQL editor in your Supabase project and run everything in [`supabase/schema.sql`](supabase/schema.sql).

3. In the Supabase dashboard go to Authentication > Sign In / Providers and turn on **Allow anonymous sign-ins**.

4. Copy `.env.example` to `.env.local` and fill in your project URL and public anon key (Project Settings > API).

5. Start the app

   ```bash
   npm run dev
   ```

## How it is organized

```
src/
  lib/types.ts        data shapes and constants
  lib/supabase.ts     Supabase client and guest sign in
  lib/api.ts          every database call
  lib/utils.ts        dates, filtering and card ordering
  lib/sample.ts       sample tasks for a new board
  hooks/useBoard.ts   all board state and actions
  components/         the UI
supabase/schema.sql   tables, RLS policies and triggers
```

## Security

- Only the public anon key is used in the frontend. The service role key is never used.
- RLS is on for every table. Each policy checks `auth.uid() = user_id`.
- Keys live in `.env.local`, which is ignored by git.
