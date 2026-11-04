-- =====================================================================
-- PORTAL SAGRADA FAMÍLIA — Controle de Saída e Autorização de Alunos
-- Estrutura completa do banco de dados (Supabase / PostgreSQL)
--
-- Como usar: Supabase > SQL Editor > New query > cole este arquivo
-- inteiro > Run. Pode ser executado uma única vez em um projeto novo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tipos
-- ---------------------------------------------------------------------
create type public.user_role as enum ('admin', 'professor');

create type public.exit_reason as enum (
  'banheiro',
  'biblioteca',
  'setor_pedagogico',
  'outro'
);

-- ---------------------------------------------------------------------
-- 2. Tabelas
-- ---------------------------------------------------------------------

-- Perfis dos usuários (1:1 com auth.users). Senhas ficam somente no
-- serviço de autenticação do Supabase (com hash bcrypt), nunca aqui.
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null check (char_length(btrim(full_name)) between 3 and 120),
  email       text not null,
  role        public.user_role not null default 'professor',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Configurações gerais (linha única).
create table public.app_settings (
  id                  smallint primary key default 1 check (id = 1),
  professors_see_all  boolean not null default false,
  updated_at          timestamptz not null default now(),
  updated_by          uuid references public.profiles (id) on delete set null
);
insert into public.app_settings (id) values (1);

-- Autorizações de saída.
create table public.authorizations (
  id                  uuid primary key default gen_random_uuid(),
  code                bigint generated always as identity unique,
  teacher_name        text not null check (char_length(teacher_name) between 3 and 120),
  student_name        text not null check (char_length(student_name) between 3 and 120),
  school_year         text not null check (char_length(school_year) between 1 and 40),
  class_group         text not null check (char_length(class_group) between 1 and 20),
  authorization_date  date not null,
  exit_time           time not null,
  reason              public.exit_reason not null,
  notes               text check (notes is null or char_length(notes) <= 500),
  created_by          uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  updated_by          uuid references public.profiles (id) on delete set null,
  constraint authorizations_other_requires_notes
    check (reason <> 'outro' or char_length(btrim(coalesce(notes, ''))) >= 3)
);

create index authorizations_date_time_idx on public.authorizations (authorization_date desc, exit_time desc);
create index authorizations_created_by_idx on public.authorizations (created_by);
create index authorizations_class_idx on public.authorizations (school_year, class_group);
create index authorizations_reason_idx on public.authorizations (reason);

-- Registro de auditoria (somente leitura para administradores).
create table public.audit_log (
  id          bigint generated always as identity primary key,
  table_name  text not null,
  record_id   text not null,
  action      text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  actor_id    uuid,
  actor_name  text,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_record_idx on public.audit_log (table_name, record_id);

-- ---------------------------------------------------------------------
-- 3. Funções auxiliares de permissão
--    SECURITY DEFINER evita recursão de RLS ao consultar profiles.
-- ---------------------------------------------------------------------
create or replace function public.is_active_user()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active and role = 'admin'
  );
$$;

create or replace function public.professors_see_all()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select professors_see_all from public.app_settings where id = 1), false);
$$;

-- Data atual no fuso da escola.
create or replace function public.school_today()
returns date
language sql stable
as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

-- Normaliza espaços: "  maria   da  silva " -> "maria da silva"
create or replace function public.squish(value text)
returns text
language sql immutable
as $$
  select nullif(regexp_replace(btrim(coalesce(value, '')), '\s+', ' ', 'g'), '');
$$;

-- ---------------------------------------------------------------------
-- 4. Gatilhos de validação no servidor
-- ---------------------------------------------------------------------

