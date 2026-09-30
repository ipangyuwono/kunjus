const SUPABASE_URL = "https://jrxxpxwvtkspqvubxepv.supabase.co";
const SUPABASE_ANON_KEY ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyeHhweHd2dGtzcHF2dWJ4ZXB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDcyMzUsImV4cCI6MjA5MjUyMzIzNX0.-K048e5lXefk2Q9n-9rRB3ypf9TjrkQ2_0xO_kPCzjk";

if (
  SUPABASE_URL.includes("MASUKKAN_") ||
  SUPABASE_ANON_KEY.includes("MASUKKAN_")
) {
  console.error(" Supabase URL dan Anon Key belum diisi di src/config.js!");
}

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);



