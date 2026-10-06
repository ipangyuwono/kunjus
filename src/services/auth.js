import { supabase } from "../lib/supabase-client.js";

let currentUserProfile = null;

export async function loginUser(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });

    if (error) {
      return {
        success: false,
        message: error.message
      };
    }

    const profile = await fetchUserProfile(data.user.id);
    if (!profile) {
      return {
        success: false,
        message: "Akun ditemukan, tapi data profil/role belum diatur di tabel profiles."
      };
    }

    currentUserProfile = profile;
    return {
      success: true, user: currentUserProfile
    };
  } catch (err) {
    return {
      success: false,
      message: err.message || "Terjadi kesalahan saat login."
    };
  }
}

export async function logoutUser() {
  await supabase.auth.signOut();
  currentUserProfile = null;
}

export async function fetchUserProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nama, role")
    .eq("id", userId)
    .single();

  if (error || !data) {
    console.error("Gagal mengambil profil user:", error);
    return null;
  }

  return data;
}

export async function checkCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || !session.user) {
    currentUserProfile = null;
    return null;
  }

  const profile = await fetchUserProfile(session.user.id);
  currentUserProfile = profile;
  return currentUserProfile;
}

export function getCurrentUser() {
  return currentUserProfile;
}
