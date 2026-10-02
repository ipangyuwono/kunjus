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

export function escapeHtml(str) {  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
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

export function renderStudentTable(students, total, actions = {}) {
  const tbody = document.getElementById("tabelDataSiswa");
  tbody.innerHTML = "";
  setCountText("countSiswa", (students || []).length, total ?? (students || []).length, "siswa");

  if (!students || students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-slate-400 text-[13px]">Tidak ada yang cocok. Ubah kata kunci atau filter status.</td></tr>`;
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
      <td class="px-4 py-2.5">${statusBadge(s.status)}</td>` +
      (actions.canEdit
        ? `<td class="px-4 py-2.5 whitespace-nowrap">
          <button title="Ubah data siswa ini" aria-label="Ubah data siswa ini" class="btn-ubah inline-flex items-center justify-center w-9 h-9 bg-white border border-slate-300 rounded-lg text-xs transition hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-400"><i class="fa-solid fa-pen"></i></button>
          <button title="Hapus siswa ini (bila belum ada pembayaran)" aria-label="Hapus siswa ini" class="btn-hapus inline-flex items-center justify-center w-9 h-9 bg-white border border-slate-300 rounded-lg text-xs transition hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 ml-1.5"><i class="fa-solid fa-trash"></i></button>
        </td>`
        : ``);
    if (actions.canEdit) {
      tr.querySelector(".btn-ubah").addEventListener("click", () => actions.onEdit && actions.onEdit(s));
      tr.querySelector(".btn-hapus").addEventListener("click", () => actions.onDelete && actions.onDelete(s));
    }
    tbody.appendChild(tr);
  });
}

export function renderPaymentHistory(history, onPrintCallback, total, actions = {}) {
  const tbody = document.getElementById("tabelRiwayat");
  tbody.innerHTML = "";
  setCountText("countRiwayat", (history || []).length, total ?? (history || []).length, "transaksi");

  if (!history || history.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-slate-400 text-[13px]">Tidak ada yang cocok. Ubah kata kunci atau tanggal.</td></tr>`;
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
      <td class="px-4 py-2.5 whitespace-nowrap">
        <button title="Lihat dan cetak kwitansi" aria-label="Lihat dan cetak kwitansi" class="btn-kwitansi inline-flex items-center justify-center w-9 h-9 bg-white border border-slate-300 rounded-lg text-xs transition hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-400"><i class="fa-solid fa-receipt"></i></button>` +
      (actions.canDelete
        ? `<button title="Hapus transaksi ini permanen" aria-label="Hapus transaksi ini" class="btn-hapus-trx inline-flex items-center justify-center w-9 h-9 bg-white border border-slate-300 rounded-lg text-xs transition hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 ml-1.5"><i class="fa-solid fa-trash"></i></button>`
        : ``) +
      `</td>`;

    tr.querySelector(".btn-kwitansi").addEventListener("click", () => {
      if (typeof onPrintCallback === "function") onPrintCallback(h);
    });
    if (actions.canDelete) {
      tr.querySelector(".btn-hapus-trx").addEventListener("click", () => actions.onDelete && actions.onDelete(h));
    }

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
  const current = select ? select.value : "";
  select.innerHTML = '<option value="">-- Pilih Siswa --</option>';

  if (!students || students.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.disabled = true;
    opt.textContent = "Tidak ada yang cocok, ubah ketikan di atas.";
    select.appendChild(opt);
    return;
  }

  students.forEach((s) => {
    const sisa = Number(s.sisa_tagihan) || 0;
    const statusNote = sisa === 0 ? " (LUNAS)" : ` (Sisa: ${formatRupiah(sisa)})`;
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = `${s.nis} - ${s.nama} (${s.kelas})${statusNote}`;
    if (sisa === 0) opt.disabled = true;
    select.appendChild(opt);
  });

  if (current && [...select.options].some((o) => o.value === current)) {
    select.value = current;
  }
}

/**
 * Angka ke ejaan Bahasa Indonesia, misal 150000 -> "seratus lima puluh ribu".
 * Dipakai untuk baris Terbilang di kwitansi.
 */
export function terbilang(n) {
  n = Math.floor(Math.abs(Number(n) || 0));
  if (n === 0) return "nol";
  const kata = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
  // Gabung kepala + satuan, sisa nol tidak disebut (100 -> "seratus", bukan "seratus nol")
  const gabung = (kepala, satuan, sisa) => kepala + " " + satuan + (sisa ? " " + terbilang(sisa) : "");
  let hasil;
  if (n < 12) hasil = kata[n];
  else if (n < 20) hasil = terbilang(n - 10) + " belas";
  else if (n < 100) hasil = gabung(terbilang(Math.floor(n / 10)), "puluh", n % 10);
  else if (n < 200) hasil = "seratus" + (n % 100 ? " " + terbilang(n % 100) : "");
  else if (n < 1000) hasil = gabung(terbilang(Math.floor(n / 100)), "ratus", n % 100);
  else if (n < 2000) hasil = "seribu" + (n % 1000 ? " " + terbilang(n % 1000) : "");
  else if (n < 1000000) hasil = gabung(terbilang(Math.floor(n / 1000)), "ribu", n % 1000);
  else if (n < 1000000000) hasil = gabung(terbilang(Math.floor(n / 1000000)), "juta", n % 1000000);
  else hasil = gabung(terbilang(Math.floor(n / 1000000000)), "miliar", n % 1000000000);
  return hasil.replace(/\s+/g, " ").trim();
}

export function terbilangRupiah(n) {
  const t = terbilang(n);
  return t.charAt(0).toUpperCase() + t.slice(1) + " rupiah";
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.innerText = val;
}

export function showKwitansi(data) {
  const amount = Number(data.jumlah_bayar ?? data.amount) || 0;
  const petugas = data.nama_petugas || data.petugas || "-";
  const created = data.created_at || data.tanggal;
  const tglTtd = created
    ? new Date(created).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : "-";
  const values = {
    id: data.trx_code || data.idTrx || "-",
    tanggal: formatDate(created),
    nis: data.nis || "-",
    nama: data.nama_siswa || data.nama || "-",
    kelas: data.kelas || "-",
    jumlah: formatRupiah(amount),
    terbilang: terbilangRupiah(amount),
    ket: data.keterangan || data.notes || "-",
    petugas,
    ttdPetugas: petugas,
    tglTtd,
  };
  // Isi semua rangkap (atas + bawah) sekaligus
  document.querySelectorAll("#printArea [data-kw]").forEach((el) => {
    const key = el.getAttribute("data-kw");
    if (key && key in values) el.innerText = values[key];
  });
  // Kompatibilitas id lama (copy 1, hidden)
  setText("kwId", values.id);
  setText("kwTanggal", values.tanggal);
  setText("kwNis", values.nis);
  setText("kwNama", values.nama);
  setText("kwKelas", values.kelas);
  setText("kwJumlah", values.jumlah);
  setText("kwTerbilang", values.terbilang);
  setText("kwKet", values.ket);
  setText("kwPetugas", values.petugas);
  setText("kwTtdPetugas", values.ttdPetugas);
  setText("kwTglTtd", values.tglTtd);

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
 * Konfirmasi hapus cantik pengganti confirm() bawaan browser.
 * Pakai SweetAlert2 bila tersedia, fallback ke confirm() bila offline.
 * @returns {Promise<boolean>} true bila user menekan tombol hapus
 */
export function confirmDelete({ title = "Hapus data?", html = "Data yang dihapus tidak bisa dikembalikan.", confirmText = "Ya, hapus", cancelText = "Batal" } = {}) {
  if (typeof window.Swal === "undefined") {
    return Promise.resolve(window.confirm(`${title}\n\n${String(html).replace(/<[^>]*>/g, "")}`));
  }
  return window.Swal.fire({
    title,
    html,
    icon: "warning",
    iconColor: "#f43f5e",
    showCancelButton: true,
    confirmButtonText: `<i class="fa-solid fa-trash mr-2"></i>${escapeHtml(confirmText)}`,
    cancelButtonText: escapeHtml(cancelText),
    reverseButtons: true,
    focusCancel: true,
    allowOutsideClick: false,
    buttonsStyling: false,
    backdrop: "rgba(15,23,42,.55)",
    customClass: {
      popup: "rounded-2xl border border-slate-200 px-6 py-6",
      title: "text-base font-bold text-slate-900",
      htmlContainer: "text-[13px] text-slate-500 mt-1 leading-relaxed",
      actions: "flex gap-2 justify-center mt-5 w-full",
      confirmButton: "flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[13px] font-semibold min-h-[44px] transition disabled:opacity-60",
      cancelButton: "flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[13px] font-semibold min-h-[44px] transition",
    },
    didOpen: (popup) => {
      popup.style.fontFamily = "'Plus Jakarta Sans', sans-serif";
    },
  }).then((r) => r.isConfirmed === true);
}

/**
 * @param {string} role - 'admin' atau 'bendahara'
 */
export function applyRoleAccess(role) {
  const isAdmin = role === "admin";
  document.querySelectorAll(".admin-only").forEach((el) => {
    el.classList.toggle("hidden", !isAdmin);
  });
}
