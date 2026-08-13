// ============================================================
// SPPG JEUNGJING — FUNGSI BERSAMA
// Dipakai oleh absensi.html (script.js) dan admin.html (admin.js)
// agar logic pemanggilan API tidak ditulis dua kali (modular).
// ============================================================

/**
 * Menampilkan overlay loading di atas halaman.
 * @param {string} [text] Teks yang ditampilkan, mis. "Menyimpan absensi..."
 */
function showLoading(text) {
  const overlay = document.getElementById('loadingOverlay');
  const label = document.getElementById('loadingText');
  if (label) label.textContent = text || 'Memuat data...';
  if (overlay) overlay.classList.remove('is-hidden');
}

/** Menyembunyikan overlay loading. */
function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.classList.add('is-hidden');
}

/**
 * Menampilkan pesan error singkat (toast) selama beberapa detik.
 * Pesan teknis TIDAK ditampilkan ke pengguna — hanya pesan yang
 * sudah ramah pengguna (lihat error handling di Code.gs & script.js).
 * @param {string} message
 */
function showError(message) {
  const toast = document.getElementById('errorToast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove('is-hidden');
  clearTimeout(showError._timer);
  showError._timer = setTimeout(() => toast.classList.add('is-hidden'), 5000);
}

/** Escape teks agar aman disisipkan sebagai innerHTML (mencegah XSS sederhana). */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str === undefined || str === null ? '' : String(str);
  return div.innerHTML;
}

/**
 * Memanggil aksi GET pada Google Apps Script Web App.
 * @param {string} action nama aksi, mis. "getDivisi"
 * @param {object} [params] parameter tambahan (query string)
 */
async function apiGet(action, params) {
  if (!GOOGLE_APPS_SCRIPT_WEB_APP_URL || GOOGLE_APPS_SCRIPT_WEB_APP_URL === 'GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
    throw new Error('Website belum terhubung ke server. Admin perlu mengisi config.js terlebih dahulu.');
  }
  const url = new URL(GOOGLE_APPS_SCRIPT_WEB_APP_URL);
  url.searchParams.set('action', action);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });

  let res;
  try {
    res = await fetch(url.toString(), { method: 'GET' });
  } catch (err) {
    throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet dan coba kembali.');
  }
  let json;
  try {
    json = await res.json();
  } catch (err) {
    throw new Error('Server memberikan respons yang tidak terduga. Coba beberapa saat lagi.');
  }
  if (!json.success) throw new Error(json.message || 'Terjadi kesalahan pada server.');
  return json.data;
}

/**
 * Memanggil aksi POST (menulis data) pada Google Apps Script Web App.
 * @param {string} action nama aksi, mis. "submitAbsensi"
 * @param {object} [payload] data yang dikirim
 */
async function apiPost(action, payload) {
  if (!GOOGLE_APPS_SCRIPT_WEB_APP_URL || GOOGLE_APPS_SCRIPT_WEB_APP_URL === 'GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
    throw new Error('Website belum terhubung ke server. Admin perlu mengisi config.js terlebih dahulu.');
  }
  let res;
  try {
    res = await fetch(GOOGLE_APPS_SCRIPT_WEB_APP_URL, {
      method: 'POST',
      // CATATAN PENTING: sengaja TIDAK diberi header 'Content-Type: application/json'.
      // Jika diberikan, browser akan mengirim permintaan "preflight" (OPTIONS)
      // terlebih dahulu, yang TIDAK didukung oleh Google Apps Script sehingga
      // permintaan akan gagal karena CORS. Tanpa header ini, browser mengirim
      // sebagai "simple request" (text/plain) yang lolos tanpa preflight.
      // Di sisi server (Code.gs), body ini tetap di-parse sebagai JSON biasa.
      body: JSON.stringify(Object.assign({ action }, payload))
    });
  } catch (err) {
    throw new Error('Absensi belum dapat disimpan. Silakan periksa koneksi internet dan coba kembali.');
  }
  let json;
  try {
    json = await res.json();
  } catch (err) {
    throw new Error('Server memberikan respons yang tidak terduga. Coba beberapa saat lagi.');
  }
  if (!json.success) throw new Error(json.message || 'Terjadi kesalahan pada server.');
  return json.data;
}
