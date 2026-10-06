import { getStudentsRecap } from "../services/db.js";
import { renderStudentTable, showTableLoading, showTableError, toast } from "../lib/ui.js";
import { store, isAdmin } from "../services/store.js";

export function matchStatus(s, f) {
  if (f === "all") return true;
  if (f === "Lunas") return s.status === "Lunas";
  if (f === "Cicilan") return s.status === "Cicilan";
  return s.status !== "Lunas" && s.status !== "Cicilan";
}

export function filteredSiswa(q, statusF, kelasF, list = store.students) {
  const query = (q ?? "").toLowerCase();
  return list.filter((s) =>
    matchStatus(s, statusF) &&
    (!kelasF || s.kelas === kelasF) &&
    `${s.nis} ${s.nama} ${s.kelas}`.toLowerCase().includes(query)
  );
}

export function applySiswaView(callbacks = {}) {
  renderStudentTable(
    filteredSiswa(document.getElementById("searchSiswa")?.value, store.siswaFilter, ""),
    { canEdit: isAdmin(), onEdit: callbacks.onEdit, onDelete: callbacks.onDelete }
  );
}

export async function loadSiswa(callbacks = {}) {
  showTableLoading("tabelDataSiswa", 8);
  const res = await getStudentsRecap();
  if (res.success) {
    store.students = res.data;
    const q = (store.pendingNavQuery || "").trim().toLowerCase();
    store.pendingNavQuery = "";
    if (q) {
      const box = document.getElementById("searchSiswa");
      if (box) box.value = q;
    }
    applySiswaView(callbacks);
  } else {
    showTableError("tabelDataSiswa", 8, res.message);
    toast("Gagal memuat siswa: " + res.message, "error");
  }
}
