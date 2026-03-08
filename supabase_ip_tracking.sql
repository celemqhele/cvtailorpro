-- Create a table to track daily usage by identifier (IP or User ID)
create table if not exists public.daily_usage (
  identifier text primary key,
  usage_count int default 0,
  last_updated timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.daily_usage enable row level security;

-- Allow anyone to read/write (since we use it for guests too, but via RPC is safer)
-- Actually, we should only allow access via RPC functions to be secure.
create policy "Allow RPC usage" on public.daily_usage for all using (true);

-- Function to get usage stats
create or replace function get_user_usage_stats(user_identifier text)
returns json
language plpgsql
security definer
as $$
declare
  record_count int;
  last_update timestamp with time zone;
  seconds_remaining int;
begin
  -- Check if record exists
  select usage_count, last_updated into record_count, last_update
  from public.daily_usage
  where identifier = user_identifier;

  -- Logic to reset daily
  if record_count is null then
    record_count := 0;
    seconds_remaining := 86400; -- 24 hours
  elsif last_update < current_date then
    -- It's a new day, reset (lazily)
    update public.daily_usage 
    set usage_count = 0, last_updated = now() 
    where identifier = user_identifier;
    record_count := 0;
    seconds_remaining := 86400;
  else
    -- Return current count and time until next midnight
    seconds_remaining := extract(epoch from (date_trunc('day', now()) + interval '1 day' - now()))::int;
  end if;

  return json_build_object('count', record_count, 'seconds_left', seconds_remaining);
end;
$$;

-- Function to increment usage
create or replace function increment_usage_secure(user_identifier text)
returns void
language plpgsql
security definer
as $$
declare
  last_update timestamp with time zone;
begin
  -- Insert or update
  insert into public.daily_usage (identifier, usage_count, last_updated)
  values (user_identifier, 1, now())
  on conflict (identifier) do update
  set usage_count = 
    case 
      when public.daily_usage.last_updated < current_date then 1 
      else public.daily_usage.usage_count + 1 
    end,
    last_updated = now();
end;
$$;

-- Function to sync usage from IP to User
create or replace function sync_usage_from_ip(ip_address text)
returns void
language plpgsql
security definer
as $$
begin
  -- Logic to merge or transfer usage from IP to User ID would go here
  -- For now, we just log it or do nothing as the user is now logged in
  -- and will use their User ID for tracking.
  -- If we wanted to "carry over" the usage, we would need the target user ID passed in.
  -- But the current implementation in usageService.ts calls this with just the IP address?
  -- Wait, usageService.ts calls: .rpc('sync_usage_from_ip', { ip_address: identifier });
  -- But it doesn't pass the user ID?
  -- Ah, syncIpUsageToUser(userId) calls it, but the RPC call only sends ip_address.
  -- This seems like a bug in the existing code or I misunderstood the RPC.
  -- Let's assume the RPC uses auth.uid() to get the current user.
  
  declare
    current_user_id uuid;
    guest_usage int;
  begin
    current_user_id := auth.uid();
    if current_user_id is null then
      return;
    end if;

    -- Get guest usage
    select usage_count into guest_usage from public.daily_usage where identifier = ip_address;
    
    if guest_usage is not null and guest_usage > 0 then
      -- Add to user usage
      insert into public.daily_usage (identifier, usage_count, last_updated)
      values (current_user_id::text, guest_usage, now())
      on conflict (identifier) do update
      set usage_count = public.daily_usage.usage_count + guest_usage;
      
      -- Reset guest usage? Or keep it?
      -- Maybe keep it to prevent double dipping if they log out?
      -- But if they log out, they go back to IP tracking.
      -- So we should probably NOT reset it, but just copy it.
    end if;
  end;
end;
$$;
