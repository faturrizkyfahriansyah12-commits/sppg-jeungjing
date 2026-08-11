/**
 * SPPG JEUNGJING — SISTEM ABSENSI RELAWAN
 * Code.gs — Routing utama (doGet & doPost)
 *
 * PENTING: setelah menyalin semua file .gs ke proyek Apps Script Anda,
 * deploy sebagai Web App:
 *   Deploy → New deployment → Web app
 *     - Execute as: Me
 *     - Who has access: Anyone
 * Salin URL yang diberikan ke dalam config.js pada website (folder utama).
 *
 * Permintaan GET dipakai untuk MEMBACA data (getDivisi, getRelawan, dst.)
 * Permintaan POST dipakai untuk MENULIS data (submitAbsensi, login, dst.)
 * POST dikirim tanpa header Content-Type khusus agar tidak memicu CORS
 * preflight yang tidak didukung Apps Script — lihat komentar di common.js.
 */

function doGet(e) {
  try {
    const action = e.parameter.action;
    let data;
    switch (action) {
      case 'getDivisi':
        data = getDivisiList();
        break;
      case 'getRelawan':
        data = getRelawanList(e.parameter.divisi, e.parameter.semua === '1');
        break;
      case 'getAbsensi':
        data = getAbsensiList(e.parameter);
        break;
      case 'getRekapHarian':
        data = getRekapHarian(e.parameter.tanggal);
        break;
      case 'getRekapBulanan':
        data = getRekapBulanan(e.parameter.bulan, e.parameter.tahun);
        break;
      default:
        return gagal('Aksi tidak dikenali: ' + action);
    }
    return sukses(data);
  } catch (err) {
    return gagal(err.message || 'Terjadi kesalahan pada server.');
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    let data;
    switch (action) {
      case 'submitAbsensi':
        data = submitAbsensi(body);
        break;
      case 'login':
        data = adminLogin(body.username, body.password);
        break;
      case 'addRelawan':
        requireAuth(body.token);
        data = addRelawan(body);
        break;
      case 'updateRelawan':
        requireAuth(body.token);
        data = updateRelawan(body);
        break;
      case 'addDivisi':
        requireAuth(body.token);
        data = addDivisi(body);
        break;
      default:
        return gagal('Aksi tidak dikenali: ' + action);
    }
    return sukses(data);
  } catch (err) {
    return gagal(err.message || 'Terjadi kesalahan pada server.');
  }
}
