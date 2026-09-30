/**
 * Helper untuk men-download file string (CSV) langsung dari browser
 * @param {string} content - Konten teks file
 * @param {string} filename - Nama file yang akan diunduh
 */
function downloadFile(content, filename) {
  // \uFEFF adalah UTF-8 Byte Order Mark (BOM) agar Excel membaca huruf Indonesia dengan benar
  const blob = new Blob(["\uFEFF" + content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Pemisah kolom memakai titik-koma karena Excel Indonesia
// memecah kolom berdasarkan ";" (bukan koma, koma dipakai untuk desimal).
const SEP = ";";

function textCell(val) {
  return `"${String(val ?? "").replace(/"/g, '""')}"`;
}

function numCell(val) {
  return String(Number(val) || 0);
}

/**
 *
 * @param {Array} students - Data dari view v_student_recap
 */
export function exportRekapToCSV(students) {
  if (!students || students.length === 0) {
    alert("Tidak ada data rekap siswa untuk diexport!");
    return;
  }

  const headers = [
    "NIS",
    "Nama Siswa",
    "Kelas",
    "Total Tagihan",
    "Terbayar",
    "Sisa Tagihan",
    "Status",
  ];

  const rows = students.map((s) => [
    textCell(s.nis),
    textCell(s.nama),
    textCell(s.kelas),
    numCell(s.total_tagihan),
    numCell(s.total_terbayar),
    numCell(s.sisa_tagihan),
    textCell(s.status),
  ]);

  const csvContent = [headers.join(SEP), ...rows.map((r) => r.join(SEP))].join(
    "\r\n",
  );
  const filename = `Rekap_Pembayaran_Siswa_${new Date().toISOString().slice(0, 10)}.csv`;

  downloadFile(csvContent, filename);
}

/**
 *
 * @param {Array} history - Data dari view v_payment_history
 */
export function exportHistoryToCSV(history) {
  if (!history || history.length === 0) {
    alert("Tidak ada data transaksi untuk diexport!");
    return;
  }

  const headers = [
    "ID Transaksi",
    "Tanggal",
    "NIS",
    "Nama Siswa",
    "Kelas",
    "Jumlah Bayar",
    "Keterangan",
    "Petugas",
  ];

  const rows = history.map((h) => {
    const tgl = new Date(h.created_at).toLocaleString("id-ID");
    return [
      textCell(h.trx_code),
      textCell(tgl),
      textCell(h.nis),
      textCell(h.nama_siswa),
      textCell(h.kelas),
      numCell(h.jumlah_bayar ?? h.amount),
      textCell(h.keterangan ?? h.notes ?? "-"),
      textCell(h.nama_petugas ?? h.petugas ?? "-"),
    ];
  });

  const csvContent = [headers.join(SEP), ...rows.map((r) => r.join(SEP))].join(
    "\r\n",
  );
  const filename = `Riwayat_Transaksi_${new Date().toISOString().slice(0, 10)}.csv`;

  downloadFile(csvContent, filename);
}
