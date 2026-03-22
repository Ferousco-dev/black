-- Reading history for resume shelf
create table if not exists public.reading_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  post_id uuid references public.posts(id) on delete cascade not null,
  progress numeric default 0,
  last_read_at timestamptz default now(),
  created_at timestamptz default now()
);

create unique index if not exists reading_history_user_post_idx on public.reading_history(user_id, post_id);
create index if not exists reading_history_user_last_idx on public.reading_history(user_id, last_read_at desc);

alter table public.reading_history enable row level security;

create policy "Users manage own reading history"
  on public.reading_history
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
  