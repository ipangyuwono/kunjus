import { getStudentsRecap } from "../services/db.js";
import { populateSiswaSelect } from "../lib/ui.js";
import { store } from "../services/store.js";

export function resetFormBayarDetails() {
  document.getElementById("bayarNama").value = "";
  document.getElementById("bayarKelas").value = "";
  document.getElementById("bayarSisaTagihan").value = "";
  document.getElementById("bayarNominal").value = "";
  document.getElementById("bayarNominal").removeAttribute("max");
}

export function applyBayarSelectFilter() {
  const q = (store.bayarQuery || "").toLowerCase().trim();
  const filtered = !q
    ? store.students
    : store.students.filter((s) =>
        `${s.nis} ${s.nama} ${s.kelas}`.toLowerCase().includes(q)
      );
  populateSiswaSelect(filtered);
}

export async function prepareFormBayar() {
  const res = await getStudentsRecap();
  if (res.success) {
    store.students = res.data;
    store.bayarQuery = "";
    const box = document.getElementById("searchBayar");
    if (box) box.value = "";
    populateSiswaSelect(store.students);
    resetFormBayarDetails();
  }
}