-- Cria o perfil automaticamente quando um usuário é criado no Auth.
-- O papel NUNCA é lido dos metadados enviados pelo cliente: todo novo
-- usuário nasce "professor". Só um administrador pode promovê-lo.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_name text;
begin
  v_name := public.squish(new.raw_user_meta_data ->> 'full_name');
  if v_name is null or char_length(v_name) < 3 then
    v_name := split_part(new.email, '@', 1);
  end if;
  if char_length(v_name) < 3 then
    v_name := rpad(v_name, 3, '_');
  end if;

  insert into public.profiles (id, full_name, email)
  values (new.id, left(v_name, 120), lower(new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantém o e-mail do perfil sincronizado com o Auth.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.profiles set email = lower(new.email), updated_at = now()
  where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- Protege perfis: só administradores mudam papel/situação; o sistema
-- nunca pode ficar sem um administrador ativo.
create or replace function public.profiles_guard()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.full_name := public.squish(new.full_name);
  new.updated_at := now();

  -- Chamadas com a chave de serviço (Edge Function) não têm auth.uid().
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role
       or new.active is distinct from old.active
       or new.email is distinct from old.email then
      raise exception 'Somente administradores podem alterar papel, situação ou e-mail.'
        using errcode = '42501';
    end if;
  end if;

  if old.role = 'admin' and old.active
     and (new.role <> 'admin' or not new.active) then
    if not exists (
      select 1 from public.profiles
      where role = 'admin' and active and id <> old.id
    ) then
      raise exception 'O sistema precisa de pelo menos um administrador ativo.'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger profiles_before_update
  before update on public.profiles
  for each row execute function public.profiles_guard();

-- Valida e normaliza autorizações.
create or replace function public.authorizations_guard()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.teacher_name := public.squish(new.teacher_name);
  new.student_name := public.squish(new.student_name);
  new.school_year  := public.squish(new.school_year);
  new.class_group  := upper(public.squish(new.class_group));
  new.notes        := public.squish(new.notes);

  if new.authorization_date > public.school_today() then
    raise exception 'A data da autorização não pode estar no futuro.'
      using errcode = '22023';
  end if;

  if tg_op = 'INSERT' then
    -- O autor é sempre quem está logado; o cliente não escolhe.
    new.created_by := auth.uid();
    new.created_at := now();
    new.updated_at := now();
    new.updated_by := null;
    if new.authorization_date < public.school_today() - 30 then
      raise exception 'Registros novos só podem ter data dos últimos 30 dias.'
        using errcode = '22023';
    end if;
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_at := now();
    new.updated_by := auth.uid();
  end if;

  return new;
end;
$$;

create trigger authorizations_before_write
  before insert or update on public.authorizations
  for each row execute function public.authorizations_guard();

create or replace function public.app_settings_guard()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.id := 1;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger app_settings_before_update
  before update on public.app_settings
  for each row execute function public.app_settings_guard();

-- ---------------------------------------------------------------------
-- 5. Auditoria (alterações e exclusões ficam registradas)
-- ---------------------------------------------------------------------
create or replace function public.write_audit_log()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_name  text;
  v_id    text;
begin
  select full_name into v_name from public.profiles where id = v_actor;
  v_id := coalesce(
    case when tg_op = 'DELETE' then old.id::text else new.id::text end, '');

  insert into public.audit_log (table_name, record_id, action, actor_id, actor_name, old_data, new_data)
  values (
    tg_table_name,
    v_id,
    tg_op,
    v_actor,
    coalesce(v_name, case when v_actor is null then 'Sistema' else null end),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return null;
end;
$$;

create trigger authorizations_audit
  after insert or update or delete on public.authorizations
  for each row execute function public.write_audit_log();

create trigger profiles_audit
  after insert or update on public.profiles
  for each row execute function public.write_audit_log();

create trigger app_settings_audit
  after update on public.app_settings
  for each row execute function public.write_audit_log();

-- ---------------------------------------------------------------------
-- 6. Segurança em nível de linha (RLS)
-- ---------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.app_settings   enable row level security;
alter table public.authorizations enable row level security;
alter table public.audit_log      enable row level security;

-- Nenhum acesso para visitantes não autenticados.
revoke all on public.profiles, public.app_settings, public.authorizations, public.audit_log from anon;
revoke all on all sequences in schema public from anon;

grant select, update on public.profiles to authenticated;
grant select, update on public.app_settings to authenticated;
grant select, insert, update, delete on public.authorizations to authenticated;
grant select on public.audit_log to authenticated;

-- profiles
create policy "profiles: ver o próprio perfil ou admin vê todos"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles: admin atualiza qualquer perfil"
  on public.profiles for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "profiles: usuário atualiza o próprio nome"
  on public.profiles for update to authenticated
  using (id = auth.uid() and public.is_active_user())
  with check (id = auth.uid());

-- app_settings
create policy "settings: usuários ativos leem"
  on public.app_settings for select to authenticated
  using (public.is_active_user());

create policy "settings: admin altera"
  on public.app_settings for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- authorizations
create policy "authorizations: leitura conforme permissão"
  on public.authorizations for select to authenticated
  using (
    public.is_admin()
    or (
      public.is_active_user()
      and (created_by = auth.uid() or public.professors_see_all())
    )
  );

create policy "authorizations: usuários ativos registram"
  on public.authorizations for insert to authenticated
  with check (public.is_active_user());

create policy "authorizations: admin edita"
  on public.authorizations for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "authorizations: admin exclui"
  on public.authorizations for delete to authenticated
  using (public.is_admin());

-- audit_log (ninguém insere/edita/apaga pela API; só os gatilhos)
create policy "audit: somente admin lê"
  on public.audit_log for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- 7. Funções de consulta (respeitam a RLS de quem chama)
-- ---------------------------------------------------------------------
create or replace function public.dashboard_stats()
returns json
language sql stable security invoker set search_path = public
as $$
  select json_build_object(
    'today',  count(*) filter (where authorization_date = public.school_today()),
    'week',   count(*) filter (where authorization_date >= date_trunc('week', public.school_today())::date),
    'month',  count(*) filter (where authorization_date >= date_trunc('month', public.school_today())::date),
    'total',  count(*)
  )
  from public.authorizations;
$$;

create or replace function public.report_summary(p_start date, p_end date)
returns json
language sql stable security invoker set search_path = public
as $$
  with base as (
    select * from public.authorizations
    where authorization_date between p_start and p_end
  )
  select json_build_object(
    'total', (select count(*) from base),
    'by_day', coalesce((
      select json_agg(json_build_object('label', d, 'total', t) order by d)
      from (select authorization_date as d, count(*) as t from base group by 1) s), '[]'::json),
    'by_class', coalesce((
      select json_agg(json_build_object('label', l, 'total', t) order by t desc, l)
      from (select school_year || ' ' || class_group as l, count(*) as t from base group by 1) s), '[]'::json),
    'by_teacher', coalesce((
      select json_agg(json_build_object('label', l, 'total', t) order by t desc, l)
      from (select teacher_name as l, count(*) as t from base group by 1) s), '[]'::json),
    'by_reason', coalesce((
      select json_agg(json_build_object('label', l, 'total', t) order by t desc, l)
      from (select reason::text as l, count(*) as t from base group by 1) s), '[]'::json)
  );
$$;

-- Lista de turmas existentes (para os filtros).
create or replace function public.class_options()
returns table (school_year text, class_group text)
language sql stable security invoker set search_path = public
as $$
  select distinct school_year, class_group
  from public.authorizations
  order by school_year, class_group;
$$;

-- Funções: ninguém executa por padrão; liberamos só o necessário
-- para usuários autenticados (visitantes anônimos ficam sem acesso).
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;
revoke execute on all functions in schema public from authenticated;

grant execute on function public.dashboard_stats() to authenticated;
grant execute on function public.report_summary(date, date) to authenticated;
grant execute on function public.class_options() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.professors_see_all() to authenticated;
grant execute on function public.school_today() to authenticated;
grant execute on function public.squish(text) to authenticated;

-- ---------------------------------------------------------------------
-- 8. Sincronização em tempo real entre computadores
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.authorizations;
