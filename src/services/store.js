export const store = {
  students: [],
  history: [],
  siswaFilter: "all",
  rekapFilter: "all",
  rekapKelas: "",
  role: "",
  bayarQuery: "",
  pendingNavQuery: "",
};

export function isAdmin() {
  return store.role === "admin";
}
