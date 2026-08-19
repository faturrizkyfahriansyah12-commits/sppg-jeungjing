// SPPG JEUNGJING — LOGIC HALAMAN PENGATURAN AKUN (pengaturan.html)
// Menggunakan fungsi bersama dari common.js (apiGet, apiPost, dst.)
// dan auth-relawan.js (ambilSesiRelawan, dst.)
// Ganti Password kini halaman terpisah — lihat ganti-password.js.

function formatTanggalWaktuIndo(isoString) {
  if (!isoString) return 'Belum pernah login';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'Belum pernah login';
  const namaBulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const p2 = n => String(n).padStart(2, '0');
  return `${d.getDate()} ${namaBulan[d.getMonth()]} ${d.getFullYear()}, ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

document.addEventListener('DOMContentLoaded', async () => {
  const sesi = ambilSesiRelawan();
  if (!sesi || !sesi.token) {
    window.location.href = 'login.html';
    return;
  }

  const main = document.getElementById('pengaturanMain');

  async function muatPengaturan() {
    try {
      showLoading('Memuat pengaturan...');
      const data = await apiGet('getPengaturanAkun', { token: sesi.token });
      hideLoading();

      document.getElementById('statusAkun').textContent = data.statusAkun === 'AKTIF' ? 'Aktif' : 'Nonaktif';
      document.getElementById('loginTerakhir').textContent = formatTanggalWaktuIndo(data.loginTerakhir);

      main.style.display = 'block';
    } catch (err) {
      hideLoading();
      hapusSesiRelawan();
      simpanNotisLogin(err.message || 'Sesi telah berakhir. Silakan login kembali.');
      window.location.href = 'login.html';
    }
  }

  document.getElementById('btnKeluar').addEventListener('click', async () => {
    try {
      await apiPost('logoutRelawan', { token: sesi.token });
    } catch (err) {
      // Tetap lanjutkan keluar di sisi perangkat meski panggilan logout server gagal.
    }
    hapusSesiRelawan();
    window.location.href = 'index.html';
  });

  muatPengaturan();
});
