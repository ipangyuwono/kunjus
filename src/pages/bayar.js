import { getStudentsRecap } from "../services/db.js";
import { populateSiswaSelect } from "../lib/ui.js";
import { store } from "../services/store.js";

export function resetFormBayarDetails() {
  document.getElementById("bayarNama").value = "";
  document.getElementById("bayarKelas").value = "";
  document.getElementById("bayarSisaTagihan").value = "";
  document.getElementById("bayarNominal").value = "";
}

export function applyBayarSelectFilter() {
  const q = (store.bayarQuery || "").toLowerCase().trim();
  const students = store.students || [];
  const filtered = !q
    ? students
    : students.filter((s) => {
        if (!s._search) {
          s._search = `${s.nis || ""} ${s.nama || ""} ${s.kelas || ""}`.toLowerCase();
        }
        return s._search.includes(q);
      });
  populateSiswaSelect(filtered);
}

export async function prepareFormBayar() {
  const res = await getStudentsRecap();
  if (res.success) {
    const data = res.data || [];
    for (let i = 0; i < data.length; i++) {
      const s = data[i];
      s._search = `${s.nis || ""} ${s.nama || ""} ${s.kelas || ""}`.toLowerCase();
    }
    store.students = data;
    store.bayarQuery = "";
    const box = document.getElementById("searchBayar");
    if (box) box.value = "";
    populateSiswaSelect(store.students);
    resetFormBayarDetails();
  }
}
