-- Cadastro depois do login: nome e WhatsApp que a pessoa preenche no popup. Pode rodar mais de uma vez.
-- Rodar no SQL Editor do Supabase DEPOIS do migracao-painel.sql.

alter table public.usuarios add column if not exists nome_cadastro  text;         -- nome que a pessoa digitou (o "nome" é o da conta Google)
alter table public.usuarios add column if not exists whatsapp       text;         -- só números, com DDD (ex.: 11987654321)
alter table public.usuarios add column if not exists cadastrado_em  timestamptz;  -- quando preencheu o popup
