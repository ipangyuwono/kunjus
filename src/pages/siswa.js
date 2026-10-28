import { getStudentsRecap, fixTagihanAndNisBatch } from "../services/db.js";
import { renderStudentTable, renderSiswaPagination, showTableLoading, showTableError, toast } from "../lib/ui.js";
import { store, isAdmin } from "../services/store.js";

let currentSiswaPage = 1;
export const PAGE_SIZE = 25;

export function resetSiswaPage() {
  currentSiswaPage = 1;
}

export function matchStatus(s, f) {
  if (f === "all") return true;
  if (f === "Lunas") return s.status === "Lunas";
  if (f === "Cicilan") return s.status === "Cicilan";
  return s.status !== "Lunas" && s.status !== "Cicilan";
}

export function filteredSiswa(q, statusF, kelasF, list = store.students || []) {
  const query = (q ?? "").toLowerCase().trim();
  const res = list.filter((s) => {
    if (!matchStatus(s, statusF)) return false;
    if (kelasF && s.kelas !== kelasF) return false;
    if (!query) return true;
    if (!s._search) {
      s._search = `${s.nis || ""} ${s.nama || ""} ${s.kelas || ""}`.toLowerCase();
    }
    return s._search.includes(query);
  });

  return res.sort((a, b) => {
    const nisComp = String(a.nis || "").localeCompare(String(b.nis || ""), undefined, { numeric: true });
    if (nisComp !== 0) return nisComp;
    const namaComp = String(a.nama || "").localeCompare(String(b.nama || ""));
    if (namaComp !== 0) return namaComp;
    return String(a.kelas || "").localeCompare(String(b.kelas || ""), undefined, { numeric: true });
  });
}

export function applySiswaView(callbacks = {}) {
  const allFiltered = filteredSiswa(document.getElementById("searchSiswa")?.value, store.siswaFilter, "");
  const total = allFiltered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (currentSiswaPage > totalPages) currentSiswaPage = totalPages;
  if (currentSiswaPage < 1) currentSiswaPage = 1;

  const startIdx = (currentSiswaPage - 1) * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, total);
  const pagedList = allFiltered.slice(startIdx, endIdx);

  renderStudentTable(
    pagedList,
    { canEdit: isAdmin(), onEdit: callbacks.onEdit, onDelete: callbacks.onDelete },
    startIdx
  );

  renderSiswaPagination(total, currentSiswaPage, PAGE_SIZE, (newPage) => {
    currentSiswaPage = newPage;
    applySiswaView(callbacks);
  });
}

export async function loadSiswa(callbacks = {}) {
  showTableLoading("tabelDataSiswa", 9);
  try {
    const res = await getStudentsRecap();
    if (res.success) {
      const data = res.data || [];
      for (let i = 0; i < data.length; i++) {
        const s = data[i];
        s._search = `${s.nis || ""} ${s.nama || ""} ${s.kelas || ""}`.toLowerCase();
      }
      store.students = data;
      const q = (store.pendingNavQuery || "").trim().toLowerCase();
      store.pendingNavQuery = "";
      if (q) {
        const box = document.getElementById("searchSiswa");
        if (box) box.value = q;
      }
      applySiswaView(callbacks);
    } else {
      showTableError("tabelDataSiswa", 9, res.message);
      toast("Gagal memuat siswa: " + res.message, "error");
    }
  } catch (err) {
    console.error("Error in loadSiswa:", err);
    showTableError("tabelDataSiswa", 9, err.message || "Gagal memuat data.");
    toast("Terjadi kesalahan: " + err.message, "error");
  }
}
