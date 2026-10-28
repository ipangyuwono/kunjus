import { loginUser, logoutUser, checkCurrentSession } from "./services/auth.js";
import {
  addStudent,
  updateStudent,
  deleteStudent,
  createPayment,
  deletePaymentByCode,
  getPaymentHistory,
  getStudentsRecap,
  importStudentsBatch,
} from "./services/db.js";
import {
  showKwitansi,
  hideKwitansi,
  applyRoleAccess,
  formatRupiah,
  formatRibuan,
  toast,
  confirmDelete,
  escapeHtml,
  debounce,
} from "./lib/ui.js";
import { exportRekapToExcel, exportHistoryToExcel, parseStudentsFromExcel } from "./lib/export.js";
import { store } from "./services/store.js";
import { loadDashboard } from "./pages/dashboard.js";
import { loadSiswa, applySiswaView, filteredSiswa, resetSiswaPage } from "./pages/siswa.js";
import { prepareFormBayar, applyBayarSelectFilter, resetFormBayarDetails } from "./pages/bayar.js";
import { loadRiwayat, applyRiwayatView, filteredRiwayat } from "./pages/riwayat.js";
import { loadLaporan, applyRekapView } from "./pages/laporan.js";

let currentActiveTab = "dashboard";
let editingId = "";

const pageCallbacks = {
  onEdit: openEditStudent,
  onDelete: confirmDeleteStudent,
  onDeletePayment: confirmDeletePayment,
};

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
  const btnImport = document.getElementById("btnImportSiswa");
  const fileInput = document.getElementById("fileImportSiswa");

