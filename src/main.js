import { loginUser, logoutUser, checkCurrentSession } from "./auth.js";
import {
  getDashboardData,
  getStudentsRecap,
  addStudent,
  createPayment,
  getPaymentHistory
} from "./db.js";
import {
  renderDashboard,
  renderStudentTable,
  renderPaymentHistory,
  renderLaporanTable,
  populateSiswaSelect,
  showKwitansi,
  hideKwitansi,
  applyRoleAccess,
  formatRupiah,
  toast,
  showTableLoading,
  showTableError
} from "./ui.js";
import { exportRekapToCSV, exportHistoryToCSV } from "./export.js";

// Cache state di memori browser
let globalStudents = [];
let globalHistory = [];
let currentActiveTab = "dashboard";
// Query titipan dari navbar search saat pindah ke halaman siswa
let pendingNavQuery = "";
// Filter status aktif: all, Lunas, Cicilan, belum
let siswaStatusFilter = "all";
let rekapStatusFilter = "all";

function matchStatus(s, f) {
  if (f === "all") return true;
  if (f === "Lunas") return s.status === "Lunas";
  if (f === "Cicilan") return s.status === "Cicilan";
  return s.status !== "Lunas" && s.status !== "Cicilan";
}

function applySiswaView() {
  const q = (document.getElementById("searchSiswa")?.value || "").toLowerCase();
  renderStudentTable(
    globalStudents.filter((s) =>
      matchStatus(s, siswaStatusFilter) &&
      `${s.nis} ${s.nama} ${s.kelas}`.toLowerCase().includes(q)
    ),
    globalStudents.length
  );
}

function applyRiwayatView() {
  const q = (document.getElementById("searchRiwayat")?.value || "").toLowerCase();
  renderPaymentHistory(
    globalHistory.filter((h) =>
      `${h.trx_code} ${h.nis} ${h.nama_siswa}`.toLowerCase().includes(q)
    ),
    (trx) => showKwitansi(trx),
    globalHistory.length
  );
}

function applyRekapView() {
  const q = (document.getElementById("searchRekap")?.value || "").toLowerCase();
  renderLaporanTable(
    globalStudents.filter((s) =>
      matchStatus(s, rekapStatusFilter) &&
      `${s.nis} ${s.nama} ${s.kelas}`.toLowerCase().includes(q)
    ),
    globalStudents.length
  );
}

