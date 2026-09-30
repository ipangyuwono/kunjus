/**
 * Format angka ke format mata uang Rupiah
 */
export function formatRupiah(number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(number) || 0);
}

/**
 * Format tanggal timestamptz ke format lokal Indonesia
 */
export function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

export function toast(message, type = "success") {  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "fixed top-4 right-4 z-[100] space-y-2 w-80";
    document.body.appendChild(container);
  }
  const el = document.createElement("div");
  const isOk = type === "success";
  el.className = `flex items-start gap-2.5 p-3 rounded-lg border text-[13px] bg-white ${isOk ? "border-slate-300" : "border-rose-300"}`;
  el.innerHTML = `
    <span class="font-bold ${isOk ? "text-emerald-700" : "text-rose-700"}">${isOk ? "OK" : "Gagal"}</span>
    <span class="text-slate-700 leading-relaxed">${escapeHtml(message)}</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

export function showTableLoading(tbodyId, cols) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="${cols}" class="p-8 text-center text-slate-400 text-[13px]"><span class="inline-block w-4 h-4 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin mr-2 align-middle"></span>Memuat data...</td></tr>`;
}

export function showTableError(tbodyId, cols, message) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="${cols}" class="p-8 text-center text-[13px]"><p class="text-rose-700 font-semibold">Gagal memuat data.</p><p class="text-slate-400 mt-1">${escapeHtml(message || "")}</p></td></tr>`;
}

export function setCountText(elId, shown, total, noun) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerText = shown === total
    ? `Menampilkan ${total} ${noun}`
    : `Menampilkan ${shown} dari ${total} ${noun}`;
}

export function renderDashboard(stats) {
  document.getElementById("dashTotalSiswa").innerText = stats.totalSiswa ?? 0;
  document.getElementById("dashSiswaLunas").innerText = stats.totalSiswaLunas ?? 0;
  document.getElementById("dashSiswaBelumLunas").innerText = stats.totalSiswaBelumLunas ?? 0;
  document.getElementById("dashTotalTrx").innerText = stats.totalTransaksi ?? 0;

  document.getElementById("dashTotalTagihan").innerText = formatRupiah(stats.totalTagihan);
  document.getElementById("dashUangMasuk").innerText = formatRupiah(stats.totalUangMasuk);
  document.getElementById("dashSisaTagihan").innerText = formatRupiah(stats.sisaTagihan);

  // Progress bar Pivora
  const bar = document.getElementById("dashProgressBar");
  const pctLabel = document.getElementById("dashProgressPct");
  if (bar) {
    const pct = stats.totalTagihan > 0
      ? Math.min(100, Math.round((stats.totalUangMasuk / stats.totalTagihan) * 100))
      : 0;
    bar.style.width = pct + "%";
    if (pctLabel) pctLabel.innerText = pct + "% terkumpul";
  }
}

function statusBadge(status) {
  if (status === "Lunas") {
    return '<span class="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold rounded-md">Lunas</span>';
  }
  if (status === "Cicilan") {
    return '<span class="inline-block px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold rounded-md">Cicilan</span>';
  }
  return '<span class="inline-block px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold rounded-md">Belum bayar</span>';
}

export function renderStudentTable(students, total) {
  const tbody = document.getElementById("tabelDataSiswa");
  tbody.innerHTML = "";
  setCountText("countSiswa", (students || []).length, total ?? (students || []).length, "siswa");

  if (!students || students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400 text-[13px]">Tidak ada yang cocok. Ubah kata kunci atau filter status.</td></tr>`;
    return;
  }

  students.forEach((s) => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 border-b border-slate-100 last:border-0";
    tr.innerHTML = `
      <td class="px-4 py-2.5 font-semibold text-slate-800 whitespace-nowrap">${escapeHtml(s.nis)}</td>
      <td class="px-4 py-2.5 text-slate-700">${escapeHtml(s.nama)}</td>
      <td class="px-4 py-2.5 text-slate-500 whitespace-nowrap">${escapeHtml(s.kelas)}</td>
      <td class="px-4 py-2.5 num text-slate-800">${formatRupiah(s.total_tagihan)}</td>
      <td class="px-4 py-2.5 num text-slate-700">${formatRupiah(s.total_terbayar)}</td>
      <td class="px-4 py-2.5 num font-semibold text-slate-800">${formatRupiah(s.sisa_tagihan)}</td>
      <td class="px-4 py-2.5">${statusBadge(s.status)}</td>`;
    tbody.appendChild(tr);
  });
}

