-- =====================================================================
-- PRIMEIRO ADMINISTRADOR
-- Execute DEPOIS de criar o usuário em Authentication > Users > Add user.
-- Troque o e-mail e o nome abaixo pelos dados reais e clique em Run.
-- =====================================================================
update public.profiles
set role = 'admin',
    full_name = 'Nome Completo da Coordenação'   -- troque pelo nome real
where email = lower('coordenacao@suaescola.com.br'); -- troque pelo e-mail real

-- Confira o resultado (deve aparecer uma linha com role = admin):
select full_name, email, role, active from public.profiles order by created_at;
