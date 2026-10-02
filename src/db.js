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

export async function updateStudent(id, payload) {
  try {
    const { data, error } = await supabase
      .from("students")
      .update({
        nis: payload.nis.trim(),
        nama: payload.nama.trim(),
        kelas: payload.kelas.trim(),
        total_tagihan: Number(payload.total_tagihan),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return { success: false, message: `NIS "${payload.nis}" sudah dipakai siswa lain!` };
      }
      return { success: false, message: error.message };
    }

    return { success: true, message: "Data siswa berhasil diubah!", data };
  } catch (err) {
    console.error("Error updateStudent:", err);
    return { success: false, message: err.message };
  }
}

export async function deleteStudent(s) {
  try {
    const { error } = await supabase.from("students").delete().eq("id", s.id);
    if (error) throw error;
    return { success: true, message: "Data siswa dihapus." };
  } catch (err) {
    console.error("Error deleteStudent:", err);
    return { success: false, message: err.message };
  }
}

export async function deletePaymentByCode(trxCode) {
  try {
    const { data: row, error: errFind } = await supabase
      .from("payments")
      .select("id")
      .eq("trx_code", trxCode)
      .single();

    if (errFind || !row) {
      return { success: false, message: "Transaksi tidak ditemukan." };
    }

    const { error: errDel } = await supabase.from("payments").delete().eq("id", row.id);
    if (errDel) throw errDel;
    return { success: true, message: `Transaksi ${trxCode} dihapus.` };
  } catch (err) {
    console.error("Error deletePaymentByCode:", err);
    return { success: false, message: err.message };
  }
}

export async function getDailyTotals(days = 14) {
  try {
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("payments")
      .select("amount, created_at")
      .gte("created_at", since.toISOString());

    if (error) throw error;

    const buckets = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      buckets.push({
        key,
        label: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
        total: 0,
      });
    }
    const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]));

    (data || []).forEach((r) => {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (byKey[key]) byKey[key].total += Number(r.amount) || 0;
    });

    return { success: true, data: buckets };
  } catch (err) {
    console.error("Error getDailyTotals:", err);
    return { success: false, message: err.message };
  }
}

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