export function renderPaymentHistory(history, onPrintCallback, total) {
  const tbody = document.getElementById("tabelRiwayat");
  tbody.innerHTML = "";
  setCountText("countRiwayat", (history || []).length, total ?? (history || []).length, "transaksi");

  if (!history || history.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-slate-400 text-[13px]">Tidak ada yang cocok. Ubah kata kunci.</td></tr>`;
    return;
  }

  history.forEach((h) => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 border-b border-slate-100 last:border-0";
    tr.innerHTML = `
      <td class="px-4 py-2.5 font-semibold text-slate-800 whitespace-nowrap">${escapeHtml(h.trx_code)}</td>
      <td class="px-4 py-2.5 text-slate-500 whitespace-nowrap">${formatDate(h.created_at)}</td>
      <td class="px-4 py-2.5 text-slate-600">${escapeHtml(h.nis)}</td>
      <td class="px-4 py-2.5 text-slate-800">${escapeHtml(h.nama_siswa)}</td>
      <td class="px-4 py-2.5 num font-semibold text-slate-800">${formatRupiah(h.jumlah_bayar ?? h.amount)}</td>
      <td class="px-4 py-2.5 text-slate-500 max-w-[160px] truncate">${escapeHtml(h.keterangan ?? h.notes ?? "-")}</td>
      <td class="px-4 py-2.5 text-slate-600">${escapeHtml(h.nama_petugas ?? h.petugas ?? "-")}</td>
      <td class="px-4 py-2.5">
        <button class="btn-kwitansi bg-white border border-slate-300 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[36px]">Kwitansi</button>
      </td>`;

    tr.querySelector(".btn-kwitansi").addEventListener("click", () => {
      if (typeof onPrintCallback === "function") onPrintCallback(h);
    });

    tbody.appendChild(tr);
  });
}

export function renderLaporanTable(students, total) {
  const tbody = document.getElementById("tabelLaporanRekap");
  tbody.innerHTML = "";
  setCountText("countRekap", (students || []).length, total ?? (students || []).length, "siswa");

  if (!students || students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400 text-[13px]">Tidak ada yang cocok. Ubah kata kunci atau filter status.</td></tr>`;
    return;
  }

  students.forEach((s) => {
    const tr = document.createElement("tr");
    tr.className = "border-b border-slate-100 last:border-0";
    tr.innerHTML = `
      <td class="px-4 py-2.5">${escapeHtml(s.nis)}</td>
      <td class="px-4 py-2.5">${escapeHtml(s.nama)}</td>
      <td class="px-4 py-2.5 text-slate-500">${escapeHtml(s.kelas)}</td>
      <td class="px-4 py-2.5 num">${formatRupiah(s.total_tagihan)}</td>
      <td class="px-4 py-2.5 num">${formatRupiah(s.total_terbayar)}</td>
      <td class="px-4 py-2.5 num font-semibold">${formatRupiah(s.sisa_tagihan)}</td>
      <td class="px-4 py-2.5">${statusBadge(s.status)}</td>`;
    tbody.appendChild(tr);
  });
}

export function populateSiswaSelect(students) {
  const select = document.getElementById("selectSiswa");
  select.innerHTML = '<option value="">-- Pilih Siswa --</option>';

  students.forEach((s) => {
    const sisa = Number(s.sisa_tagihan) || 0;
    const statusNote = sisa === 0 ? " (LUNAS)" : ` (Sisa: ${formatRupiah(sisa)})`;
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = `${s.nis} - ${s.nama} (${s.kelas})${statusNote}`;
    if (sisa === 0) opt.disabled = true;
    select.appendChild(opt);
  });
}

export function showKwitansi(data) {
  document.getElementById("kwId").innerText = data.trx_code || data.idTrx || "-";
  document.getElementById("kwTanggal").innerText = formatDate(data.created_at || data.tanggal);
  document.getElementById("kwNis").innerText = data.nis || "-";
  document.getElementById("kwNama").innerText = data.nama_siswa || data.nama || "-";
  document.getElementById("kwKelas").innerText = data.kelas || "-";
  document.getElementById("kwJumlah").innerText = formatRupiah(data.jumlah_bayar ?? data.amount);
  document.getElementById("kwKet").innerText = data.keterangan || data.notes || "-";
  document.getElementById("kwPetugas").innerText = data.nama_petugas || data.petugas || "-";

  const modal = document.getElementById("modalKwitansi");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

export function hideKwitansi() {
  const modal = document.getElementById("modalKwitansi");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

/**
 * @param {string} role - 'admin' atau 'bendahara'
 */
export function applyRoleAccess(role) {
  const btnTambahSiswa = document.getElementById("btnBukaModalSiswa");
  if (!btnTambahSiswa) return;
  if (role === "admin") {
    btnTambahSiswa.classList.remove("hidden");
  } else {
    btnTambahSiswa.classList.add("hidden");
  }
}
