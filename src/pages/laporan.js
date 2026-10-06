import { getStudentsRecap } from "../services/db.js";
import { renderLaporanTable, showTableLoading, showTableError } from "../lib/ui.js";
import { store } from "../services/store.js";
import { filteredSiswa } from "./siswa.js";

export function applyRekapView() {
  renderLaporanTable(
    filteredSiswa(document.getElementById("searchRekap")?.value, store.rekapFilter, store.rekapKelas)
  );
}

export function populateKelasFilter() {
  const sel = document.getElementById("filterKelasRekap");
  if (!sel) return;
  const kelasList = [...new Set(store.students.map((s) => s.kelas).filter(Boolean))].sort();
  const current = sel.value;
  sel.innerHTML = '<option value="">Semua kelas</option>';
  kelasList.forEach((k) => {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = k;
    sel.appendChild(opt);
  });
  sel.value = kelasList.includes(current) ? current : "";
  store.rekapKelas = sel.value;
}

export async function loadLaporan() {
  showTableLoading("tabelLaporanRekap", 7);
  const res = await getStudentsRecap();
  if (res.success) {
    store.students = res.data;
    populateKelasFilter();
    applyRekapView();
  } else {
    showTableError("tabelLaporanRekap", 7, res.message);
  }
}
