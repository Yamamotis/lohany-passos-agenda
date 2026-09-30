-- Adiciona um parâmetro opcional a obter_horarios_disponiveis para excluir
-- um agendamento específico do cálculo — necessário ao reagendar: sem isso,
-- o próprio horário atual do agendamento apareceria como "ocupado" e
-- bloquearia a remarcação para o mesmo horário.
--
-- CREATE OR REPLACE não permite mudar a lista de parâmetros, então a função
-- precisa ser recriada do zero. criar_agendamento() chama a versão de 3
-- argumentos, que continua válida (o novo parâmetro tem valor padrão).

drop function if exists public.obter_horarios_disponiveis(uuid, uuid, date);

create or replace function public.obter_horarios_disponiveis(
  p_profissional_id uuid,
  p_servico_id uuid,
  p_data date,
  p_excluir_agendamento_id uuid default null
)
returns table(hora_inicio time without time zone, hora_fim time without time zone)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_duracao integer;
  v_intervalo_entre_atendimentos integer;
  v_dia_semana smallint := extract(dow from p_data);
  v_horario record;
  v_passo interval;
  v_candidato_inicio time;
  v_candidato_fim time;
begin
  select duracao_minutos into v_duracao from servicos where id = p_servico_id and ativo = true;
  if v_duracao is null then
    return;
  end if;

  select intervalo_entre_atendimentos_minutos into v_intervalo_entre_atendimentos from configuracoes;
  v_passo := (v_duracao + coalesce(v_intervalo_entre_atendimentos, 0)) * interval '1 minute';

  select * into v_horario
  from horarios_profissionais
  where profissional_id = p_profissional_id
    and dia_semana = v_dia_semana
    and ativo = true;

  if not found then
    return;
  end if;

  v_candidato_inicio := v_horario.hora_inicial;

  while v_candidato_inicio + (v_duracao * interval '1 minute') <= v_horario.hora_final loop
    v_candidato_fim := v_candidato_inicio + (v_duracao * interval '1 minute');

    if not exists (
      select 1 from intervalos_profissionais ip
      where ip.horario_profissional_id = v_horario.id
        and (v_candidato_inicio, v_candidato_fim) overlaps (ip.hora_inicial, ip.hora_final)
    )
    and not exists (
      select 1 from bloqueios_agenda b
      where b.profissional_id = p_profissional_id
        and tsrange(b.inicio::timestamp, b.fim::timestamp) &&
            tsrange((p_data + v_candidato_inicio)::timestamp, (p_data + v_candidato_fim)::timestamp)
    )
    and not exists (
      select 1 from agendamentos a
      where a.profissional_id = p_profissional_id
        and a.data = p_data
        and a.status not in ('CANCELADO_CLIENTE', 'CANCELADO_PROFISSIONAL', 'NAO_COMPARECEU')
        and (p_excluir_agendamento_id is null or a.id <> p_excluir_agendamento_id)
        and (a.hora_inicio, a.hora_fim) overlaps (v_candidato_inicio, v_candidato_fim)
    )
    and (p_data > current_date or v_candidato_inicio > current_time) then
      hora_inicio := v_candidato_inicio;
      hora_fim := v_candidato_fim;
      return next;
    end if;

    v_candidato_inicio := v_candidato_inicio + v_passo;
  end loop;
end;
$$;
