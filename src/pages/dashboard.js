import { getDashboardData, getDailyTotals } from "../services/db.js";
import { renderDashboard, formatRupiah, toast } from "../lib/ui.js";

let chartHarian = null;

export async function loadDashboard() {
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
  loadChart();
}

export async function loadChart() {
  const canvas = document.getElementById("chartHarian");
  const emptyNote = document.getElementById("chartEmpty");
  if (!canvas || typeof window.Chart === "undefined") {
    if (emptyNote) {
      emptyNote.classList.remove("hidden");
      emptyNote.innerText = "Grafik tidak bisa dimuat (pustaka chart offline).";
    }
    return;
  }
  const res = await getDailyTotals(14);
  if (!res.success) {
    if (emptyNote) {
      emptyNote.classList.remove("hidden");
      emptyNote.innerText = "Grafik gagal dimuat: " + res.message;
    }
    return;
  }
  const allZero = res.data.every((d) => d.total === 0);
  if (emptyNote) emptyNote.classList.toggle("hidden", !allZero);

  if (chartHarian) chartHarian.destroy();
  chartHarian = new window.Chart(canvas, {
    type: "bar",
    data: {
      labels: res.data.map((d) => d.label),
      datasets: [{
        label: "Pemasukan (Rp)",
        data: res.data.map((d) => d.total),
        backgroundColor: "#4f46e5",
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => " " + formatRupiah(ctx.parsed.y),
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            maxTicksLimit: 5,
            callback: (v) => v >= 1000000
              ? "Rp" + (v / 1000000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " jt"
              : "Rp" + Math.round(v / 1000) + " rb",
          },
        },
      },
    },
  });
}
