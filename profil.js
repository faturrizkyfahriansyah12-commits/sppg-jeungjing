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

  document.getElementById('togglePwLama').addEventListener('click', function () {
    togglePasswordVisibility('inputPasswordLama', this);
  });
  document.getElementById('togglePwBaru').addEventListener('click', function () {
    togglePasswordVisibility('inputPasswordBaru2', this);
  });

  function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    const tampil = input.type === 'password';
    input.type = tampil ? 'text' : 'password';
    btn.textContent = tampil ? 'SEMBUNYIKAN' : 'TAMPILKAN';
  }

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
      // Sesi kedaluwarsa / tidak valid → kembali ke login, bukan tampil error kosong.
      hapusSesiRelawan();
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

  document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const passwordLama = document.getElementById('inputPasswordLama').value;
    const passwordBaru = document.getElementById('inputPasswordBaru2').value;

    if (passwordBaru.length < 6) {
      showError('Password baru minimal 6 karakter.');
      return;
    }

    try {
      showLoading('Mengganti password...');
      await apiPost('gantiPasswordRelawan', { token: sesi.token, passwordLama, passwordBaru });
      hideLoading();
      showSuccess('Password berhasil diganti.');
      document.getElementById('passwordForm').reset();
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
