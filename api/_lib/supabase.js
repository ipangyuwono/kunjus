const { createClient } = require('@supabase/supabase-js');

function clean(v) {
  return (v || '').toString().trim().replace(/^["']|["';]+$/g, '').trim();
}

function getSupabase() {
  const url = clean(process.env.SUPABASE_URL);
  const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) throw new Error('SUPABASE_URL / SERVICE_ROLE_KEY belum diset di env server.');
  return createClient(url, key);
}

module.exports = { clean, getSupabase };
