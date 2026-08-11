/**
 * SPPG JEUNGJING — SISTEM ABSENSI RELAWAN
 * Admin.gs — Login admin & manajemen sesi
 */

function adminLogin(username, password) {
  username = sanitize(username);
  if (!username || !password) throw new Error('Username dan password wajib diisi.');

  const sheet = getSheet(NAMA_SHEET.ADMIN);
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const idxUser = headers.indexOf('USERNAME');
  const idxHash = headers.indexOf('PASSWORD_HASH');
  const idxSalt = headers.indexOf('SALT');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idxUser]).toLowerCase() === username.toLowerCase()) {
      const salt = data[i][idxSalt];
      const hash = hashPassword(password, salt);
      if (hash === data[i][idxHash]) {
        const token = generateToken();
        // Sesi disimpan di CacheService (server), BUKAN di browser/localStorage.
        // Maksimal masa berlaku CacheService adalah 6 jam.
        CacheService.getScriptCache().put('sesi_' + token, username, 21600);
        return { token: token, username: username };
      }
      break;
    }
  }
  throw new Error('Username atau password salah.');
}

/** Dipanggil di awal setiap aksi admin (tulis data) untuk memastikan sesi masih berlaku. */
function requireAuth(token) {
  if (!token) throw new Error('Sesi tidak valid. Silakan login kembali.');
  const username = CacheService.getScriptCache().get('sesi_' + token);
  if (!username) throw new Error('Sesi telah berakhir. Silakan login kembali.');
  return username;
}

/**
 * JALANKAN FUNGSI INI SATU KALI SAJA dari editor Apps Script untuk membuat
 * (atau mengganti) akun admin Anda:
 *   1. Ganti nilai USERNAME_BARU dan PASSWORD_BARU di bawah ini.
 *   2. Pilih fungsi "setupAdminPassword" pada dropdown di atas editor Apps Script.
 *   3. Klik tombol "Run" (▶). Berikan izin akses saat diminta.
 *   4. Cek sheet 06_ADMIN — baris kedua akan terisi otomatis.
 *   5. Setelah berhasil, sebaiknya kosongkan kembali PASSWORD_BARU di kode ini
 *      agar password asli tidak tertinggal sebagai teks biasa di dalam skrip.
 */
function setupAdminPassword() {
  const USERNAME_BARU = 'admin';
  const PASSWORD_BARU = 'GantiPasswordIni123';

  const salt = Utilities.getUuid();
  const hash = hashPassword(PASSWORD_BARU, salt);
  const sheet = getSheet(NAMA_SHEET.ADMIN);
  sheet.getRange(2, 1, 1, 3).setValues([[USERNAME_BARU, hash, salt]]);
  Logger.log('Akun admin berhasil dibuat/diperbarui. Username: ' + USERNAME_BARU);
}
