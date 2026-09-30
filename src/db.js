import { supabase } from "./config.js";
import { getCurrentUser } from "./auth.js";

export async function getDashboardData() {
  try {
    const { data: recap, error: errRecap } = await supabase
      .from("v_student_recap")
      .select("*");

    if (errRecap) throw errRecap;

    const { count: totalTransaksi, error: errTrx } = await supabase
      .from("payments")
      .select("*", { count: "exact", head: true });

    if (errTrx) throw errTrx;

    const totalSiswa = recap.length;
    let totalTagihan = 0;
    let totalUangMasuk = 0;
    let totalSiswaLunas = 0;
    let totalSiswaBelumLunas = 0;

    recap.forEach((item) => {
      const tagihan = Number(item.total_tagihan) || 0;
      const terbayar = Number(item.total_terbayar) || 0;

      totalTagihan += tagihan;
      totalUangMasuk += terbayar;

      if (item.status === "Lunas") {
        totalSiswaLunas++;
      } else {
        totalSiswaBelumLunas++;
      }
    });

    const sisaTagihan = totalTagihan - totalUangMasuk;

    return {
      success: true,
      data: {
        totalSiswa,
        totalSiswaLunas,
        totalSiswaBelumLunas,
        totalTransaksi: totalTransaksi || 0,
        totalTagihan,
        totalUangMasuk,
        sisaTagihan: sisaTagihan < 0 ? 0 : sisaTagihan,
      },
    };
  } catch (err) {
    console.error("Error getDashboardData:", err);
    return { success: false, message: err.message };
  }
}

export async function getStudentsRecap() {
  try {
    const { data, error } = await supabase
      .from("v_student_recap")
      .select("*")
      .order("nama", { ascending: true });

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error("Error getStudentsRecap:", err);
    return { success: false, message: err.message };
  }
}

/**
 *
 * @param {{ nis: string, nama: string, kelas: string, total_tagihan: number }} payload
 */
export async function addStudent(payload) {
  try {
    const { data, error } = await supabase
      .from("students")
      .insert([
        {
          nis: payload.nis.trim(),
          nama: payload.nama.trim(),
          kelas: payload.kelas.trim(),
          total_tagihan: Number(payload.total_tagihan),
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return {
          success: false,
          message: `NIS "${payload.nis}" sudah terdaftar!`,
        };
      }
      return { success: false, message: error.message };
    }

    return { success: true, message: "Data siswa berhasil ditambahkan!", data };
  } catch (err) {
    console.error("Error addStudent:", err);
    return { success: false, message: err.message };
  }
}

/**
 * 4. Simpan Transaksi Pembayaran
 * @param {{ student_id: string, amount: number, notes?: string }} payload
 */
export async function createPayment(payload) {
  try {
    const user = getCurrentUser();
    if (!user) {
      return {
        success: false,
        message: "Sesi petugas tidak valid. Silakan login ulang.",
      };
    }

    const { data: student, error: errStudent } = await supabase
      .from("v_student_recap")
      .select("*")
      .eq("id", payload.student_id)
      .single();

    if (errStudent || !student) {
      return { success: false, message: "Data siswa tidak ditemukan!" };
    }

    const nominalBayar = Number(payload.amount);
    if (nominalBayar <= 0) {
      return {
        success: false,
        message: "Nominal pembayaran harus lebih besar dari 0!",
      };
    }

    if (nominalBayar > student.sisa_tagihan) {
      return {
        success: false,
        message: `Nominal melebihi sisa tagihan! Sisa tagihan: Rp ${Number(student.sisa_tagihan).toLocaleString("id-ID")}`,
      };
    }

    // Nomor urut: baca kode TRX-XXX yang sudah ada, lanjutkan +1.
    // Kode lama model tanggal (TRX-20240101-XXXX) dilewati, tidak dihitung.
    const { data: existingCodes, error: errCodes } = await supabase
      .from("payments")
      .select("trx_code");

    if (errCodes) throw errCodes;

    let maxNum = 0;
    (existingCodes || []).forEach((r) => {
      const m = /^TRX-(\d+)$/.exec(String(r.trx_code || "").trim());
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    });
    const trxCode = `TRX-${String(maxNum + 1).padStart(3, "0")}`;

    const { data: newPayment, error: errInsert } = await supabase
      .from("payments")
      .insert([
        {
          trx_code: trxCode,
          student_id: payload.student_id,
          amount: nominalBayar,
          notes: payload.notes || "-",
          cashier_id: user.id,
        },
      ])
      .select()
      .single();

    if (errInsert) throw errInsert;

    return {
      success: true,
      message: "Pembayaran berhasil disimpan!",
      data: {
        trx_code: trxCode,
        nis: student.nis,
        nama: student.nama,
        kelas: student.kelas,
        amount: nominalBayar,
        notes: payload.notes || "-",
        petugas: user.nama,
        created_at: newPayment.created_at,
      },
    };
  } catch (err) {
    console.error("Error createPayment:", err);
    return { success: false, message: err.message };
  }
}

export async function getPaymentHistory() {
  try {
    const { data, error } = await supabase
      .from("v_payment_history")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error("Error getPaymentHistory:", err);
    return { success: false, message: err.message };
  }
}
