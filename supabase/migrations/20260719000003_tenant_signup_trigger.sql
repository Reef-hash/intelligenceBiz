-- Self-serve signup: every new auth.users row provisions its own tenant
-- (the signer becomes 'owner'), a default agent_configs row so the AI
-- agent works immediately, and a trialing subscription. Runs as a
-- trigger (not a post-signup RPC call from the app) so it fires the
-- moment the auth user is created, regardless of whether the project
-- requires email confirmation before a session exists.
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  business_name text;
  new_tenant_id uuid;
begin
  business_name := coalesce(nullif(trim(new.raw_user_meta_data->>'business_name'), ''), split_part(new.email, '@', 1));

  insert into tenants (name, slug)
  values (
    business_name,
    lower(regexp_replace(business_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text), 1, 6)
  )
  returning id into new_tenant_id;

  insert into users (id, tenant_id, email, role)
  values (new.id, new_tenant_id, new.email, 'owner');

  insert into agent_configs (tenant_id, persona_name, system_prompt)
  values (
    new_tenant_id,
    business_name,
    'You are a helpful customer support assistant for ' || business_name ||
      '. Answer customer questions politely and concisely. If you do not know the answer, say so honestly and offer to have a team member follow up.'
  );

  insert into subscriptions (tenant_id, plan, status)
  values (new_tenant_id, 'free', 'trialing');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();
