\set ON_ERROR_STOP 1
insert into auth.users (id,email,raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a','Admin@Escola.com','{"full_name":"  Ana   Admin ","role":"admin"}'),
 ('00000000-0000-0000-0000-000000000001','p1@escola.com','{"full_name":"Paulo Um"}'),
 ('00000000-0000-0000-0000-000000000002','p2@escola.com','{"full_name":"Pedro Dois"}'),
 ('00000000-0000-0000-0000-000000000003','p3@escola.com','{}');
-- metadata "role":"admin" must be ignored
do $$ begin assert (select count(*) from profiles where role='admin')=0, 'role from metadata leaked'; end $$;
select id, full_name, email, role from profiles order by email;
update profiles set role='admin' where email='admin@escola.com';   -- primeiro admin (via SQL Editor)
update profiles set active=false where email='p3@escola.com';

create or replace function pg_temp.act(u text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u, false); end $$;

-- ===== P1 =====
set role authenticated; select pg_temp.act('00000000-0000-0000-0000-000000000001');
insert into authorizations (teacher_name,student_name,school_year,class_group,authorization_date,exit_time,reason,created_by)
values ('  Paulo   Um ','joão   da silva','8º ano',' b ',school_today(),'10:15','banheiro','00000000-0000-0000-0000-000000000002');
do $$ declare r record; begin
  select * into r from authorizations; 
  assert r.created_by='00000000-0000-0000-0000-000000000001', 'created_by spoof';
  assert r.teacher_name='Paulo Um' and r.student_name='joão da silva' and r.class_group='B', 'normalize';
end $$;
do $$ begin
  begin insert into authorizations (teacher_name,student_name,school_year,class_group,authorization_date,exit_time,reason)
        values ('Paulo Um','Aluno X','8º ano','B',school_today()+1,'10:00','banheiro'); raise exception 'FAIL future';
  exception when sqlstate '22023' then raise notice 'ok: futuro bloqueado'; end;
  begin insert into authorizations (teacher_name,student_name,school_year,class_group,authorization_date,exit_time,reason)
        values ('Paulo Um','Aluno X','8º ano','B',school_today(),'10:00','outro'); raise exception 'FAIL outro';
  exception when check_violation then raise notice 'ok: outro exige observação'; end;
  begin insert into authorizations (teacher_name,student_name,school_year,class_group,authorization_date,exit_time,reason)
        values ('Paulo Um','Aluno X','8º ano','B',school_today()-40,'10:00','banheiro'); raise exception 'FAIL old';
  exception when sqlstate '22023' then raise notice 'ok: data antiga bloqueada'; end;
  begin update profiles set role='admin' where id=auth.uid(); raise exception 'FAIL escalate';
  exception when insufficient_privilege then raise notice 'ok: professor não se promove'; end;
end $$;
update profiles set full_name='Paulo  Um Silva' where id=auth.uid();
do $$ begin assert (select full_name from profiles where id=auth.uid())='Paulo Um Silva'; end $$;
do $$ declare n int; begin
  update authorizations set student_name='hack'; get diagnostics n=row_count; assert n=0,'prof update';
  delete from authorizations; get diagnostics n=row_count; assert n=0,'prof delete';
  assert (select count(*) from audit_log)=0,'prof reads audit';
  assert (select count(*) from profiles)=1,'prof sees other profiles';
  update app_settings set professors_see_all=true; get diagnostics n=row_count; assert n=0,'prof settings';
  raise notice 'ok: P1 restrições';
end $$;
select dashboard_stats() as p1_stats;

-- ===== P2 (não vê registros de P1) =====
select pg_temp.act('00000000-0000-0000-0000-000000000002');
do $$ begin assert (select count(*) from authorizations)=0,'P2 sees P1'; raise notice 'ok: P2 isolado'; end $$;

-- ===== P3 inativo =====
select pg_temp.act('00000000-0000-0000-0000-000000000003');
do $$ begin
  assert (select count(*) from authorizations)=0;
  begin insert into authorizations (teacher_name,student_name,school_year,class_group,authorization_date,exit_time,reason)
        values ('Zé Três','Aluno Y','8º ano','B',school_today(),'10:00','banheiro'); raise exception 'FAIL inactive';
  exception when insufficient_privilege then raise notice 'ok: inativo bloqueado'; end;
end $$;

-- ===== Admin =====
select pg_temp.act('00000000-0000-0000-0000-00000000000a');
do $$ declare n int; begin
  assert (select count(*) from authorizations)=1;
  update authorizations set notes='Retornou às 10h25'; get diagnostics n=row_count; assert n=1;
  assert (select updated_by from authorizations)='00000000-0000-0000-0000-00000000000a';
  update app_settings set professors_see_all=true;
  begin update profiles set role='professor' where id=auth.uid(); raise exception 'FAIL last admin';
  exception when sqlstate 'P0001' then raise notice 'ok: último admin protegido'; end;
end $$;
select report_summary(school_today()-7, school_today()) as report;
select * from class_options();

-- P2 agora vê tudo (permissão ampliada)
select pg_temp.act('00000000-0000-0000-0000-000000000002');
do $$ begin assert (select count(*) from authorizations)=1; raise notice 'ok: permissão ampliada'; end $$;

-- Exclusão pelo admin e auditoria
select pg_temp.act('00000000-0000-0000-0000-00000000000a');
delete from authorizations;
select table_name, action, actor_name from audit_log order by id;

-- ===== anon =====
reset role; set role anon;
do $$ begin
  begin perform count(*) from authorizations; raise exception 'FAIL anon';
  exception when insufficient_privilege then raise notice 'ok: anônimo sem acesso'; end;
  begin perform dashboard_stats(); raise exception 'FAIL anon fn';
  exception when insufficient_privilege then raise notice 'ok: anônimo sem funções'; end;
end $$;
reset role;
select 'ALL RLS TESTS PASSED';
