const CURRENCY_FMT = '"Rp"* #,##0';
const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };

const borderAll = () => ({
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
});

const todayISO = () => new Date().toISOString().slice(0, 10);

function getColumnLetter(colIndex) {
  let temp = "";
  let num = colIndex;
  while (num > 0) {
    const mod = (num - 1) % 26;
    temp = String.fromCharCode(65 + mod) + temp;
    num = Math.floor((num - mod) / 26);
  }
  return temp;
}

function getCellValue(cell) {
  const val = cell.value;
  if (val === null || val === undefined) return "";
  if (typeof val === "object") {
    if (val.text) return val.text;
    if (val.result !== undefined) return val.result;
  }
  return val;
}

export async function parseStudentsFromExcel(file, defaultTagihan = 1950000) {
  const ExcelJS = window.ExcelJS;
  if (!ExcelJS) {
    throw new Error("Pustaka ExcelJS belum siap. Pastikan koneksi internet aktif.");
  }
  const buffer = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  
  // Ambil worksheet pertama
  const ws = wb.worksheets[0];
  if (!ws) {
    throw new Error("File Excel kosong atau tidak memiliki worksheet.");
  }

  let colNis = -1;
  let colNama = -1;
  let colKelas = -1;
  let colTagihan = -1;

  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    const raw = String(getCellValue(cell)).toLowerCase().trim();
    const clean = raw.replace(/[^a-z0-9]/g, "");

    if (clean.includes("nis") || clean.includes("induk")) {
      colNis = colNumber;
    } else if (clean.includes("nama") || clean.includes("siswa") || clean.includes("peserta")) {
      colNama = colNumber;
    } else if (clean.includes("kelas") || clean.includes("rombel") || clean.includes("tingkat")) {
      colKelas = colNumber;
    } else if (clean.includes("tagihan") || clean.includes("biaya") || clean.includes("nominal")) {
      colTagihan = colNumber;
    }
  });

  if (colNis === -1 || colNama === -1) {
    const firstCellText = String(getCellValue(ws.getRow(1).getCell(1))).toLowerCase();
    if (firstCellText.includes("no")) {
      colNis = 2;
      colNama = 3;
      colKelas = 4;
    } else {
      colNis = 1;
      colNama = 2;
      colKelas = 3;
    }
  }

  const students = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const nis = String(getCellValue(row.getCell(colNis))).trim();
    const nama = String(getCellValue(row.getCell(colNama))).trim();
    const kelas = colKelas !== -1 ? String(getCellValue(row.getCell(colKelas))).trim() : "-";

    // Validasi: harus ada NIS dan Nama
    if (!nis || !nama) return;
    if (nis.toLowerCase() === "nis" || nama.toLowerCase().includes("nama")) return;

    // Tagihan: default 1.950.000 jika tidak ada kolom tagihan di Excel
    let total_tagihan = defaultTagihan;
    if (colTagihan !== -1) {
      const rawTagihan = getCellValue(row.getCell(colTagihan));
      const parsedNum = Number(String(rawTagihan).replace(/[^\d]/g, ""));
      if (parsedNum > 0) total_tagihan = parsedNum;
    }

    students.push({
      nis,
      nama,
      kelas: kelas || "-",
      total_tagihan,
    });
  });

  // 2. Urutkan secara ascending: NIS -> Nama -> Kelas
  students.sort((a, b) => {
    // Urutkan NIS secara numerik ascending (misal: 101, 102, 103...)
    const nisComp = String(a.nis || "").localeCompare(String(b.nis || ""), undefined, { numeric: true });
    if (nisComp !== 0) return nisComp;

    // Jika NIS sama, urutkan Nama ascending (A-Z)
    const namaComp = String(a.nama || "").localeCompare(String(b.nama || ""));
    if (namaComp !== 0) return namaComp;

    // Jika Nama sama, urutkan Kelas ascending
    return String(a.kelas || "").localeCompare(String(b.kelas || ""), undefined, { numeric: true });
  });

  return students;
}