if (btnImport && fileInput) {
  btnImport.addEventListener("click", ( ) => fileInput.click());

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      btnImport.disabled = true;
      btnImport.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Membaca...`;

      const students = await parseStudentsFromExcel(file);

      if (students.length === 0) {
        toast("Tidak ada data siswa yang terbaca dari Excel.", "error");
        return;
      }

      const confirmResult = await Swal.fire({
        title: "Import Data Siswa?",
        html: `Ditemukan <b>${students.length}</b> siswa dari file Excel.<br>Lanjutkan proses penyimpanan?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Ya, Import",
        cancelButtonText: "Batal",
        confirmButtonColor: "#4f46e5",
      });

      if (confirmResult.isConfirmed) {
        btnImport.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Menyimpan...`;
        const res = await importStudentsBatch(students);

        if (res.success) {
          toast(res.message, "success");
          loadSiswa(pageCallbacks); 
        } else {
          toast("Gagal import: " + res.message, "error");
        }
      }
    } catch (err) {
      toast("Gagal memproses Excel: " + err.message, "error");
    } finally {
      btnImport.disabled = false;
      btnImport.innerHTML = `<i class="fa-solid fa-file-arrow-up text-xs"></i> <span>Import Excel</span>`;
      fileInput.value = ""; 
    }
  });
}

  setupNavbarMobile();

  const profile = await checkCurrentSession();
  if (profile) {
    onLoginSuccess(profile);
  } else {
    showLoginView();
  }
});

function onLoginSuccess(userProfile) {
  store.role = userProfile.role || "";
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

function switchTab(tabName) {
  currentActiveTab = tabName;

  document.querySelectorAll(".page-content").forEach((el) => el.classList.add("hidden"));

  document.querySelectorAll("#mainNav .tab-btn").forEach((el) => {
    el.classList.remove("bg-indigo-600", "text-white");
    el.classList.add("text-slate-600");
    el.removeAttribute("aria-current");
  });

  const page = document.getElementById(`page-${tabName}`);
  const tabBtn = document.getElementById(`tab-${tabName}`);
  if (page) {
    page.classList.remove("hidden");
  }
  if (tabBtn) {
    tabBtn.classList.remove("text-slate-600");
    tabBtn.classList.add("bg-indigo-600", "text-white");
    tabBtn.setAttribute("aria-current", "page");
  }

  if (tabName === "dashboard") loadDashboard();
  if (tabName === "siswa") loadSiswa(pageCallbacks);
  if (tabName === "bayar") prepareFormBayar();
  if (tabName === "riwayat") loadRiwayat({ onDelete: confirmDeletePayment });
  if (tabName === "laporan") loadLaporan();

  const panel = document.getElementById("mobileNavPanel");
  if (panel) panel.classList.add("hidden");
  document.querySelectorAll(".nav-goto").forEach((b) => {
    const active = b.dataset.goto === tabName;
    b.classList.toggle("bg-indigo-50", active);
    b.classList.toggle("text-indigo-700", active);
    b.classList.toggle("text-slate-700", !active);
  });
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
    const s = store.students.find((item) => String(item.id) === String(studentId));

    if (s) {
      const sisa = Number(s.sisa_tagihan) || 0;
      document.getElementById("bayarNama").value = s.nama;
      document.getElementById("bayarKelas").value = s.kelas;
      document.getElementById("bayarSisaTagihan").value = formatRupiah(sisa);

      const inputNominal = document.getElementById("bayarNominal");
      inputNominal.value = sisa > 0 ? formatRibuan(sisa) : "";
      inputNominal.placeholder = sisa > 0 ? `Maks ${formatRupiah(sisa)}` : "Sudah lunas";
    } else {
      resetFormBayarDetails();
    }
  });

  const inputNominal = document.getElementById("bayarNominal");
  inputNominal.addEventListener("input", () => {
    const caretFromEnd = inputNominal.value.length - inputNominal.selectionStart;
    const raw = inputNominal.value.replace(/\D/g, "");
    inputNominal.value = raw ? formatRibuan(raw) : "";
    const pos = inputNominal.value.length - caretFromEnd;
    inputNominal.setSelectionRange(Math.max(pos, 0), Math.max(pos, 0));
  });

  const searchSiswa = document.getElementById("searchSiswa");
  if (searchSiswa) {
    searchSiswa.addEventListener(
      "input",
      debounce(() => {
        resetSiswaPage();
        applySiswaView(pageCallbacks);
      }, 150)
    );
  }

  const searchRiwayat = document.getElementById("searchRiwayat");
  if (searchRiwayat) {
    searchRiwayat.addEventListener(
      "input",
      debounce(() => applyRiwayatView({ onDelete: confirmDeletePayment }), 150)
    );
  }

  const searchRekap = document.getElementById("searchRekap");
  if (searchRekap) {
    searchRekap.addEventListener("input", debounce(applyRekapView, 150));
  }

  const searchBayar = document.getElementById("searchBayar");
  if (searchBayar) {
    searchBayar.addEventListener(
      "input",
      debounce(() => {
        store.bayarQuery = searchBayar.value;
        applyBayarSelectFilter();
      }, 150)
    );
  }

  document.querySelectorAll(".fs-chip").forEach((b) => {
    b.addEventListener("click", () => {
      store.siswaFilter = b.dataset.fs;
      paintChips(".fs-chip", store.siswaFilter);
      resetSiswaPage();
      applySiswaView(pageCallbacks);
    });
  });
  document.querySelectorAll(".fr-chip").forEach((b) => {
    b.addEventListener("click", () => {
      store.rekapFilter = b.dataset.fr;
      paintChips(".fr-chip", store.rekapFilter);
      applyRekapView();
    });
  });

  const navSearch = document.getElementById("navSearch");
  const navSearchMobile = document.getElementById("navSearchMobile");
  const syncNavBoxes = (val, except) => {
    [navSearch, navSearchMobile].forEach((box) => {
      if (box && box !== except) box.value = val;
    });
  };
  const performNavSearch = (raw) => {
    if (currentActiveTab === "siswa") {
      const box = document.getElementById("searchSiswa");
      if (box) box.value = raw;
      applySiswaView(pageCallbacks);
    } else if (currentActiveTab === "riwayat") {
      const box = document.getElementById("searchRiwayat");
      if (box) box.value = raw;
      applyRiwayatView({ onDelete: confirmDeletePayment });
    } else if (currentActiveTab === "laporan") {
      const box = document.getElementById("searchRekap");
      if (box) box.value = raw;
      applyRekapView();
    }
  };
  const debouncedNavSearch = debounce(performNavSearch, 150);

  const applyNavSearch = (raw, sourceBox, immediate = false) => {
    syncNavBoxes(raw, sourceBox);
    if (immediate || !raw) {
      performNavSearch(raw);
    } else {
      debouncedNavSearch(raw);
    }
  };
  [navSearch, navSearchMobile].forEach((box) => {
    if (!box) return;
    box.addEventListener("input", () => applyNavSearch(box.value, box));
    box.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (currentActiveTab !== "siswa" && currentActiveTab !== "riwayat" && currentActiveTab !== "laporan") {
          store.pendingNavQuery = box.value;
          switchTab("siswa");
        }
      }
      if (e.key === "Escape") {
        box.value = "";
        applyNavSearch("", box, true);
      }
    });
  });

  document.getElementById("formBayar").addEventListener("submit", async (e) => {
    e.preventDefault();
    const studentId = document.getElementById("selectSiswa").value;
    const nominalRaw = document.getElementById("bayarNominal").value.replace(/\D/g, "");
    const notes = document.getElementById("bayarKet").value.trim();
    const btn = document.getElementById("btnSubmitBayar");

    if (!studentId) {
      toast("Pilih siswa terlebih dahulu.", "error");
      return;
    }
    if (!nominalRaw || Number(nominalRaw) <= 0) {
      toast("Nominal harus lebih dari 0.", "error");
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<span>Menyimpan...</span>`;

    const res = await createPayment({
      student_id: studentId,
      amount: Number(nominalRaw),
      notes: notes
    });

    btn.disabled = false;
    btn.innerHTML = `<span>Simpan pembayaran</span>`;

    if (res.success) {
      toast("Tersimpan. Kwitansi tampil, klik Cetak bila perlu.", "success");
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
    btnBukaModal.addEventListener("click", openAddStudent);
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

    const res = editingId
      ? await updateStudent(editingId, payload)
      : await addStudent(payload);
    if (res.success) {
      toast(res.message, "success");
      closeModalSiswa();
      document.getElementById("formTambahSiswa").reset();
      document.getElementById("addTagihan").value = 1950000;
      loadSiswa(pageCallbacks);
    } else {
      toast("Gagal menyimpan siswa: " + res.message, "error");
    }
  });

  document.getElementById("filterTanggal")?.addEventListener("change", () =>
    applyRiwayatView({ onDelete: confirmDeletePayment })
  );
  document.getElementById("btnResetTanggal")?.addEventListener("click", () => {
    document.getElementById("filterTanggal").value = "";
    applyRiwayatView({ onDelete: confirmDeletePayment });
  });

  document.getElementById("filterKelasRekap")?.addEventListener("change", (e) => {
    store.rekapKelas = e.target.value;
    applyRekapView();
  });

  document.getElementById("btnTutupKwitansi").addEventListener("click", hideKwitansi);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideKwitansi();
      closeModalSiswa();
    }
  });

  ["modalSiswa", "modalKwitansi"].forEach((id) => {
    document.getElementById(id)?.addEventListener("click", (e) => {
      if (e.target.id === id) {
        document.getElementById(id).classList.add("hidden");
        document.getElementById(id).classList.remove("flex");
      }
    });
  });

  document.getElementById("btnExportRekap").addEventListener("click", () => {
    exportRekapToExcel(filteredSiswa(document.getElementById("searchRekap")?.value, store.rekapFilter, store.rekapKelas));
  });

  document.getElementById("btnExportRiwayat").addEventListener("click", async () => {
    if (store.history.length === 0) {
      const res = await getPaymentHistory();
      if (res.success) store.history = res.data;
    }
    exportHistoryToExcel(filteredRiwayat());
  });
}

