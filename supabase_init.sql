-- Project Muse: Supabase Database Schema
-- Inkwell Edition Initialization Script

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. USER PROFILES
create table if not exists public.user_profiles (
  user_id uuid references auth.users on delete cascade primary key,
  deepseek_api_key text,
  ai_settings jsonb default '{"provider": "groq", "model": "llama-3.3-70b-versatile"}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_profiles enable row level security;

create policy "Users can view own profile" on public.user_profiles
  for select using (auth.uid() = user_id);

create policy "Users can update own profile" on public.user_profiles
  for update using (auth.uid() = user_id);

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. PROJECTS
create table if not exists public.projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.projects enable row level security;

create policy "Users can manage their own projects" on public.projects
  for all using (auth.uid() = user_id);


-- 3. CHAPTERS
create table if not exists public.chapters (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects on delete cascade not null,
  title text not null,
  order_index integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.chapters enable row level security;

create policy "Users can manage chapters of their projects" on public.chapters
  for all using (
    exists (
      select 1 from public.projects
      where projects.id = chapters.project_id
      and projects.user_id = auth.uid()
    )
  );


-- 4. SCENES
create table if not exists public.scenes (
  id uuid default uuid_generate_v4() primary key,
  chapter_id uuid references public.chapters on delete cascade not null,
  title text not null,
  content text default '',
  order_index integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.scenes enable row level security;

create policy "Users can manage scenes of their projects" on public.scenes
  for all using (
    exists (
      select 1 from public.chapters
      join public.projects on projects.id = chapters.project_id
      where chapters.id = scenes.chapter_id
      and projects.user_id = auth.uid()
    )
  );


-- 5. CHARACTERS
create table if not exists public.characters (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects on delete cascade not null,
  name text not null,
  bio text default '',
  psychology text default '',
  evolution text default '',
  relations text default '',
  avatar_url text,
  avatar_pos_x integer default 50,
  avatar_pos_y integer default 50,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.characters enable row level security;

create policy "Users can manage characters of their projects" on public.characters
  for all using (
    exists (
      select 1 from public.projects
      where projects.id = characters.project_id
      and projects.user_id = auth.uid()
    )
  );


-- 6. CHARACTER INTERVIEWS
create table if not exists public.character_interviews (
  id uuid default uuid_generate_v4() primary key,
  character_id uuid references public.characters on delete cascade not null,
  question text not null,
  answer text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.character_interviews enable row level security;

create policy "Users can manage interviews of their characters" on public.character_interviews
  for all using (
    exists (
      select 1 from public.characters
      join public.projects on projects.id = characters.project_id
      where characters.id = character_interviews.character_id
      and projects.user_id = auth.uid()
    )
  );


-- 7. WORLD SETTINGS
create table if not exists public.settings (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects on delete cascade not null,
  name text not null,
  type text check (type in ('Primary', 'Secondary')),
  category text check (category in ('location', 'object')),
  description text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.settings enable row level security;

create policy "Users can manage settings of their projects" on public.settings
  for all using (
    exists (
      select 1 from public.projects
      where projects.id = settings.project_id
      and projects.user_id = auth.uid()
    )
  );


-- 8. NOTES
create table if not exists public.notes (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects on delete cascade not null,
  title text not null,
  content text default '',
  order_index integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.notes enable row level security;

create policy "Users can manage notes of their projects" on public.notes
  for all using (
    exists (
      select 1 from public.projects
      where projects.id = notes.project_id
      and projects.user_id = auth.uid()
    )
  );

-- Function to handle note updates
create or replace function public.handle_note_update()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_note_updated
  before update on public.notes
  for each row execute procedure public.handle_note_update();

-- Add timeline_events to scenes
ALTER TABLE public.scenes ADD COLUMN IF NOT EXISTS timeline_events jsonb DEFAULT '[]'::jsonb;

-- Ensure RLS allows selecting and updating this column (usually handled by existing policies on 'scenes')
