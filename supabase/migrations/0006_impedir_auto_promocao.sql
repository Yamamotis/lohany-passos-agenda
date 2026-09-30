-- Achado no smoke test: a policy usuarios_update permite que qualquer
-- usuário atualize a própria linha em `usuarios`, mas nada impedia que esse
-- update também trocasse `tipo_usuario` — ou seja, um cliente comum podia
-- se promover a ADMIN só chamando update() pelo cliente anônimo. Fecha essa
-- brecha: só admin pode mudar tipo_usuario (de qualquer usuário, inclusive
-- o próprio).

create or replace function public.impedir_auto_promocao_usuario()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.tipo_usuario is distinct from old.tipo_usuario and not is_admin() then
    raise exception 'Você não tem permissão para alterar o tipo de usuário.';
  end if;
  return new;
end;
$$;

create trigger trg_usuarios_impedir_auto_promocao
  before update on public.usuarios
  for each row execute function public.impedir_auto_promocao_usuario();
