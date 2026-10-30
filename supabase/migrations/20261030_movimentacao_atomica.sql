-- Movimentação transacional das etapas de produção.
-- Execute uma única vez no SQL Editor do Supabase (projeto NeoCooler).
-- Não altera registros existentes; apenas cria/substitui a função usada pelo app.

create or replace function public.mover_etapa_producao_atomica(
  p_operacao_id uuid,
  p_pedido text,
  p_produto text,
  p_etapa_origem text,
  p_etapa_destino text,
  p_quantidade numeric,
  p_dados jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_estado jsonb;
  v_nova_lista jsonb := '[]'::jsonb;
  v_item jsonb;
  v_item_novo jsonb;
  v_total numeric := 0;
  v_saldo numeric;
  v_disponivel numeric;
  v_mover numeric;
  v_repetida boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária para movimentar a produção.';
  end if;

  if p_operacao_id is null or nullif(trim(p_pedido), '') is null
     or nullif(trim(p_produto), '') is null
     or p_quantidade is null or p_quantidade <= 0 then
    raise exception 'Dados inválidos para movimentação.';
  end if;

  -- Serializa todas as movimentações: duas sessões não conseguem ler o mesmo saldo
  -- e gravar simultaneamente uma cópia independente da lista.
  select value into v_estado
  from public.controle_producao_state
  where key = 'costura:itens'
  for update;

  if not found then
    raise exception 'Estado costura:itens não encontrado no Supabase.';
  end if;

  if jsonb_typeof(v_estado) <> 'array' then
    raise exception 'Estado de produção inválido: esperado um array JSON.';
  end if;

  -- Repetição da mesma requisição (retry de rede) não cria outro lançamento.
  select exists (
    select 1
    from jsonb_array_elements(v_estado) e
    where e->>'movimentacaoId' = p_operacao_id::text
  ) into v_repetida;

  if v_repetida then
    return jsonb_build_object('ok', true, 'repetida', true, 'itens', v_estado);
  end if;

  select coalesce(sum(greatest(0, coalesce((e->>'qtd')::numeric, 0))), 0)
  into v_total
  from jsonb_array_elements(v_estado) e
  where trim(coalesce(e->>'pedido','')) = trim(p_pedido)
    and upper(trim(coalesce(e->>'produto',''))) = upper(trim(p_produto))
    and e->>'etapa' = p_etapa_origem;

  if v_total < p_quantidade then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'saldo_insuficiente',
      'disponivel', v_total,
      'itens', v_estado
    );
  end if;

  v_saldo := p_quantidade;

  for v_item in select value from jsonb_array_elements(v_estado)
  loop
    if v_saldo > 0
       and trim(coalesce(v_item->>'pedido','')) = trim(p_pedido)
       and upper(trim(coalesce(v_item->>'produto',''))) = upper(trim(p_produto))
       and v_item->>'etapa' = p_etapa_origem then
      v_disponivel := greatest(0, coalesce((v_item->>'qtd')::numeric, 0));
      v_mover := least(v_disponivel, v_saldo);

      if v_disponivel - v_mover > 0 then
        v_nova_lista := v_nova_lista || jsonb_build_array(
          jsonb_set(v_item, '{qtd}', to_jsonb(v_disponivel - v_mover), true)
        );
      end if;
      v_saldo := v_saldo - v_mover;
    else
      v_nova_lista := v_nova_lista || jsonb_build_array(v_item);
    end if;
  end loop;

  if v_saldo > 0 then
    raise exception 'Saldo mudou durante a movimentação; nenhuma alteração foi gravada.';
  end if;

  v_item_novo := coalesce(p_dados, '{}'::jsonb) || jsonb_build_object(
    'pedido', trim(p_pedido),
    'produto', trim(p_produto),
    'qtd', p_quantidade,
    'etapa', p_etapa_destino,
    'movimentacaoId', p_operacao_id::text
  );

  v_nova_lista := v_nova_lista || jsonb_build_array(v_item_novo);

  update public.controle_producao_state
  set value = v_nova_lista,
      updated_at = now(),
      updated_by = auth.uid()
  where key = 'costura:itens';

  return jsonb_build_object(
    'ok', true,
    'repetida', false,
    'movida', p_quantidade,
    'origem', p_etapa_origem,
    'destino', p_etapa_destino,
    'itens', v_nova_lista
  );
end;
$$;

revoke all on function public.mover_etapa_producao_atomica(uuid, text, text, text, text, numeric, jsonb) from public, anon;
grant execute on function public.mover_etapa_producao_atomica(uuid, text, text, text, text, numeric, jsonb) to authenticated;