/**
 * Generic XLSX writer using global window.ExcelJS loaded via CDN.
 * columns: [{ header, key, width, align?, numFmt? }]
 */
async function downloadXlsx({ sheetName, filename, columns, rows }) {
  const ExcelJS = window.ExcelJS;
  if (!ExcelJS) {
    alert("Pustaka ExcelJS belum siap atau gagal dimuat dari CDN. Pastikan koneksi internet aktif.");
    return;
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);

  ws.columns = columns.map(({ header, key, width }) => ({ header, key, width }));
  rows.forEach((r) => ws.addRow(r));

  columns.forEach((c, i) => {
    if (c.numFmt) ws.getColumn(i + 1).numFmt = c.numFmt;
  });

  ws.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      const col = columns[colNumber - 1];
      const isHeader = rowNumber === 1;

      cell.border = borderAll();
      cell.font = { name: "Calibri", size: 11, bold: isHeader };
      cell.alignment = {
        vertical: "middle",
        horizontal: isHeader ? "center" : col?.align ?? "left",
      };
      if (isHeader) cell.fill = HEADER_FILL;
    });
  });

  ws.views = [{ state: "frozen", ySplit: 1 }];
  const lastColLetter = getColumnLetter(columns.length);
  ws.autoFilter = `A1:${lastColLetter}1`;

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function exportRekapToExcel(students) {
  if (!students?.length) {
    alert("Tidak ada data rekap siswa untuk diexport!");
    return;
  }

  const columns = [
    { header: "NIS",           key: "nis",       width: 14, align: "center" },
    { header: "Nama Siswa",    key: "nama",      width: 36, align: "left" },
    { header: "Kelas",         key: "kelas",     width: 12, align: "center" },
    { header: "Total Tagihan", key: "total",     width: 18, align: "right", numFmt: CURRENCY_FMT },
    { header: "Terbayar",      key: "terbayar",  width: 18, align: "right", numFmt: CURRENCY_FMT },
    { header: "Sisa Tagihan",  key: "sisa",      width: 18, align: "right", numFmt: CURRENCY_FMT },
    { header: "Status",        key: "status",    width: 14, align: "center" },
  ];

  const rows = students.map((s) => ({
    nis:      String(s.nis ?? ""),
    nama:     s.nama ?? "",
    kelas:    s.kelas ?? "",
    total:    Number(s.total_tagihan) || 0,
    terbayar: Number(s.total_terbayar) || 0,
    sisa:     Number(s.sisa_tagihan) || 0,
    status:   s.status ?? "",
  }));

  await downloadXlsx({
    sheetName: "Rekap",
    filename: `Rekap_Pembayaran_Siswa_${todayISO()}.xlsx`,
    columns,
    rows,
  });
}

export async function exportHistoryToExcel(history) {
  if (!history?.length) {
    alert("Tidak ada data transaksi untuk diexport!");
    return;
  }

  const columns = [
    { header: "No",      key: "no",      width: 6,  align: "center" },
    { header: "Nama",    key: "nama",    width: 36, align: "left" },
    { header: "Kelas",   key: "kelas",   width: 12, align: "center" },
    { header: "NIS",     key: "nis",     width: 14, align: "center" },
    { header: "Nominal", key: "nominal", width: 18, align: "right", numFmt: CURRENCY_FMT },
  ];

  const rows = history.map((h, i) => ({
    no:      h.no ?? i + 1,
    nama:    h.nama_siswa ?? "",
    kelas:   h.kelas ?? "",
    nis:     String(h.nis ?? ""),
    nominal: Number(h.jumlah_bayar ?? h.amount) || 0,
  }));

  await downloadXlsx({
    sheetName: "Data",
    filename: `Riwayat_Transaksi_${todayISO()}.xlsx`,
    columns,
    rows,
  });
}

// Aliases for backwards compatibility
export const exportRekapToCSV = exportRekapToExcel;
export const exportHistoryToCSV = exportHistoryToExcel;