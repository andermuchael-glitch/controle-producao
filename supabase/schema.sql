-- Supabase schema for the controle-producao migration.
-- Run in Supabase SQL Editor only after reviewing the backup.
create extension if not exists pgcrypto;

create table if not exists public.controle_producao_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.controle_producao_state enable row level security;
create policy "Authenticated users can read production state"
  on public.controle_producao_state for select to authenticated using (true);
create policy "Authenticated users can insert production state"
  on public.controle_producao_state for insert to authenticated with check (true);
create policy "Authenticated users can update production state"
  on public.controle_producao_state for update to authenticated using (true) with check (true);

create table if not exists public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  nome text not null default '',
  atualizado_em timestamptz not null default now()
);
alter table public.usuarios enable row level security;
create policy "Users can read profiles"
  on public.usuarios for select to authenticated using (true);
create policy "Users can create own profile"
  on public.usuarios for insert to authenticated with check (id = auth.uid());
create policy "Users can update own profile"
  on public.usuarios for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create table if not exists public.auditoria_producao (
  id uuid primary key default gen_random_uuid(),
  usuario_email text not null default '',
  registro jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);
alter table public.auditoria_producao enable row level security;
create policy "Authenticated users can create audit entries for themselves"
  on public.auditoria_producao for insert to authenticated
  with check (lower(usuario_email) = lower(coalesce(auth.jwt() ->> 'email', '')));
create policy "Admin can read production audit"
  on public.auditoria_producao for select to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'andermuchael@gmail.com');

-- Messaging schema is included for the planned migration of internal chat.
create table if not exists public.conversas (
  id text primary key,
  participantes uuid[] not null default '{}',
  ultima_mensagem_em timestamptz,
  ultima_mensagem_id text,
  ultima_mensagem_remetente_id uuid references auth.users(id) on delete set null,
  ultima_mensagem_remetente_email text,
  ultima_mensagem_resumo text,
  criado_em timestamptz not null default now()
);
alter table public.conversas enable row level security;
create policy "Participants can read conversations"
  on public.conversas for select to authenticated using (auth.uid() = any(participantes));
create policy "Participants can create conversations"
  on public.conversas for insert to authenticated with check (auth.uid() = any(participantes));
create policy "Participants can update conversations"
  on public.conversas for update to authenticated
  using (auth.uid() = any(participantes))
  with check (auth.uid() = any(participantes));

create table if not exists public.mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id text not null references public.conversas(id) on delete cascade,
  remetente_id uuid not null references auth.users(id) on delete cascade,
  remetente_email text not null default '',
  conteudo text not null,
  criado_em timestamptz not null default now()
);
alter table public.mensagens enable row level security;
create policy "Participants can read messages"
  on public.mensagens for select to authenticated using (
    exists (select 1 from public.conversas c
      where c.id = conversa_id and auth.uid() = any(c.participantes))
  );
create policy "Participants can send their own messages"
  on public.mensagens for insert to authenticated with check (
    remetente_id = auth.uid() and exists (
      select 1 from public.conversas c
      where c.id = conversa_id and auth.uid() = any(c.participantes)
    )
  );

-- Isolated staging table for the Excel backup. Import and compare here first;
-- do not write the XLSX rows directly into live application state.
create table if not exists public.producao_import_staging (
  id bigint generated always as identity primary key,
  source_row integer,
  pedido text,
  produto text,
  quantidade numeric,
  etapa text,
  cor text,
  equipe text,
  sublimador text,
  data_corte date,
  data_sublimacao date,
  data_entrega date,
  imported_at timestamptz not null default now()
);
alter table public.producao_import_staging enable row level security;
-- Intentionally no client policies: staging import should be done by an authorized
-- operator through the Supabase dashboard, not exposed to the public frontend.