function openModalSiswa() {
  document.getElementById("modalSiswa").classList.remove("hidden");
  document.getElementById("modalSiswa").classList.add("flex");
}

function openAddStudent() {
  editingId = "";
  document.getElementById("formTambahSiswa").reset();
  document.getElementById("addTagihan").value = 1950000;
  document.getElementById("modalSiswaTitle").innerText = "Tambah siswa";
  document.getElementById("modalSiswaSub").innerText = "Pastikan NIS tidak ganda.";
  openModalSiswa();
}

function openEditStudent(s) {
  editingId = s.id;
  document.getElementById("addNis").value = s.nis;
  document.getElementById("addNama").value = s.nama;
  document.getElementById("addKelas").value = s.kelas;
  document.getElementById("addTagihan").value = s.total_tagihan;
  document.getElementById("modalSiswaTitle").innerText = "Ubah siswa";
  document.getElementById("modalSiswaSub").innerText = `${s.nis} - ${s.nama}`;
  openModalSiswa();
}

async function confirmDeleteStudent(s) {
  const ok = await confirmDelete({
    html: `Data siswa akan dihapus permanen dan tidak bisa dikembalikan.`,
    confirmText: "Ya, Hapus",
  });
  if (!ok) return;
  const res = await deleteStudent(s);
  if (res.success) {
    toast(res.message, "success");
    loadSiswa(pageCallbacks);
  } else {
    toast("Gagal menghapus: " + res.message, "error");
  }
}

async function confirmDeletePayment(h) {
  const nominal = formatRupiah(h.jumlah_bayar ?? h.amount);
  const ok = await confirmDelete({
    title: `Hapus transaksi ${h.trx_code}?`,
    html: `<b class="text-slate-800">${escapeHtml(h.nama_siswa)}</b> (${escapeHtml(h.nis)}) &middot; <b class="text-rose-700">${escapeHtml(nominal)}</b><br>Saldo siswa akan bertambah kembali. Data tidak bisa dikembalikan.`,
    confirmText: "Ya, hapus transaksi",
  });
  if (!ok) return;
  const res = await deletePaymentByCode(h.trx_code);
  if (res.success) {
    toast(res.message, "success");
    loadRiwayat({ onDelete: confirmDeletePayment });
    const recap = await getStudentsRecap();
    if (recap.success) store.students = recap.data;
  } else {
    toast("Gagal menghapus: " + res.message, "error");
  }
}

function closeModalSiswa() {
  document.getElementById("modalSiswa").classList.add("hidden");
  document.getElementById("modalSiswa").classList.remove("flex");
}
