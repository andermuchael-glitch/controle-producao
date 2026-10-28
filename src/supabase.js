import { createClient } from "@supabase/supabase-js";

// A publishable/anon key is intended for browser use. Access must still be
// restricted by Supabase Auth and Row Level Security policies.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://rrrkqvvhxfvwlhbarwza.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_wphdV1qI6W62fEsImL4lYw_88yqMfRZ";

export const supabaseConfigurado = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = supabaseConfigurado
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: { eventsPerSecond: 10 },
      },
    })
  : null;
