-- ============================================================
-- Central de Operações — Buzina Digital
-- Schema Supabase
-- Execute no SQL Editor do seu projeto Supabase
-- ============================================================

-- Extensões
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABELA: clientes
-- ============================================================
create table if not exists clientes (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,           -- URL: painel.buzinadigital.com.br/lpbasics
  nome        text not null,
  iniciais    text not null,                  -- ex: "LP"
  plano       text not null default '',
  inicio      text not null default '',       -- ex: "Março 2024"
  instagram   text not null default '',       -- ex: "@lpbasics"
  duracao     text not null default '',       -- ex: "12 meses"
  seguidores_inicial    text not null default '0',  -- fixo no cadastro, ex: "10,1 mil"
  seguidores_atual      text not null default '0',  -- editável
  seguidores_atualizado_em date,
  media_views_inicial   text not null default '0',  -- fixo no cadastro
  cor_classe  text not null default '',       -- para cor do avatar (opcional)
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

-- ============================================================
-- TABELA: responsaveis
-- ============================================================
create table if not exists responsaveis (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes(id) on delete cascade,
  nome        text not null,
  iniciais    text not null,
  cargo       text not null default '',
  contato     text not null default '',
  ordem       int not null default 1,        -- 0 = admin (Anderson), locked
  is_admin    boolean not null default false
);

create index if not exists idx_responsaveis_cliente on responsaveis(cliente_id);

-- ============================================================
-- TABELA: conquistas
-- ============================================================
create table if not exists conquistas (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes(id) on delete cascade,
  texto       text not null,
  criado_em   timestamptz not null default now()
);

create index if not exists idx_conquistas_cliente on conquistas(cliente_id);

-- ============================================================
-- TABELA: ideias
-- ============================================================
create table if not exists ideias (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references clientes(id) on delete cascade,
  titulo        text not null,
  formato       text not null default 'reel',  -- reel | carrossel | stories | feed
  data_prevista date,
  descricao     text not null default '',
  conceito      text not null default '',
  links         text not null default '',
  obs           text not null default '',
  aprovada      boolean not null default false,
  criado_em     timestamptz not null default now()
);

create index if not exists idx_ideias_cliente on ideias(cliente_id);

-- ============================================================
-- TABELA: roteiros
-- ============================================================
create table if not exists roteiros (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references clientes(id) on delete cascade,
  ideia_id      uuid references ideias(id) on delete set null,
  titulo        text not null,
  formato       text not null default 'reel',
  data_prevista date,
  script        text not null default '',
  roteirizado   boolean not null default false,
  gravado       boolean not null default false,
  publicado     boolean not null default false,
  criado_em     timestamptz not null default now()
);

create index if not exists idx_roteiros_cliente on roteiros(cliente_id);

-- ============================================================
-- TABELA: eventos_calendario
-- ============================================================
create table if not exists eventos_calendario (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes(id) on delete cascade,
  dia         int not null check (dia between 1 and 31),
  titulo      text not null,
  tipo        text not null default 'reel',   -- reel | carrossel | stories | feed
  criado_em   timestamptz not null default now()
);

create index if not exists idx_eventos_cliente on eventos_calendario(cliente_id);

-- ============================================================
-- TABELA: feedback
-- Central de Operações — sugestões, críticas e melhorias
-- ============================================================
create table if not exists feedback (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null check (tipo in ('sugestão', 'crítica', 'melhoria')),
  mensagem    text not null,
  nome        text,                            -- opcional
  origem      text not null default 'desconhecida', -- 'admin' | slug do cliente
  criado_em   timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Habilitar RLS em todas as tabelas
alter table clientes          enable row level security;
alter table responsaveis      enable row level security;
alter table conquistas        enable row level security;
alter table ideias            enable row level security;
alter table roteiros          enable row level security;
alter table eventos_calendario enable row level security;
alter table feedback          enable row level security;

-- -------------------------------------------------------
-- CLIENTES: anon pode ler (para páginas de cliente),
--           só autenticado pode escrever
-- -------------------------------------------------------
create policy "clientes_select_anon"
  on clientes for select
  to anon, authenticated
  using (ativo = true);

create policy "clientes_insert_auth"
  on clientes for insert
  to authenticated
  with check (true);

create policy "clientes_update_auth"
  on clientes for update
  to authenticated
  using (true);

create policy "clientes_delete_auth"
  on clientes for delete
  to authenticated
  using (true);

-- -------------------------------------------------------
-- RESPONSÁVEIS
-- -------------------------------------------------------
create policy "responsaveis_select_anon"
  on responsaveis for select
  to anon, authenticated
  using (true);

create policy "responsaveis_write_auth"
  on responsaveis for all
  to authenticated
  using (true)
  with check (true);

-- -------------------------------------------------------
-- CONQUISTAS
-- -------------------------------------------------------
create policy "conquistas_select_anon"
  on conquistas for select
  to anon, authenticated
  using (true);

create policy "conquistas_write_auth"
  on conquistas for all
  to authenticated
  using (true)
  with check (true);

-- -------------------------------------------------------
-- IDEIAS — anon pode ler e inserir (clientes sugerem ideias)
--          só autenticado pode deletar ou aprovar
-- -------------------------------------------------------
create policy "ideias_select_anon"
  on ideias for select
  to anon, authenticated
  using (true);

create policy "ideias_insert_anon"
  on ideias for insert
  to anon, authenticated
  with check (true);

create policy "ideias_update_auth"
  on ideias for update
  to authenticated
  using (true);

create policy "ideias_delete_auth"
  on ideias for delete
  to authenticated
  using (true);

-- -------------------------------------------------------
-- ROTEIROS
-- -------------------------------------------------------
create policy "roteiros_select_anon"
  on roteiros for select
  to anon, authenticated
  using (true);

create policy "roteiros_write_auth"
  on roteiros for all
  to authenticated
  using (true)
  with check (true);

-- -------------------------------------------------------
-- EVENTOS CALENDÁRIO
-- -------------------------------------------------------
create policy "eventos_select_anon"
  on eventos_calendario for select
  to anon, authenticated
  using (true);

create policy "eventos_write_auth"
  on eventos_calendario for all
  to authenticated
  using (true)
  with check (true);

-- -------------------------------------------------------
-- FEEDBACK — qualquer um pode inserir, só autenticado lê
-- -------------------------------------------------------
create policy "feedback_insert_anon"
  on feedback for insert
  to anon, authenticated
  with check (true);

create policy "feedback_select_auth"
  on feedback for select
  to authenticated
  using (true);

-- ============================================================
-- SEED: Anderson Becker como admin fixo
-- (será adicionado automaticamente em todo cliente criado pelo JS)
-- Apenas para referência — o JS faz o insert ao criar cliente.
-- ============================================================

-- ============================================================
-- FIM DO SCHEMA
-- ============================================================
