import { supabase } from "./config.js";

let currentUserProfile = null;

/**
* Login menggunakan email & password Supabase Auth
* @param {string} email
* @param {string} password
* @returns {Promise<{success: boolean, user?: object, message?: string}>}
*/

export async function loginUser(email, password){
    try {
        const {data, error} = await supabase.auth.signInWithPassword({
            email : email.trim(),
            password : password.trim(),
        });

    if (error){
        return {
            success: false, 
            message: error.message};
    }

    const profile = await fetchUserProfile(data.user.id);
    if (!profile){
        return {
            success: false, 
            message: "Akun ditemukan, tapi data profil/role belum diatur di tabel profiles."}
    }

    currentUserProfile = profile;
    return {
        success: true, user: currentUserProfile};
    } catch (err){
        return {success: false, 
        message: err.message || "Terjadi kesalahan saat login."};
    }
    }

/**
* Logout pengguna dan reset state sesi
*/
    export async function logoutUser() {
        await supabase.auth.signOut();
        currentUserProfile = null;
    }

/**
 * Mengambil profil spesifik dari tabel public.profiles
 * @param {string} userId
 */
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

/**
 * Cek sesi aktif saat halaman pertama kali dimuat / di-refresh
 * @returns {Promise<object|null>} Data profil user jika sesi valid, null jika tidak ada sesi
 */
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

export function getCurrentUser(){
    return currentUserProfile;
}