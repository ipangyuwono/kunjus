const { getSupabase } = require('./_lib/supabase');
const { checkRateLimit, hashToken } = require('./_lib/security');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Gunakan POST.' });
  }

  const rl = checkRateLimit(req, { limit: 10, windowMs: 10 * 60 * 1000 });
  if (!rl.allowed) {
    return res.status(429).json({ error: `Terlalu banyak percobaan. Coba lagi dalam ${rl.retryAfterSec} detik.` });
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

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password minimal 8 karakter.' });
  }

  if (newPassword.length > 128) {
    return res.status(400).json({ error: 'Password terlalu panjang.' });
  }

  try {
    const supabase = getSupabase();
    const tokenHash = hashToken(token);
    const { data: resetEntry, error: tokenError } = await supabase
      .from('password_resets')
      .select('*')
      .eq('token', tokenHash)
      .single();

    if (tokenError || !resetEntry) {
      return res.status(400).json({ error: 'Token tidak valid atau sudah digunakan.' });
    }

    if (new Date() > new Date(resetEntry.expires_at)) {
      await supabase.from('password_resets').delete().eq('token', tokenHash);
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

    await supabase.from('password_resets').delete().eq('token', tokenHash);

    return res.status(200).json({ 
      success: true, 
      message: 'Password berhasil diperbarui! Silakan login dengan password baru.' 
    });
  } catch (err) {
    console.error('Error reset-password:', err.message);
    return res.status(500).json({ error: 'Gagal mereset kata sandi.' });
  }
};