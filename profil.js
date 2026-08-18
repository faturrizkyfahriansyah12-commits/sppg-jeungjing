// SPPG JEUNGJING — LOGIC HALAMAN PROFIL RELAWAN (profil.html)
// Menggunakan fungsi bersama dari common.js (apiGet, apiPost, dst.)
// dan auth-relawan.js (ambilSesiRelawan, dst.)

document.addEventListener('DOMContentLoaded', async () => {
  const sesi = ambilSesiRelawan();
  if (!sesi || !sesi.token) {
    window.location.href = 'login.html';
    return;
  }

  const main = document.getElementById('profilMain');

  async function muatProfil() {
    try {
      showLoading('Memuat profil...');
      const profil = await apiGet('getProfilRelawan', { token: sesi.token });
      hideLoading();

      document.getElementById('namaRelawan').textContent = profil.nama;
      document.getElementById('divisiRelawan').textContent = 'Relawan ' + profil.divisi;
      document.getElementById('idRelawan').textContent = profil.id;
      document.getElementById('statusRelawan').textContent = profil.status;
      document.getElementById('usernameRelawan').textContent = profil.username;
      document.getElementById('inputNoHp').value = profil.noHp || '';
      document.getElementById('inputEmail').value = profil.email || '';

      main.style.display = 'block';
    } catch (err) {
      hideLoading();
      // Sesi kedaluwarsa ATAU akun baru saja dinonaktifkan Admin → kembali ke
      // login, tapi bawa pesannya supaya relawan tahu alasannya, bukan
      // tampilan form kosong yang membingungkan.
      hapusSesiRelawan();
      simpanNotisLogin(err.message || 'Sesi telah berakhir. Silakan login kembali.');
      window.location.href = 'login.html';
    }
  }

  document.getElementById('profilForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      showLoading('Menyimpan profil...');
      await apiPost('updateProfilRelawan', {
        token: sesi.token,
        noHp: document.getElementById('inputNoHp').value.trim(),
        email: document.getElementById('inputEmail').value.trim()
      });
      hideLoading();
      showSuccess('Profil berhasil disimpan.');
    } catch (err) {
      hideLoading();
      showError(err.message);
    }
  });

  document.getElementById('btnKeluar').addEventListener('click', async () => {
    try {
      await apiPost('logoutRelawan', { token: sesi.token });
    } catch (err) {
      // Tetap lanjutkan keluar di sisi perangkat meski panggilan logout server gagal
      // (mis. sedang offline) — sesi di server akan kedaluwarsa otomatis maksimal 6 jam.
    }
    hapusSesiRelawan();
    window.location.href = 'index.html';
  });

  muatProfil();
});
