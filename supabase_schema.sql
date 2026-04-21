-- SCHEMA PER PROJECT MUSE
-- Da eseguire nell'Editor SQL di Supabase

-- 1. Tabella PROGETTI
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Projects
alter table public.projects enable row level security;
create policy "Users can only see their own projects" on public.projects
  for all using (auth.uid() = user_id);

-- 2. Tabella CAPITOLI
create table public.chapters (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  order_index integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.chapters enable row level security;
create policy "Users can access chapters of their projects" on public.chapters
  for all using (
    exists (
      select 1 from public.projects 
      where projects.id = chapters.project_id 
      and projects.user_id = auth.uid()
    )
  );

-- 3. Tabella SCENE
create table public.scenes (
  id uuid default gen_random_uuid() primary key,
  chapter_id uuid references public.chapters(id) on delete cascade not null,
  title text not null,
  content text default '',
  order_index integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.scenes enable row level security;
create policy "Users can access scenes of their projects" on public.scenes
  for all using (
    exists (
      select 1 from public.chapters
      join public.projects on projects.id = chapters.project_id
      where chapters.id = scenes.chapter_id 
      and projects.user_id = auth.uid()
    )
  );

-- 4. Tabella PERSONAGGI
create table public.characters (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  bio text default '',
  psychology text default '',
  evolution text default '',
  relations text default '',
  avatar_url text default '',
  avatar_pos_x integer default 50,
  avatar_pos_y integer default 50,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.characters enable row level security;
create policy "Users can access characters of their projects" on public.characters
  for all using (
    exists (
      select 1 from public.projects 
      where projects.id = characters.project_id 
      and projects.user_id = auth.uid()
    )
  );

-- 5. Tabella INTERVISTE
create table public.character_interviews (
  id uuid default gen_random_uuid() primary key,
  character_id uuid references public.characters(id) on delete cascade not null,
  question text not null,
  answer text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.character_interviews enable row level security;
create policy "Users can access interviews of their characters" on public.character_interviews
  for all using (
    exists (
      select 1 from public.characters
      join public.projects on projects.id = characters.project_id
      where characters.id = character_interviews.character_id 
      and projects.user_id = auth.uid()
    )
  );

-- 6. Tabella AMBIENTI (World)
create table public.settings (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  type text check (type in ('Primary', 'Secondary')),
  description text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.settings enable row level security;
create policy "Users can access settings of their projects" on public.settings
  for all using (
    exists (
      select 1 from public.projects 
      where projects.id = settings.project_id 
      and projects.user_id = auth.uid()
    )
  );

-- 7. Tabella MINDMAPS
create table public.mindmaps (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text default 'Main Mindmap',
  nodes jsonb default '[]'::jsonb,
  edges jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.mindmaps enable row level security;
create policy "Users can access mindmaps of their projects" on public.mindmaps
  for all using (
    exists (
      select 1 from public.projects 
      where projects.id = mindmaps.project_id 
      and projects.user_id = auth.uid()
    )
  );

-- 8. Tabella NOTES
create table public.notes (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  content text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.notes enable row level security;
create policy "Users can access notes of their projects" on public.notes
  for all using (
    exists (
      select 1 from public.projects 
      where projects.id = notes.project_id 
      and projects.user_id = auth.uid()
    )
  );

-- 9. Tabella USER PROFILES
create table public.user_profiles (
  user_id uuid references auth.users(id) on delete cascade primary key,
  gemini_api_key text,
  ai_settings jsonb default '{"provider": "groq", "model": "llama-3.3-70b-versatile"}'::jsonb,
  updated_at timestamp with time zone default now()
);

alter table public.user_profiles enable row level security;
create policy "Users can only see their own profile" on public.user_profiles
  for all using (auth.uid() = user_id);
