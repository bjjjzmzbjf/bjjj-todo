create or replace function public.sync_tasks(changes jsonb default '[]'::jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 uid uuid := auth.uid();
 op jsonb; existing public.sync_tasks%rowtype;
 item uuid; base bigint; gone boolean; body jsonb;
 results jsonb := '[]'::jsonb; rows jsonb;
 accepted boolean;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if jsonb_typeof(changes)<>'array' or jsonb_array_length(changes)>100 then raise exception 'Invalid change batch'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 for op in select value from jsonb_array_elements(changes) loop
  item := (op->>'id')::uuid;
  base := (op->>'base_revision')::bigint;
  gone := (op->>'deleted')::boolean;
  body := case when gone then '{}'::jsonb else op->'data' end;
  if item is null or base is null or base<0 or gone is null then raise exception 'Invalid revision or identifier'; end if;
  if not gone then
   if coalesce((jsonb_typeof(body)<>'object' or body->>'id'<>item::text
    or jsonb_typeof(body->'title')<>'string' or length(trim(body->>'title')) not between 1 and 200
    or body->>'priority' not in ('high','normal','low')
    or body->>'category' not in ('research','work','study','life','other')
    or jsonb_typeof(body->'done')<>'boolean'
    or jsonb_typeof(body->'offsets')<>'array' or jsonb_array_length(body->'offsets')>20
    or length(coalesce(body->>'notes',''))>4000),true) then raise exception 'Invalid task'; end if;
   if coalesce(body->>'due','')<>'' then perform (body->>'due')::timestamptz; end if;
   if exists(select 1 from jsonb_array_elements(body->'offsets') v where jsonb_typeof(v)<>'number' or (v::text)::numeric<0 or (v::text)::numeric>5256000) then raise exception 'Invalid reminder'; end if;
   body := jsonb_build_object('id',item::text,'title',body->>'title','due',coalesce(body->>'due',''),'priority',body->>'priority','category',body->>'category','offsets',body->'offsets','notes',coalesce(body->>'notes',''),'done',(body->>'done')::boolean,'created',coalesce(body->>'created',''),'completed',coalesce(body->>'completed',''));
  end if;
  select * into existing from public.sync_tasks t where t.user_id=uid and t.task_id=item for update;
  accepted := false;
  if not found then
   if base=0 then
    insert into public.sync_tasks(user_id,task_id,deleted,payload) values(uid,item,gone,body);
    accepted := true;
   end if;
  elsif existing.deleted=gone and existing.payload=body then accepted := true;
  elsif existing.revision=base then
   update public.sync_tasks t set payload=body,deleted=gone,revision=t.revision+1,updated_at=now() where t.user_id=uid and t.task_id=item;
   accepted := true;
  end if;
  results := results || jsonb_build_array(jsonb_build_object('id',item::text,'ok',accepted));
 end loop;
 select coalesce(jsonb_agg(jsonb_build_object('id',t.task_id,'revision',t.revision,'deleted',t.deleted,'data',t.payload) order by t.task_id),'[]'::jsonb)
 into rows from public.sync_tasks t where t.user_id=uid;
 return jsonb_build_object('results',results,'rows',rows);
end;
$$;
revoke all on function public.sync_tasks(jsonb) from public,anon;
grant execute on function public.sync_tasks(jsonb) to authenticated;
