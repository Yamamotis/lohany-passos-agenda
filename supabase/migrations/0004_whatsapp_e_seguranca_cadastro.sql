-- Adiciona o telefone de WhatsApp do salão (usado no botão "Falar no
-- WhatsApp" do app) e fecha uma brecha do cadastro público: hoje
-- lidar_novo_usuario_auth() confia no campo "tipo_usuario" enviado pelo
-- próprio cliente no signup, permitindo que qualquer pessoa se cadastre
-- como ADMIN. A partir daqui, o cadastro público sempre cria CLIENTE;
-- contas de admin/profissional só são promovidas manualmente (painel ou
-- script com a service role key).

alter table public.configuracoes
  add column if not exists telefone_whatsapp text not null default '';

create or replace function public.lidar_novo_usuario_auth()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.usuarios (id, nome, email, telefone, tipo_usuario)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'telefone', ''),
    'CLIENTE'
  );

  insert into public.clientes (usuario_id) values (new.id);

  return new;
end;
$$;
