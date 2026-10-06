import { getPaymentHistory } from "../services/db.js";
import { renderPaymentHistory, showKwitansi, showTableLoading, showTableError, toast } from "../lib/ui.js";
import { store, isAdmin } from "../services/store.js";

export function localDateKey(isoString) {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function filteredRiwayat() {
  const q = (document.getElementById("searchRiwayat")?.value || "").toLowerCase();
  const tgl = document.getElementById("filterTanggal")?.value || "";
  return store.history.filter((h) =>
    (!tgl || localDateKey(h.created_at) === tgl) &&
    `${h.trx_code} ${h.nis} ${h.nama_siswa}`.toLowerCase().includes(q)
  );
}

export function applyRiwayatView(callbacks = {}) {
  const shown = filteredRiwayat();
  renderPaymentHistory(
    shown,
    (trx) => showKwitansi(trx),
    { canDelete: isAdmin(), onDelete: callbacks.onDelete }
  );
}

export async function loadRiwayat(callbacks = {}) {
  showTableLoading("tabelRiwayat", 8);
  const res = await getPaymentHistory();
  if (res.success) {
    store.history = res.data;
    applyRiwayatView(callbacks);
  } else {
    showTableError("tabelRiwayat", 8, res.message);
    toast("Gagal memuat riwayat: " + res.message, "error");
  }
}
