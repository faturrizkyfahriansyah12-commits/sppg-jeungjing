/**
 * SPPG JEUNGJING — SISTEM ABSENSI RELAWAN
 * Utils.gs — Konfigurasi & fungsi bantuan
 *
 * File ini tidak dijalankan sendiri. Salin SELURUH file .gs pada folder
 * google-apps-script/ ke satu proyek Apps Script yang sama.
 * Lihat README.md → "Langkah 2 — Setup Google Apps Script".
 */

// ------------------------------------------------------------
// KONFIGURASI
// ------------------------------------------------------------

const NAMA_SHEET = {
  RELAWAN: '01_DATA_RELAWAN',
  DIVISI: '02_DATA_DIVISI',
  ABSENSI: '03_DATA_ABSENSI',
  REKAP_HARIAN: '04_REKAP_HARIAN',
  REKAP_BULANAN: '05_REKAP_BULANAN',
  ADMIN: '06_ADMIN'
};

// Jam masuk standar (format 24 jam, "HH:MM"). Relawan yang absen MASUK
// setelah jam ini akan otomatis berstatus "TERLAMBAT".
// >>> UBAH ANGKA INI SESUAI JAM OPERASIONAL SPPG JEUNGJING YANG SEBENARNYA <<<
const JAM_MASUK_STANDAR = '07:00';

const ZONA_WAKTU = 'Asia/Jakarta';

// ------------------------------------------------------------
// AKSES SHEET
// ------------------------------------------------------------

function getSheet(namaSheet) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(namaSheet);
  if (!sheet) {
    throw new Error('Sheet "' + namaSheet + '" tidak ditemukan. Periksa kembali struktur Spreadsheet Anda.');
  }
  return sheet;
}

/** Mengubah data sheet (2D array) menjadi array of object berdasarkan header baris pertama. */
function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0].map(h => String(h).trim());
  return data.slice(1)
    .filter(row => row.some(cell => cell !== '' && cell !== null))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });
}

// ------------------------------------------------------------
// RESPON JSON
// ------------------------------------------------------------

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sukses(data) {
  return jsonResponse({ success: true, data: data });
}

function gagal(message) {
  return jsonResponse({ success: false, message: message });
}

// ------------------------------------------------------------
// FORMAT & SANITASI
// ------------------------------------------------------------

/** Sanitasi input teks sederhana: hilangkan spasi berlebih & tanda kurung sudut. */
function sanitize(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim().replace(/[<>]/g, '');
}

function formatTanggal(date) {
  return Utilities.formatDate(date, ZONA_WAKTU, 'dd/MM/yyyy');
}

function formatJam(date) {
  return Utilities.formatDate(date, ZONA_WAKTU, 'HH:mm:ss');
}

function formatJamPendek(date) {
  return Utilities.formatDate(date, ZONA_WAKTU, 'HH:mm');
}

/** Mengecek apakah suatu jam ("HH:mm" atau "HH:mm:ss") melewati JAM_MASUK_STANDAR. */
function apakahTerlambat(jamString) {
  if (!jamString) return false;
  const bagian = String(jamString).split(':');
  const jam = Number(bagian[0]);
  const menit = Number(bagian[1]);
  const batas = JAM_MASUK_STANDAR.split(':').map(Number);
  if (jam > batas[0]) return true;
  if (jam === batas[0] && menit > batas[1]) return true;
  return false;
}

// ------------------------------------------------------------
// KEAMANAN
// ------------------------------------------------------------

function hashPassword(password, salt) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(password) + String(salt));
  return bytes.map(b => ((b < 0 ? b + 256 : b).toString(16)).padStart(2, '0')).join('');
}

function generateToken() {
  return Utilities.getUuid();
}