function paintChips(selector, activeVal) {
  document.querySelectorAll(selector).forEach((b) => {
    const on = b.dataset.fs === activeVal || b.dataset.fr === activeVal;
    b.classList.toggle("bg-slate-900", on);
    b.classList.toggle("text-white", on);
    b.classList.toggle("bg-white", !on);
    b.classList.toggle("border", !on);
    b.classList.toggle("border-slate-300", !on);
    b.classList.toggle("text-slate-600", !on);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  setupNavbarMobile();

  const profile = await checkCurrentSession();
  if (profile) {
    onLoginSuccess(profile);
  } else {
    showLoginView();
  }
});

function onLoginSuccess(userProfile) {
  document.getElementById("navUserNama").innerText = userProfile.nama;
  document.getElementById("navUserRole").innerText = userProfile.role.toUpperCase();
  const topbarName = document.getElementById("topbarUserNama");
  if (topbarName) topbarName.innerText = userProfile.nama;
  const mNama = document.getElementById("mobileUserNama");
  if (mNama) mNama.innerText = userProfile.nama;
  const mRole = document.getElementById("mobileUserRole");
  if (mRole) mRole.innerText = userProfile.role.toUpperCase();

  applyRoleAccess(userProfile.role);

  document.getElementById("loginSection").classList.add("hidden");
  document.getElementById("appSection").classList.remove("hidden");
  document.getElementById("appSection").classList.add("flex");

  switchTab("dashboard");
}

function showLoginView() {
  document.getElementById("appSection").classList.add("hidden");
  document.getElementById("appSection").classList.remove("flex");
  document.getElementById("loginSection").classList.remove("hidden");
}

// Tab aktif navbar atas: solid indigo, nonaktif teks slate
function switchTab(tabName) {
  currentActiveTab = tabName;

  document.querySelectorAll(".page-content").forEach((el) => el.classList.add("hidden"));

  document.querySelectorAll("#mainNav .tab-btn").forEach((el) => {
    el.classList.remove("bg-indigo-600", "text-white");
    el.classList.add("text-slate-600");
  });

  const page = document.getElementById(`page-${tabName}`);
  const tabBtn = document.getElementById(`tab-${tabName}`);
  if (page) {
    page.classList.remove("hidden");
  }
  if (tabBtn) {
    tabBtn.classList.remove("text-slate-600");
    tabBtn.classList.add("bg-indigo-600", "text-white");
  }

  // Fetch data sesuai tab
  if (tabName === "dashboard") loadDashboard();
  if (tabName === "siswa") loadSiswa();
  if (tabName === "bayar") prepareFormBayar();
  if (tabName === "riwayat") loadRiwayat();
  if (tabName === "laporan") loadLaporan();

  // Tutup panel navbar mobile setelah pindah halaman + samakan status tombol mobile
  const panel = document.getElementById("mobileNavPanel");
  if (panel) panel.classList.add("hidden");
  document.querySelectorAll(".nav-goto").forEach((b) => {
    const active = b.dataset.goto === tabName;
    b.classList.toggle("bg-indigo-50", active);
    b.classList.toggle("text-indigo-700", active);
    b.classList.toggle("text-slate-700", !active);
  });
}

async function loadDashboard() {
  ["dashTotalSiswa", "dashSiswaLunas", "dashSiswaBelumLunas", "dashTotalTrx"].forEach((id) => {
    document.getElementById(id).innerText = "…";
  });
  const res = await getDashboardData();
  if (res.success) {
    renderDashboard(res.data);
  } else {
    ["dashTotalSiswa", "dashSiswaLunas", "dashSiswaBelumLunas", "dashTotalTrx"].forEach((id) => {
      document.getElementById(id).innerText = "0";
    });
    toast("Gagal memuat dashboard: " + res.message, "error");
  }
}

async function loadSiswa() {
  showTableLoading("tabelDataSiswa", 7);
  const res = await getStudentsRecap();
  if (res.success) {
    globalStudents = res.data;
    // Terapkan query titipan dari navbar search (misal dari dashboard/kasir)
    const q = pendingNavQuery.trim().toLowerCase();
    pendingNavQuery = "";
    if (q) {
      const box = document.getElementById("searchSiswa");
      if (box) box.value = q;
    }
    applySiswaView();
  } else {
    showTableError("tabelDataSiswa", 7, res.message);
    toast("Gagal memuat siswa: " + res.message, "error");
  }
}

async function prepareFormBayar() {
  const res = await getStudentsRecap();
  if (res.success) {
    globalStudents = res.data;
    populateSiswaSelect(globalStudents);
    resetFormBayarDetails();
  }
}

async function loadRiwayat() {
  showTableLoading("tabelRiwayat", 8);
  const res = await getPaymentHistory();
  if (res.success) {
    globalHistory = res.data;
    applyRiwayatView();
  } else {
    showTableError("tabelRiwayat", 8, res.message);
    toast("Gagal memuat riwayat: " + res.message, "error");
  }
}

async function loadLaporan() {
  showTableLoading("tabelLaporanRekap", 7);
  const res = await getStudentsRecap();
  if (res.success) {
    globalStudents = res.data;
    applyRekapView();
  } else {
    showTableError("tabelLaporanRekap", 7, res.message);
  }
}

function setupNavbarMobile() {
  const btn = document.getElementById("btnNavbar");
  const panel = document.getElementById("mobileNavPanel");
  if (!btn || !panel) return;
  btn.addEventListener("click", () => {
    const open = panel.classList.toggle("hidden");
    btn.setAttribute("aria-expanded", String(!open));
  });
  panel.querySelectorAll(".nav-goto").forEach((b) => {
    b.addEventListener("click", () => switchTab(b.dataset.goto));
  });
  document.getElementById("btnLogoutMobile")?.addEventListener("click", async () => {
    await logoutUser();
    showLoginView();
  });
}

function setupEventListeners() {
  const formLogin = document.getElementById("formLogin");
  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("inputEmail").value.trim();
    const password = document.getElementById("inputPassword").value;
    const btn = document.getElementById("btnLogin");
    const errText = document.getElementById("loginError");

    btn.disabled = true;
    btn.innerHTML = `<span>Memeriksa...</span>`;
    errText.classList.add("hidden");

    const res = await loginUser(email, password);
    btn.disabled = false;
    btn.innerHTML = `<span>Masuk</span>`;

    if (res.success) {
      onLoginSuccess(res.user);
    } else {
      errText.innerText = res.message;
      errText.classList.remove("hidden");
    }
  });

  document.getElementById("btnLogout").addEventListener("click", async () => {
    await logoutUser();
    showLoginView();
  });

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabName = btn.id.replace("tab-", "");
      switchTab(tabName);
    });
  });

  const selectSiswa = document.getElementById("selectSiswa");
  selectSiswa.addEventListener("change", () => {
    const studentId = selectSiswa.value;
    const s = globalStudents.find((item) => String(item.id) === String(studentId));

    if (s) {
      const sisa = Number(s.sisa_tagihan) || 0;
      document.getElementById("bayarNama").value = s.nama;
      document.getElementById("bayarKelas").value = s.kelas;
      document.getElementById("bayarSisaTagihan").value = formatRupiah(sisa);

      const inputNominal = document.getElementById("bayarNominal");
      inputNominal.max = sisa;
      inputNominal.value = sisa > 0 ? sisa : "";
      inputNominal.placeholder = sisa > 0 ? `Maks ${formatRupiah(sisa)}` : "Sudah lunas";
    } else {
      resetFormBayarDetails();
    }
  });

  // Live search tabel siswa
  const searchSiswa = document.getElementById("searchSiswa");
  if (searchSiswa) {
    searchSiswa.addEventListener("input", applySiswaView);
  }

  // Live search riwayat
  const searchRiwayat = document.getElementById("searchRiwayat");
  if (searchRiwayat) {
    searchRiwayat.addEventListener("input", applyRiwayatView);
  }

  // Live search rekap
  const searchRekap = document.getElementById("searchRekap");
  if (searchRekap) {
    searchRekap.addEventListener("input", applyRekapView);
  }

  // Filter status siswa + rekap
  document.querySelectorAll(".fs-chip").forEach((b) => {
    b.addEventListener("click", () => {
      siswaStatusFilter = b.dataset.fs;
      paintChips(".fs-chip", siswaStatusFilter);
      applySiswaView();
    });
  });
  document.querySelectorAll(".fr-chip").forEach((b) => {
    b.addEventListener("click", () => {
      rekapStatusFilter = b.dataset.fr;
      paintChips(".fr-chip", rekapStatusFilter);
      applyRekapView();
    });
  });

  // Search di navbar: filter halaman yang sedang dibuka.
  // Kalau posisi di dashboard/kasir, Enter akan pindah ke Data Siswa + filter.
  const navSearch = document.getElementById("navSearch");
  const navSearchMobile = document.getElementById("navSearchMobile");
  const syncNavBoxes = (val, except) => {
    [navSearch, navSearchMobile].forEach((box) => {
      if (box && box !== except) box.value = val;
    });
  };
  const applyNavSearch = (raw, sourceBox) => {
    syncNavBoxes(raw, sourceBox);
    if (currentActiveTab === "siswa") {
      const box = document.getElementById("searchSiswa");
      if (box) box.value = raw;
      applySiswaView();
    } else if (currentActiveTab === "riwayat") {
      const box = document.getElementById("searchRiwayat");
      if (box) box.value = raw;
      applyRiwayatView();
    } else if (currentActiveTab === "laporan") {
      const box = document.getElementById("searchRekap");
      if (box) box.value = raw;
      applyRekapView();
    }
    // Di dashboard/kasir: ketik saja tidak memindah halaman,
    // pindahnya saat tekan Enter (lihat keydown di bawah).
  };
  [navSearch, navSearchMobile].forEach((box) => {
    if (!box) return;
    box.addEventListener("input", () => applyNavSearch(box.value, box));
    box.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (currentActiveTab !== "siswa" && currentActiveTab !== "riwayat" && currentActiveTab !== "laporan") {
          pendingNavQuery = box.value;
          switchTab("siswa");
        }
      }
      if (e.key === "Escape") {
        box.value = "";
        applyNavSearch("", box);
      }
    });
  });

  document.getElementById("formBayar").addEventListener("submit", async (e) => {
    e.preventDefault();
    const studentId = document.getElementById("selectSiswa").value;
    const nominal = document.getElementById("bayarNominal").value;
    const notes = document.getElementById("bayarKet").value.trim();
    const btn = document.getElementById("btnSubmitBayar");

    if (!studentId) {
      toast("Pilih siswa terlebih dahulu.", "error");
      return;
    }
    if (!nominal || Number(nominal) <= 0) {
      toast("Nominal harus lebih dari 0.", "error");
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<span>Menyimpan...</span>`;

    const res = await createPayment({
      student_id: studentId,
      amount: nominal,
      notes: notes
    });

    btn.disabled = false;
    btn.innerHTML = `<span>Simpan pembayaran</span>`;

    if (res.success) {
      toast(res.message, "success");
      showKwitansi(res.data);
      document.getElementById("formBayar").reset();
      resetFormBayarDetails();
      prepareFormBayar();
    } else {
      toast("Gagal: " + res.message, "error");
    }
  });

  const btnBukaModal = document.getElementById("btnBukaModalSiswa");
  if (btnBukaModal) {
    btnBukaModal.addEventListener("click", () => {
      document.getElementById("modalSiswa").classList.remove("hidden");
      document.getElementById("modalSiswa").classList.add("flex");
    });
  }

  document.getElementById("btnBatalTambahSiswa").addEventListener("click", closeModalSiswa);

  document.getElementById("formTambahSiswa").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      nis: document.getElementById("addNis").value.trim(),
      nama: document.getElementById("addNama").value.trim(),
      kelas: document.getElementById("addKelas").value.trim(),
      total_tagihan: document.getElementById("addTagihan").value,
    };

    if (!payload.nis || !payload.nama || !payload.kelas) {
      toast("Lengkapi semua field siswa.", "error");
      return;
    }

    const res = await addStudent(payload);
    if (res.success) {
      toast(res.message, "success");
      closeModalSiswa();
      document.getElementById("formTambahSiswa").reset();
      document.getElementById("addTagihan").value = 500000;
      loadSiswa();
    } else {
      toast("Gagal menambahkan siswa: " + res.message, "error");
    }
  });

  document.getElementById("btnTutupKwitansi").addEventListener("click", hideKwitansi);

  // Tutup modal klik backdrop
  ["modalSiswa", "modalKwitansi"].forEach((id) => {
    document.getElementById(id)?.addEventListener("click", (e) => {
      if (e.target.id === id) {
        document.getElementById(id).classList.add("hidden");
        document.getElementById(id).classList.remove("flex");
      }
    });
  });

  document.getElementById("btnExportRekap").addEventListener("click", () => {
    exportRekapToCSV(globalStudents);
  });

  document.getElementById("btnExportRiwayat").addEventListener("click", async () => {
    if (globalHistory.length === 0) {
      const res = await getPaymentHistory();
      if (res.success) globalHistory = res.data;
    }
    exportHistoryToCSV(globalHistory);
  });
}

function closeModalSiswa() {
  document.getElementById("modalSiswa").classList.add("hidden");
  document.getElementById("modalSiswa").classList.remove("flex");
}

function resetFormBayarDetails() {
  document.getElementById("bayarNama").value = "";
  document.getElementById("bayarKelas").value = "";
  document.getElementById("bayarSisaTagihan").value = "";
  document.getElementById("bayarNominal").value = "";
  document.getElementById("bayarNominal").removeAttribute("max");
}
