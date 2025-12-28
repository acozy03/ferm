create table if not exists prep_chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  interview_id uuid references interviews(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists prep_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references prep_chats(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now(),
  metadata jsonb
);

create index if not exists prep_chats_user_id_idx on prep_chats(user_id);
create index if not exists prep_chats_interview_id_idx on prep_chats(interview_id);
create index if not exists prep_messages_chat_created_idx on prep_messages(chat_id, created_at);

alter table prep_chats enable row level security;
alter table prep_messages enable row level security;

create policy if not exists "Users can view their prep chats" on prep_chats
  for select using (auth.uid() = user_id);

create policy if not exists "Users can insert their prep chats" on prep_chats
  for insert with check (auth.uid() = user_id);

create policy if not exists "Users can update their prep chats" on prep_chats
  for update using (auth.uid() = user_id);

create policy if not exists "Users can delete their prep chats" on prep_chats
  for delete using (auth.uid() = user_id);

create policy if not exists "Users can view their prep messages" on prep_messages
  for select using (
    exists (select 1 from prep_chats c where c.id = chat_id and c.user_id = auth.uid())
  );

create policy if not exists "Users can insert prep messages for their chats" on prep_messages
  for insert with check (
    exists (select 1 from prep_chats c where c.id = chat_id and c.user_id = auth.uid())
  );

create policy if not exists "Users can update prep messages for their chats" on prep_messages
  for update using (
    exists (select 1 from prep_chats c where c.id = chat_id and c.user_id = auth.uid())
  );

create policy if not exists "Users can delete prep messages for their chats" on prep_messages
  for delete using (
    exists (select 1 from prep_chats c where c.id = chat_id and c.user_id = auth.uid())
  );
