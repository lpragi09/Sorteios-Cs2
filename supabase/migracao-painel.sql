-- Migração do painel (usuários, parceiros, vencedores). Pode rodar mais de uma vez.
-- Rodar no SQL Editor do Supabase DEPOIS do schema.sql.

-- ========== USUÁRIOS DO SITE ==========
-- Gravado a cada login com o Google (src/lib/auth.ts)
create table if not exists public.usuarios (
  email          text primary key,
  nome           text,
  avatar_url     text,
  criado_em      timestamptz not null default now(),
  ultimo_acesso  timestamptz not null default now(),
  acessos        integer not null default 1,
  bloqueado      boolean not null default false     -- não consegue mandar ticket
);
create index if not exists usuarios_ultimo_idx on public.usuarios (ultimo_acesso desc);
create index if not exists usuarios_criado_idx on public.usuarios (criado_em desc);

-- Registra o login numa chamada só (sem corrida entre dois logins ao mesmo tempo)
create or replace function public.registrar_login(p_email text, p_nome text, p_avatar text)
returns void language sql security definer set search_path = public as $$
  insert into public.usuarios (email, nome, avatar_url)
  values (lower(p_email), p_nome, p_avatar)
  on conflict (email) do update
    set nome = coalesce(excluded.nome, usuarios.nome),
        avatar_url = coalesce(excluded.avatar_url, usuarios.avatar_url),
        ultimo_acesso = now(),
        acessos = usuarios.acessos + 1;
$$;
revoke all on function public.registrar_login(text, text, text) from public, anon, authenticated;
grant execute on function public.registrar_login(text, text, text) to service_role;

-- Quem já mandou ticket antes desta migração entra na lista
insert into public.usuarios (email, nome, avatar_url, criado_em, ultimo_acesso)
select email, max(nome), max(avatar_url), min(criado_em), max(criado_em) from public.tickets group by email
on conflict (email) do nothing;

-- ========== PARCEIROS ==========
create table if not exists public.parceiros (
  id          text primary key,                       -- curto, sem espaço (vai no ticket)
  nome        text not null,
  link        text not null,
  destaque    text,                                   -- "3 caixas grátis e 5% de bônus"
  imagem_url  text,
  ordem       integer not null default 0,
  ativo       boolean not null default true,          -- aparece no site e no formulário do ticket
  criado_em   timestamptz not null default now()
);
insert into public.parceiros (id, nome, link, destaque, imagem_url, ordem) values
  ('csgobig',  'CSGOBIG',  'https://csgobig.com/r/soares', '3 caixas grátis e 5% de bônus', '/parceiros/csgobig.webp', 1),
  ('dastskin', 'DASTSKIN', 'https://dast.skin/?ref=SOARES', 'Bônus com o código SOARES',     '/parceiros/dastskin.webp', 2)
on conflict (id) do nothing;

-- A casa do ticket agora é qualquer parceiro cadastrado
alter table public.tickets drop constraint if exists tickets_casa_check;

-- ========== VENCEDORES ==========
alter table public.ganhadores add column if not exists entregue boolean not null default false;
alter table public.ganhadores add column if not exists entregue_em timestamptz;

-- ========== ACESSO ==========
alter table public.usuarios  enable row level security;
alter table public.parceiros enable row level security;
revoke all on public.usuarios, public.parceiros from anon, authenticated;
grant all on public.usuarios, public.parceiros to service_role;
