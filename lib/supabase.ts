import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: { persistSession: false },
    })
  : null;

export type CommentRow = {
  id: number;
  case_id: string;
  parent_id: number | null;
  nickname: string;
  tier: string;
  content: string;
  evidence: string | null;
  vote: "A" | "B" | null;
  likes: number;
  created_at: string;
};
