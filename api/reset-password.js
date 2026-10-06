const { createClient } = require('@supabase/supabase-js');

function clean(v) {
  return (v || '').toString().trim().replace(/^["']|["';]+$/g, '').trim();
}

function getSupabase() {
  const url = clean(process.env.SUPABASE_URL);
  const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) throw new Error('SUPABASE_URL / SERVICE_ROLE_KEY belum diset di .env (server).');
  return createClient(url, key);
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Gunakan POST.' });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_URL / SERVICE_ROLE_KEY belum diset di .env (server).' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const token = (body?.token || '').toString().trim();
  const newPassword = (body?.newPassword || '').toString();

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token dan password baru wajib diisi.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password minimal 6 karakter.' });
  }

  try {
    const supabase = getSupabase();
    const { data: resetEntry, error: tokenError } = await supabase
      .from('password_resets')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !resetEntry) {
      return res.status(400).json({ error: 'Token tidak valid atau sudah digunakan.' });
    }

    if (new Date() > new Date(resetEntry.expires_at)) {
      await supabase.from('password_resets').delete().eq('token', token);
      return res.status(400).json({ error: 'Token sudah kedaluwarsa. Silakan ajukan lupa password ulang.' });
    }

    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const user = usersData.users.find((u) => u.email.toLowerCase() === resetEntry.email.toLowerCase());

    if (!user) {
      return res.status(404).json({ error: 'Akun user tidak ditemukan.' });
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (updateError) throw updateError;

    await supabase.from('password_resets').delete().eq('token', token);

    return res.status(200).json({ 
      success: true, 
      message: 'Password berhasil diperbarui! Silakan login dengan password baru.' 
    });
  } catch (err) {
    console.error('Error reset-password:', err.message);
    return res.status(500).json({ error: err.message || 'Gagal mereset kata sandi.' });
  }
};