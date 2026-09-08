begin;

-- ============================================================
-- VÓRTEX
-- Migration 002
-- Public anonymous report submission
-- ============================================================


-- ============================================================
-- Public anonymous report submission
-- ============================================================

create or replace function public.vortex_submit_public_report(
    p_category_slug text,
    p_description text,
    p_urgency text,
    p_address text default null,
    p_neighborhood text default null,
    p_reference_point text default null,
    p_latitude numeric default null,
    p_longitude numeric default null,
    p_event_at timestamptz default null
)
returns table (
    protocol text,
    tracking_code text,
    status public.vortex_report_status,
    created_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $function$

declare
    v_category_id uuid;
    v_tracking_code text;
    v_tracking_code_hash text;
    v_random_hex text;
    v_protocol text;
    v_status public.vortex_report_status;
    v_created_at timestamptz;

begin

    -- ========================================================
    -- Basic validation
    -- ========================================================

    if p_category_slug is null
       or length(btrim(p_category_slug)) = 0 then
        raise exception 'Categoria obrigatória';
    end if;

    if length(p_category_slug) > 100 then
        raise exception 'Categoria inválida';
    end if;


    if p_description is null
       or length(btrim(p_description)) = 0 then
        raise exception 'Descrição obrigatória';
    end if;

    if length(p_description) > 10000 then
        raise exception 'Descrição excede o tamanho permitido';
    end if;


    if p_address is not null
       and length(p_address) > 500 then
        raise exception 'Endereço excede o tamanho permitido';
    end if;


    if p_neighborhood is not null
       and length(p_neighborhood) > 200 then
        raise exception 'Bairro excede o tamanho permitido';
    end if;


    if p_reference_point is not null
       and length(p_reference_point) > 500 then
        raise exception 'Ponto de referência excede o tamanho permitido';
    end if;


    -- ========================================================
    -- Urgency validation
    -- ========================================================

    if p_urgency is null
       or length(btrim(p_urgency)) = 0 then
        raise exception 'Urgência obrigatória';
    end if;

    if upper(btrim(p_urgency)) not in ('LOW', 'MEDIUM', 'HIGH') then
        raise exception 'Urgência inválida';
    end if;


    -- ========================================================
    -- Coordinate validation
    -- ========================================================

    if p_latitude is not null
       and (p_latitude < -90 or p_latitude > 90) then
        raise exception 'Latitude inválida';
    end if;


    if p_longitude is not null
       and (p_longitude < -180 or p_longitude > 180) then
        raise exception 'Longitude inválida';
    end if;


    if (p_latitude is null) <> (p_longitude is null) then
        raise exception 'Latitude e longitude devem ser informadas juntas';
    end if;


    -- ========================================================
    -- Category validation
    -- ========================================================

    select c.id
      into v_category_id
      from public.vortex_categories as c
     where c.slug = btrim(p_category_slug)
       and c.active = true
     limit 1;


    if v_category_id is null then
        raise exception 'Categoria inválida';
    end if;


    -- ========================================================
    -- Generate tracking code
    --
    -- 16 random bytes = 128 bits of entropy.
    --
    -- The plaintext tracking code exists only inside this
    -- function execution and is returned once to the citizen.
    --
    -- Only its bcrypt hash is persisted.
    -- ========================================================

    v_random_hex := encode(
        extensions.gen_random_bytes(16),
        'hex'
    );


    v_tracking_code :=
        upper(
            substring(v_random_hex from 1 for 8)
            || '-'
            || substring(v_random_hex from 9 for 8)
            || '-'
            || substring(v_random_hex from 17 for 8)
            || '-'
            || substring(v_random_hex from 25 for 8)
        );


    -- ========================================================
    -- Hash tracking code
    --
    -- The plaintext code is never stored in the database.
    -- vortex_hash_tracking_code() generates the bcrypt hash.
    -- ========================================================

    v_tracking_code_hash :=
        public.vortex_hash_tracking_code(v_tracking_code);


    -- ========================================================
    -- Insert report
    --
    -- IMPORTANT:
    -- - protocol is NOT accepted from the public caller;
    -- - status is forced to NOVA;
    -- - created_at/updated_at are generated by the database;
    -- - tracking_code_hash is generated internally.
    --
    -- vortex_assign_protocol() generates the protocol through
    -- the trigger defined in migration 001.
    --
    -- vortex_report_history is populated through the existing
    -- status-history trigger.
    -- ========================================================

    insert into public.vortex_reports (
        category_id,
        description,
        urgency,
        status,
        address,
        neighborhood,
        reference_point,
        latitude,
        longitude,
        event_at,
        tracking_code_hash
    )
    values (
        v_category_id,
        btrim(p_description),
        upper(btrim(p_urgency))::public.vortex_urgency,
        'NOVA'::public.vortex_report_status,
        nullif(btrim(p_address), ''),
        nullif(btrim(p_neighborhood), ''),
        nullif(btrim(p_reference_point), ''),
        p_latitude,
        p_longitude,
        p_event_at,
        v_tracking_code_hash
    )
    returning
        vortex_reports.protocol,
        vortex_reports.status,
        vortex_reports.created_at
    into
        v_protocol,
        v_status,
        v_created_at;


    -- ========================================================
    -- Return only information required by the citizen.
    --
    -- NEVER return:
    -- - report UUID;
    -- - category UUID;
    -- - tracking_code_hash;
    -- - administrative data;
    -- - internal database information.
    --
    -- The plaintext tracking code is returned only once.
    -- ========================================================

    return query
    select
        v_protocol,
        v_tracking_code,
        v_status,
        v_created_at;


end;
$function$;


-- ============================================================
-- Function security
-- ============================================================

revoke all on function public.vortex_submit_public_report(
    text,
    text,
    text,
    text,
    text,
    text,
    numeric,
    numeric,
    timestamptz
) from public;


revoke all on function public.vortex_submit_public_report(
    text,
    text,
    text,
    text,
    text,
    text,
    numeric,
    numeric,
    timestamptz
) from anon;


revoke all on function public.vortex_submit_public_report(
    text,
    text,
    text,
    text,
    text,
    text,
    numeric,
    numeric,
    timestamptz
) from authenticated;


-- Public citizens need permission to execute ONLY this
-- controlled function. They do NOT receive INSERT permission
-- on vortex_reports.

grant execute on function public.vortex_submit_public_report(
    text,
    text,
    text,
    text,
    text,
    text,
    numeric,
    numeric,
    timestamptz
) to anon;


grant execute on function public.vortex_submit_public_report(
    text,
    text,
    text,
    text,
    text,
    text,
    numeric,
    numeric,
    timestamptz
) to authenticated;


commit;