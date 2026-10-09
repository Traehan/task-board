-- Relay task board: full database schema.
-- Paste into the Supabase SQL editor on a fresh project to recreate it.
-- Every row carries user_id, and Row Level Security limits each guest to their own rows.

create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null check (char_length(btrim(title)) between 1 and 200),
  description text not null default '',
  status      text not null default 'todo'   check (status in ('todo', 'in_progress', 'in_review', 'done')),
  priority    text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  due_date    date,
  position    double precision not null default 0,
  created_at  timestamptz not null default now(),
  unique (id, user_id)
);

create table public.team_members (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 60),
  color      text not null default '#2F5BEA',
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.labels (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 30),
  color      text not null default '#7B5CF0',
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

-- Join tables. The composite foreign keys guarantee a link can only connect
-- a task and a member/label that belong to the same user.
create table public.task_assignees (
  task_id   uuid not null,
  member_id uuid not null,
  user_id   uuid not null default auth.uid(),
  primary key (task_id, member_id),
  foreign key (task_id, user_id)   references public.tasks (id, user_id)        on delete cascade,
  foreign key (member_id, user_id) references public.team_members (id, user_id) on delete cascade
);

create table public.task_labels (
  task_id  uuid not null,
  label_id uuid not null,
  user_id  uuid not null default auth.uid(),
  primary key (task_id, label_id),
  foreign key (task_id, user_id)  references public.tasks (id, user_id)  on delete cascade,
  foreign key (label_id, user_id) references public.labels (id, user_id) on delete cascade
);

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null,
  user_id    uuid not null default auth.uid(),
  body       text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  foreign key (task_id, user_id) references public.tasks (id, user_id) on delete cascade
);

create table public.activity (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null,
  user_id    uuid not null,
  type       text not null,
  meta       jsonb not null default '{}',
  created_at timestamptz not null default now(),
  foreign key (task_id, user_id) references public.tasks (id, user_id) on delete cascade
);

create index tasks_board_idx           on public.tasks (user_id, status, position);
create index team_members_user_idx     on public.team_members (user_id);
create index labels_user_idx           on public.labels (user_id);
create index task_assignees_task_idx   on public.task_assignees (task_id, user_id);
create index task_assignees_member_idx on public.task_assignees (member_id, user_id);
create index task_labels_task_idx      on public.task_labels (task_id, user_id);
create index task_labels_label_idx     on public.task_labels (label_id, user_id);
create index comments_task_idx         on public.comments (task_id, user_id, created_at);
create index activity_task_idx         on public.activity (task_id, user_id, created_at);

-- Row Level Security: a guest can only touch rows where user_id is their own id.
alter table public.tasks          enable row level security;
alter table public.team_members   enable row level security;
alter table public.labels         enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_labels    enable row level security;
alter table public.comments       enable row level security;
alter table public.activity       enable row level security;

create policy "own rows" on public.tasks          for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows" on public.team_members   for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows" on public.labels         for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows" on public.task_assignees for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows" on public.task_labels    for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows" on public.comments       for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- Activity is read-only for users. Only the triggers below write to it.
create policy "read own rows" on public.activity  for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.tasks, public.team_members, public.labels, public.task_assignees,
              public.task_labels, public.comments, public.activity from anon, authenticated;
grant select, insert, update, delete on public.tasks, public.team_members, public.labels,
              public.task_assignees, public.task_labels, public.comments to authenticated;
grant select on public.activity to authenticated;

-- Activity log: written by the database so the history cannot be skipped or faked by the client.
create function public.log_task_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activity (task_id, user_id, type, meta)
    values (new.id, new.user_id, 'created', jsonb_build_object('to', new.status));
    return null;
  end if;
  if new.status is distinct from old.status then
    insert into public.activity (task_id, user_id, type, meta)
    values (new.id, new.user_id, 'moved', jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  if new.title is distinct from old.title then
    insert into public.activity (task_id, user_id, type, meta)
    values (new.id, new.user_id, 'renamed', jsonb_build_object('from', old.title, 'to', new.title));
  end if;
  if new.description is distinct from old.description then
    insert into public.activity (task_id, user_id, type) values (new.id, new.user_id, 'description');
  end if;
  if new.priority is distinct from old.priority then
    insert into public.activity (task_id, user_id, type, meta)
    values (new.id, new.user_id, 'priority', jsonb_build_object('from', old.priority, 'to', new.priority));
  end if;
  if new.due_date is distinct from old.due_date then
    insert into public.activity (task_id, user_id, type, meta)
    values (new.id, new.user_id, 'due_date', jsonb_build_object('from', old.due_date, 'to', new.due_date));
  end if;
  return null;
end $$;

create function public.log_link_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  link record;
  item_name text;
  kind text;
begin
  if tg_op = 'DELETE' then link := old; else link := new; end if;
  -- When a whole task is deleted its links cascade away; there is nothing left to log against.
  if not exists (select 1 from public.tasks where id = link.task_id) then return null; end if;

  if tg_table_name = 'task_assignees' then
    select name into item_name from public.team_members where id = link.member_id;
    kind := case tg_op when 'INSERT' then 'assigned' else 'unassigned' end;
  else
    select name into item_name from public.labels where id = link.label_id;
    kind := case tg_op when 'INSERT' then 'label_added' else 'label_removed' end;
  end if;

  insert into public.activity (task_id, user_id, type, meta)
  values (link.task_id, link.user_id, kind, jsonb_build_object('name', item_name));
  return null;
end $$;

revoke execute on function public.log_task_activity() from public, anon, authenticated;
revoke execute on function public.log_link_activity() from public, anon, authenticated;

create trigger tasks_activity after insert or update on public.tasks
  for each row execute function public.log_task_activity();
create trigger task_assignees_activity after insert or delete on public.task_assignees
  for each row execute function public.log_link_activity();
create trigger task_labels_activity after insert or delete on public.task_labels
  for each row execute function public.log_link_activity();
