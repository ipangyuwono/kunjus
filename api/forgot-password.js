const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

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
  const email = (body?.email || '').toString().trim();
  if (!email) {
    return res.status(400).json({ error: 'Email wajib diisi.' });
  }

  try {
    const supabase = getSupabase();
    const { data: usersData, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;

    const user = usersData.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      return res.status(200).json({ 
        success: true, 
        message: 'Jika email terdaftar, instruksi reset password telah dikirim.' 
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await supabase.from('password_resets').delete().eq('email', user.email);
    const { error: insertError } = await supabase
      .from('password_resets')
      .insert([{ email: user.email, token, expires_at: expiresAt }]);

    if (insertError) throw insertError;

    const appUrl = process.env.APP_URL || 'https://kunjus.vercel.app';
    const resetLink = `${appUrl}/reset-password.html?token=${token}`;

    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'Kas Kunjungan Industri',
          email: 'ipangyuwono70@gmail.com',
        },
        to: [{ email: user.email }],
        subject: 'Reset kata sandi akun Anda',
        htmlContent: `
          <div style="background-color:#eef2f7;padding:32px 16px;font-family:'Plus Jakarta Sans',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;">
            <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Reset kata sandi akun Kas Kunjungan Industri Anda &mdash; tautan berlaku 10 menit.</div>
            <div style="max-width:460px;margin:0 auto;">
              <p style="text-align:center;font-size:10px;font-weight:700;letter-spacing:2px;color:#94a3b8;margin:0 0 6px;">PEMBAYARAN KUNJUNGAN INDUSTRI</p>
              <p style="text-align:center;font-size:18px;font-weight:800;color:#0f172a;margin:0 0 20px;">Kas Kunjungan Industri</p>
              <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px 30px;">
                <span style="display:inline-block;font-size:10px;font-weight:700;letter-spacing:1.2px;color:#4338ca;background:#eef2ff;border:1px solid #e0e7ff;border-radius:999px;padding:4px 12px;margin:0 0 14px;">RESET KATA SANDI</span>
                <h1 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 8px;">Buat kata sandi baru</h1>
                <p style="font-size:13px;color:#475569;margin:0 0 18px;">Halo, kami menerima permintaan reset kata sandi untuk akun di bawah ini. Klik tombol untuk melanjutkan.</p>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 14px;margin:0 0 20px;">
                  <p style="font-size:10px;font-weight:700;letter-spacing:1px;color:#94a3b8;margin:0 0 2px;">AKUN</p>
                  <p style="font-size:14px;font-weight:700;color:#0f172a;margin:0;">${email}</p>
                </div>
                <div style="text-align:center;margin:0 0 8px;">
                  <a href="${resetLink}" style="display:block;background-color:#4f46e5;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;text-align:center;padding:13px 24px;border-radius:10px;">Ganti Password Baru</a>
                </div>
                <p style="text-align:center;font-size:11px;color:#94a3b8;margin:12px 0 0;">Tautan berlaku <strong style="color:#64748b;">10 menit</strong> sejak email ini dikirim.</p>
                <div style="border-top:1px solid #f1f5f9;margin:20px 0 16px;"></div>
                <p style="font-size:11px;color:#94a3b8;margin:0;word-break:break-all;">Tombol tidak berfungsi? Salin tautan ini ke browser:<br><a href="${resetLink}" style="color:#4f46e5;text-decoration:none;">${resetLink}</a></p>
              </div>
              <p style="text-align:center;font-size:11px;color:#94a3b8;margin:16px 0 0;">&copy; 2026 Kunjungan Industri SMK Bisma Kersana.<br>Jika bukan Anda yang meminta, abaikan email ini. Email otomatis, tidak perlu dibalas.</p>
            </div>
          </div>
        `,
      }),
    });

    if (!brevoRes.ok) {
      const errBrevo = await brevoRes.json().catch(() => ({}));
      console.error('Brevo gagal:', brevoRes.status, errBrevo);
      throw new Error(`Brevo ${brevoRes.status}: ${errBrevo.message || JSON.stringify(errBrevo)}`);
    }

    return res.status(200).json({ success: true, message: 'Email reset password berhasil dikirim.' });
  } catch (err) {
    console.error('Error forgot-password:', err.message);
    return res.status(500).json({ error: err.message || 'Terjadi kesalahan pada server.' });
  }
};