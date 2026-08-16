// ============================================================
// SPPG JEUNGJING — LOGIC DASHBOARD ADMIN (admin.html)
// Menggunakan fungsi bersama dari common.js (apiGet, apiPost, dst.)
// ============================================================

(function () {
  'use strict';

  let authToken = null;

  const cache = {
    divisiList: [],
    relawanList: [],   // semua relawan (aktif + nonaktif), untuk tab "Kelola Relawan"
    rekapHarian: [],
    rekapDuaMinggu: [],
    akunList: []        // status akun relawan, untuk tab "Akun Relawan"
  };

  const el = {
    loginWrap: document.getElementById('loginWrap'),
    dashboardWrap: document.getElementById('dashboardWrap'),
    loginForm: document.getElementById('loginForm'),
    inputUsername: document.getElementById('inputUsername'),
    inputPassword: document.getElementById('inputPassword'),
    toggleAdminPw: document.getElementById('toggleAdminPw'),
    loginError: document.getElementById('loginError'),
    btnLupaPassword: document.getElementById('btnLupaPassword'),
    btnBatalReset: document.getElementById('btnBatalReset'),
    cardLogin: document.getElementById('cardLogin'),
    cardResetPassword: document.getElementById('cardResetPassword'),
    resetPasswordForm: document.getElementById('resetPasswordForm'),
    resetUsername: document.getElementById('resetUsername'),
    resetKode: document.getElementById('resetKode'),
    resetPasswordBaru: document.getElementById('resetPasswordBaru'),
    toggleResetPw: document.getElementById('toggleResetPw'),
    resetError: document.getElementById('resetError'),
    btnLogout: document.getElementById('btnLogout'),

    statTotal: document.getElementById('statTotal'),
    statHadir: document.getElementById('statHadir'),
    statBelum: document.getElementById('statBelum'),
    statIzin: document.getElementById('statIzin'),
    statSakit: document.getElementById('statSakit'),
    statTerlambat: document.getElementById('statTerlambat'),

    tabs: document.querySelectorAll('.admin-tab-btn'),
    panels: document.querySelectorAll('.admin-panel'),

    filterTanggal: document.getElementById('filterTanggal'),
    filterDivisiHarian: document.getElementById('filterDivisiHarian'),
    filterStatusHarian: document.getElementById('filterStatusHarian'),
    btnMuatHarian: document.getElementById('btnMuatHarian'),
    btnExportHarian: document.getElementById('btnExportHarian'),
    divisiGrid: document.getElementById('divisiGrid'),
    tbodyHarian: document.getElementById('tbodyHarian'),

    filterPeriodeAwal: document.getElementById('filterPeriodeAwal'),
    filterPeriodeAkhir: document.getElementById('filterPeriodeAkhir'),
    filterDivisiDuaMinggu: document.getElementById('filterDivisiDuaMinggu'),
    btnMuatDuaMinggu: document.getElementById('btnMuatDuaMinggu'),
    btnExportDuaMinggu: document.getElementById('btnExportDuaMinggu'),
    tbodyDuaMinggu: document.getElementById('tbodyDuaMinggu'),

    formTambahRelawan: document.getElementById('formTambahRelawan'),
    inputNamaRelawanBaru: document.getElementById('inputNamaRelawanBaru'),
    selectDivisiRelawanBaru: document.getElementById('selectDivisiRelawanBaru'),
    cariRelawan: document.getElementById('cariRelawan'),
    filterDivisiRelawan: document.getElementById('filterDivisiRelawan'),
    filterStatusRelawan: document.getElementById('filterStatusRelawan'),
    tbodyRelawan: document.getElementById('tbodyRelawan'),

    formTambahDivisi: document.getElementById('formTambahDivisi'),
    inputDivisiBaru: document.getElementById('inputDivisiBaru'),
    tbodyDivisi: document.getElementById('tbodyDivisi'),

    cariAkun: document.getElementById('cariAkun'),
    filterStatusAkun: document.getElementById('filterStatusAkun'),
    tbodyAkun: document.getElementById('tbodyAkun'),
    akunPasswordAlert: document.getElementById('akunPasswordAlert'),
    akunPasswordAlertText: document.getElementById('akunPasswordAlertText'),
    btnSalinPassword: document.getElementById('btnSalinPassword'),
    btnTutupPasswordAlert: document.getElementById('btnTutupPasswordAlert')
  };

  // ===== LOGIN / LOGOUT =====
  el.toggleAdminPw.addEventListener('click', () => {
    const tampil = el.inputPassword.type === 'password';
    el.inputPassword.type = tampil ? 'text' : 'password';
    el.toggleAdminPw.textContent = tampil ? 'SEMBUNYIKAN' : 'TAMPILKAN';
  });

  // ===== LUPA PASSWORD (Tahap 5) =====
  el.toggleResetPw.addEventListener('click', () => {
    const tampil = el.resetPasswordBaru.type === 'password';
    el.resetPasswordBaru.type = tampil ? 'text' : 'password';
    el.toggleResetPw.textContent = tampil ? 'SEMBUNYIKAN' : 'TAMPILKAN';
  });

  el.btnLupaPassword.addEventListener('click', () => {
    el.cardLogin.classList.add('is-hidden');
    el.cardResetPassword.classList.remove('is-hidden');
    el.resetError.textContent = '';
  });

  el.btnBatalReset.addEventListener('click', () => {
    el.cardResetPassword.classList.add('is-hidden');
    el.cardLogin.classList.remove('is-hidden');
    el.resetPasswordForm.reset();
  });

  el.resetPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    el.resetError.textContent = '';
    showLoading('Menyimpan password baru...');
    try {
      await apiPost('resetAdminPasswordWithCode', {
        username: el.resetUsername.value.trim(),
        kode: el.resetKode.value.trim(),
        passwordBaru: el.resetPasswordBaru.value
      });
      hideLoading();
      el.resetPasswordForm.reset();
      el.cardResetPassword.classList.add('is-hidden');
      el.cardLogin.classList.remove('is-hidden');
      el.loginError.textContent = '';
      showSuccess('Password berhasil diganti. Silakan login dengan password baru.');
    } catch (err) {
      hideLoading();
      el.resetError.textContent = err.message || 'Gagal mereset password.';
    }
  });

  el.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    el.loginError.textContent = '';
    showLoading('Memeriksa akun...');
    try {
      const data = await apiPost('login', {
        username: el.inputUsername.value.trim(),
        password: el.inputPassword.value
      });
      authToken = data.token;
      el.loginWrap.classList.add('is-hidden');
      el.dashboardWrap.classList.remove('is-hidden');
      await initDashboard();
    } catch (err) {
      el.loginError.textContent = err.message || 'Username atau password salah.';
    } finally {
      hideLoading();
    }
  });

  el.btnLogout.addEventListener('click', async () => {
    const tokenLama = authToken;
    authToken = null;
    el.dashboardWrap.classList.add('is-hidden');
    el.loginWrap.classList.remove('is-hidden');
    el.inputPassword.value = '';
    try {
      await apiPost('logout', { token: tokenLama });
    } catch (err) {
      // Tampilan tetap keluar di sisi perangkat meski panggilan ke server gagal
      // (mis. sedang offline) — sesi di server akan kedaluwarsa otomatis maksimal 6 jam.
    }
  });

  // ===== TABS =====
  el.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      el.tabs.forEach(t => t.classList.remove('active'));
      el.panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.panel).classList.add('active');
    });
  });

  // ===== INIT DASHBOARD =====
  async function initDashboard() {
    showLoading('Memuat data dashboard...');
    try {
      const [divisiList, relawanList, akunList] = await Promise.all([
        apiGet('getDivisi'),
        apiGet('getRelawan', { semua: '1' }),
        apiGet('getAkunRelawanList', { token: authToken })
      ]);
      cache.divisiList = divisiList;
      cache.relawanList = relawanList;
      cache.akunList = akunList;
      fillDivisiSelects();
      renderRelawanTable();
      renderDivisiTable();
      renderAkunTable();

      const now = new Date();
      el.filterTanggal.value = toDateInputValue(now);
      const periodeDefault = defaultPeriodeDuaMinggu(now);
      el.filterPeriodeAwal.value = toDateInputValue(periodeDefault.awal);
      el.filterPeriodeAkhir.value = toDateInputValue(periodeDefault.akhir);

      await muatRekapHarian();
    } catch (err) {
      showError(err.message || 'Gagal memuat data dashboard.');
    } finally {
      hideLoading();
    }
  }

  function fillDivisiSelects() {
    const opts = '<option value="">Semua Divisi</option>' +
      cache.divisiList.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
    el.filterDivisiHarian.innerHTML = opts;
    el.filterDivisiDuaMinggu.innerHTML = opts;
    el.filterDivisiRelawan.innerHTML = opts;
    el.selectDivisiRelawanBaru.innerHTML = '<option value="" disabled selected>Pilih Divisi</option>' +
      cache.divisiList.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
  }

  function pad2(n) { return String(n).padStart(2, '0'); }
  function toDateInputValue(date) { return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`; }
  function toMonthInputValue(date) { return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`; }
  /** Periode gajian: tanggal 1-14 atau 15-akhir bulan, tergantung tanggal hari ini. */
  function defaultPeriodeDuaMinggu(date) {
    const y = date.getFullYear(), m = date.getMonth();
    if (date.getDate() <= 14) return { awal: new Date(y, m, 1), akhir: new Date(y, m, 14) };
    return { awal: new Date(y, m, 15), akhir: new Date(y, m + 1, 0) };
  }
  function toTanggalIndo(dateInputValue) {
    const [y, m, d] = dateInputValue.split('-');
    return `${d}/${m}/${y}`;
  }

  // ===== REKAP HARIAN =====
  el.btnMuatHarian.addEventListener('click', muatRekapHarian);

  async function muatRekapHarian() {
    if (!el.filterTanggal.value) return;
    const tanggal = toTanggalIndo(el.filterTanggal.value);
    showLoading('Memuat rekap harian...');
    try {
      const res = await apiGet('getRekapHarian', { tanggal });
      cache.rekapHarian = res.data;
      renderStatCards(cache.rekapHarian);
      renderDivisiGrid(cache.rekapHarian);
      renderRekapHarianTable();
    } catch (err) {
      showError(err.message || 'Gagal memuat rekap harian.');
    } finally {
      hideLoading();
    }
  }

  function renderStatCards(data) {
    el.statTotal.textContent = data.length;
    el.statHadir.textContent = data.filter(r => r.status === 'HADIR' || r.status === 'TERLAMBAT').length;
    el.statBelum.textContent = data.filter(r => r.status === 'BELUM ABSEN').length;
    el.statIzin.textContent = data.filter(r => r.status === 'IZIN').length;
    el.statSakit.textContent = data.filter(r => r.status === 'SAKIT').length;
    el.statTerlambat.textContent = data.filter(r => r.status === 'TERLAMBAT').length;
  }

  function renderDivisiGrid(data) {
    const byDivisi = {};
    data.forEach(r => {
      if (!byDivisi[r.divisi]) byDivisi[r.divisi] = { total: 0, hadir: 0 };
      byDivisi[r.divisi].total++;
      if (r.status === 'HADIR' || r.status === 'TERLAMBAT') byDivisi[r.divisi].hadir++;
    });
    const names = Object.keys(byDivisi);
    if (!names.length) {
      el.divisiGrid.innerHTML = '<p class="empty-state">Belum ada data kehadiran.</p>';
      return;
    }
    el.divisiGrid.innerHTML = names.map(nama => `
      <div class="divisi-card">
        <div class="divisi-name">${escapeHtml(nama)}</div>
        <div class="divisi-stats"><span>Total: ${byDivisi[nama].total}</span><span>Hadir: ${byDivisi[nama].hadir}</span></div>
      </div>`).join('');
  }

  function renderRekapHarianTable() {
    let rows = cache.rekapHarian;
    const divisi = el.filterDivisiHarian.value;
    const status = el.filterStatusHarian.value;
    if (divisi) rows = rows.filter(r => r.divisi === divisi);
    if (status) rows = rows.filter(r => r.status === status);

    if (!rows.length) {
      el.tbodyHarian.innerHTML = `<tr><td colspan="7"><div class="empty-state">Belum ada data kehadiran.</div></td></tr>`;
      return;
    }
    el.tbodyHarian.innerHTML = rows.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(r.nama)}</td>
        <td>${escapeHtml(r.divisi)}</td>
        <td>${escapeHtml(r.jamMasuk || '–')}</td>
        <td>${escapeHtml(r.jamPulang || '–')}</td>
        <td>${statusBadge(r.status)}</td>
        <td>${escapeHtml(r.keterangan || '–')}</td>
      </tr>`).join('');
  }

  el.filterDivisiHarian.addEventListener('change', () => cache.rekapHarian.length && renderRekapHarianTable());
  el.filterStatusHarian.addEventListener('change', () => cache.rekapHarian.length && renderRekapHarianTable());

  function statusBadge(status) {
    const map = { HADIR: 'hadir', TERLAMBAT: 'terlambat', IZIN: 'izin', SAKIT: 'sakit', 'BELUM ABSEN': 'belum-absen' };
    return `<span class="badge ${map[status] || 'belum-absen'}">${escapeHtml(status)}</span>`;
  }

  el.btnExportHarian.addEventListener('click', () => {
    if (!cache.rekapHarian.length) { showError('Tidak ada data untuk diexport.'); return; }
    const rows = [['No', 'Nama', 'Divisi', 'Jam Masuk', 'Jam Pulang', 'Status', 'Keterangan']];
    cache.rekapHarian.forEach((r, i) => rows.push([i + 1, r.nama, r.divisi, r.jamMasuk, r.jamPulang, r.status, r.keterangan]));
    downloadCsv(rows, `rekap-harian-${el.filterTanggal.value}.csv`);
  });

  // ===== REKAP 2 MINGGU =====
  el.btnMuatDuaMinggu.addEventListener('click', muatRekapDuaMinggu);

  async function muatRekapDuaMinggu() {
    if (!el.filterPeriodeAwal.value || !el.filterPeriodeAkhir.value) return;
    if (el.filterPeriodeAwal.value > el.filterPeriodeAkhir.value) {
      showError('Periode awal tidak boleh setelah periode akhir.');
      return;
    }
    showLoading('Memuat rekap 2 minggu...');
    try {
      const res = await apiGet('getRekapDuaMinggu', {
        periodeAwal: el.filterPeriodeAwal.value,
        periodeAkhir: el.filterPeriodeAkhir.value
      });
      cache.rekapDuaMinggu = res.data;
      renderRekapDuaMingguTable();
    } catch (err) {
      showError(err.message || 'Gagal memuat rekap 2 minggu.');
    } finally {
      hideLoading();
    }
  }

  function renderRekapDuaMingguTable() {
    let rows = cache.rekapDuaMinggu;
    const divisi = el.filterDivisiDuaMinggu.value;
    if (divisi) rows = rows.filter(r => r.divisi === divisi);
    if (!rows.length) {
      el.tbodyDuaMinggu.innerHTML = `<tr><td colspan="8"><div class="empty-state">Belum ada data untuk periode ini.</div></td></tr>`;
      return;
    }
    el.tbodyDuaMinggu.innerHTML = rows.map(r => `
      <tr>
        <td>${escapeHtml(r.nama)}</td>
        <td>${escapeHtml(r.divisi)}</td>
        <td>${r.hadir}</td>
        <td>${r.terlambat}</td>
        <td>${r.izin}</td>
        <td>${r.sakit}</td>
        <td>${r.tidakHadir}</td>
        <td>${r.totalHariKerja}</td>
      </tr>`).join('');
  }
  el.filterDivisiDuaMinggu.addEventListener('change', () => cache.rekapDuaMinggu.length && renderRekapDuaMingguTable());

  el.btnExportDuaMinggu.addEventListener('click', () => {
    if (!cache.rekapDuaMinggu.length) { showError('Tidak ada data untuk diexport.'); return; }
    const rows = [['Nama', 'Divisi', 'Hadir', 'Terlambat', 'Izin', 'Sakit', 'Tidak Hadir', 'Total Hari Kerja']];
    cache.rekapDuaMinggu.forEach(r => rows.push([r.nama, r.divisi, r.hadir, r.terlambat, r.izin, r.sakit, r.tidakHadir, r.totalHariKerja]));
    downloadCsv(rows, `rekap-2minggu-${el.filterPeriodeAwal.value}_${el.filterPeriodeAkhir.value}.csv`);
  });

  // ===== KELOLA RELAWAN =====
  el.formTambahRelawan.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading('Menyimpan relawan...');
    try {
      await apiPost('addRelawan', {
        token: authToken,
        nama: el.inputNamaRelawanBaru.value.trim(),
        divisi: el.selectDivisiRelawanBaru.value
      });
      el.formTambahRelawan.reset();
      await muatUlangRelawan();
    } catch (err) {
      showError(err.message || 'Gagal menambah relawan.');
    } finally {
      hideLoading();
    }
  });

  async function muatUlangRelawan() {
    cache.relawanList = await apiGet('getRelawan', { semua: '1' });
    renderRelawanTable();
    renderDivisiTable();
  }

  function renderRelawanTable() {
    let rows = cache.relawanList;
    const cari = el.cariRelawan.value.trim().toLowerCase();
    const divisi = el.filterDivisiRelawan.value;
    const status = el.filterStatusRelawan.value;
    if (cari) rows = rows.filter(r => r.nama.toLowerCase().includes(cari));
    if (divisi) rows = rows.filter(r => r.divisi === divisi);
    if (status) rows = rows.filter(r => (r.status || 'AKTIF') === status);

    if (!rows.length) {
      el.tbodyRelawan.innerHTML = `<tr><td colspan="5"><div class="empty-state">Tidak ada relawan yang cocok.</div></td></tr>`;
      return;
    }

    el.tbodyRelawan.innerHTML = rows.map(r => {
      const status = r.status || 'AKTIF';
      const divisiOptions = cache.divisiList.map(d =>
        `<option value="${escapeHtml(d)}" ${d === r.divisi ? 'selected' : ''}>${escapeHtml(d)}</option>`).join('');
      return `
      <tr data-id="${escapeHtml(r.id)}">
        <td>${escapeHtml(r.id)}</td>
        <td>
          <div class="editable-name">
            <span class="cell-nama">${escapeHtml(r.nama)}</span>
            <button type="button" class="btn-mini btn-edit-nama" title="Ubah nama">✎</button>
          </div>
        </td>
        <td><select class="mini-select select-divisi-relawan">${divisiOptions}</select></td>
        <td><span class="badge ${status === 'AKTIF' ? 'aktif' : 'nonaktif'}">${status}</span></td>
        <td><button type="button" class="btn-mini toggle-status" data-status="${status}">${status === 'AKTIF' ? 'Nonaktifkan' : 'Aktifkan'}</button></td>
      </tr>`;
    }).join('');

    el.tbodyRelawan.querySelectorAll('.toggle-status').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.closest('tr').dataset.id;
        const newStatus = btn.dataset.status === 'AKTIF' ? 'NONAKTIF' : 'AKTIF';
        showLoading('Memperbarui status...');
        try {
          await apiPost('updateRelawan', { token: authToken, id, status: newStatus });
          await muatUlangRelawan();
        } catch (err) {
          showError(err.message || 'Gagal memperbarui status.');
        } finally {
          hideLoading();
        }
      });
    });

    el.tbodyRelawan.querySelectorAll('.select-divisi-relawan').forEach(sel => {
      sel.addEventListener('change', async () => {
        const id = sel.closest('tr').dataset.id;
        showLoading('Memindahkan divisi...');
        try {
          await apiPost('updateRelawan', { token: authToken, id, divisi: sel.value });
          await muatUlangRelawan();
        } catch (err) {
          showError(err.message || 'Gagal memindahkan divisi.');
        } finally {
          hideLoading();
        }
      });
    });

    el.tbodyRelawan.querySelectorAll('.btn-edit-nama').forEach(btn => {
      btn.addEventListener('click', () => {
        const wrap = btn.closest('.editable-name');
        const namaLama = wrap.querySelector('.cell-nama').textContent;
        wrap.innerHTML = `
          <input type="text" class="mini-input input-edit-nama" value="${escapeHtml(namaLama)}" style="width:140px;">
          <button type="button" class="btn-mini save-nama">✓</button>`;
        const input = wrap.querySelector('.input-edit-nama');
        input.focus();
        input.select();
        wrap.querySelector('.save-nama').addEventListener('click', () => simpanNamaBaru(wrap, input.value.trim()));
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') simpanNamaBaru(wrap, input.value.trim()); });
      });
    });
  }

  async function simpanNamaBaru(wrap, namaBaru) {
    const id = wrap.closest('tr').dataset.id;
    if (!namaBaru) return;
    showLoading('Menyimpan nama...');
    try {
      await apiPost('updateRelawan', { token: authToken, id, nama: namaBaru });
      await muatUlangRelawan();
    } catch (err) {
      showError(err.message || 'Gagal menyimpan nama.');
    } finally {
      hideLoading();
    }
  }

  [el.cariRelawan, el.filterDivisiRelawan, el.filterStatusRelawan].forEach(elm => {
    elm.addEventListener('input', renderRelawanTable);
    elm.addEventListener('change', renderRelawanTable);
  });

  // ===== KELOLA DIVISI =====
  el.formTambahDivisi.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading('Menambah divisi...');
    try {
      await apiPost('addDivisi', { token: authToken, nama: el.inputDivisiBaru.value.trim() });
      el.inputDivisiBaru.value = '';
      cache.divisiList = await apiGet('getDivisi');
      fillDivisiSelects();
      renderDivisiTable();
    } catch (err) {
      showError(err.message || 'Gagal menambah divisi.');
    } finally {
      hideLoading();
    }
  });

  function renderDivisiTable() {
    if (!cache.divisiList.length) {
      el.tbodyDivisi.innerHTML = `<tr><td colspan="2"><div class="empty-state">Belum ada data divisi.</div></td></tr>`;
      return;
    }
    el.tbodyDivisi.innerHTML = cache.divisiList.map(d => {
      const jumlah = cache.relawanList.filter(r => r.divisi === d && (r.status || 'AKTIF') === 'AKTIF').length;
      return `<tr><td>${escapeHtml(d)}</td><td>${jumlah}</td></tr>`;
    }).join('');
  }

  // ===== EXPORT CSV =====
  function downloadCsv(rows, filename) {
    const csv = rows.map(row => row.map(csvEscape).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  function csvEscape(value) {
    const str = String(value === undefined || value === null ? '' : value);
    return /[",\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
  }

  // ===== AKUN RELAWAN (Tahap 2) =====
  function saranUsername(nama, id) {
    const depan = (nama || '').trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, '');
    const angka = (id || '').replace(/[^0-9]/g, '').slice(-3).padStart(3, '0');
    return depan + angka;
  }

  function tampilkanPasswordAlert(nama, username, password) {
    el.akunPasswordAlertText.innerHTML =
      `Password sementara untuk <strong>${escapeHtml(nama)}</strong> (username: <strong>${escapeHtml(username)}</strong>):<br>` +
      `<strong style="font-size:16px;letter-spacing:1px;">${escapeHtml(password)}</strong><br>` +
      `Catat &amp; sampaikan sekarang ke relawan — password ini tidak akan ditampilkan lagi.`;
    el.akunPasswordAlert.dataset.password = password;
    el.akunPasswordAlert.classList.remove('is-hidden');
    el.akunPasswordAlert.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  el.btnTutupPasswordAlert.addEventListener('click', () => {
    el.akunPasswordAlert.classList.add('is-hidden');
  });
  el.btnSalinPassword.addEventListener('click', async () => {
    const pw = el.akunPasswordAlert.dataset.password || '';
    try {
      await navigator.clipboard.writeText(pw);
      el.btnSalinPassword.textContent = 'Tersalin ✓';
      setTimeout(() => { el.btnSalinPassword.textContent = 'Salin'; }, 1500);
    } catch (err) {
      showError('Tidak dapat menyalin otomatis. Salin manual dari layar.');
    }
  });

  async function muatUlangAkun() {
    cache.akunList = await apiGet('getAkunRelawanList', { token: authToken });
    renderAkunTable();
  }

  function renderAkunTable() {
    const akunById = {};
    cache.akunList.forEach(a => { akunById[a.idRelawan] = a; });

    let rows = cache.relawanList.filter(r => (r.status || 'AKTIF') === 'AKTIF');
    const cari = (el.cariAkun.value || '').trim().toLowerCase();
    const filterStatus = el.filterStatusAkun.value;
    if (cari) rows = rows.filter(r => r.nama.toLowerCase().includes(cari));
    if (filterStatus === 'BELUM') rows = rows.filter(r => !akunById[r.id]);
    if (filterStatus === 'AKTIF') rows = rows.filter(r => akunById[r.id] && akunById[r.id].statusAkun === 'AKTIF');
    if (filterStatus === 'NONAKTIF') rows = rows.filter(r => akunById[r.id] && akunById[r.id].statusAkun === 'NONAKTIF');

    if (!rows.length) {
      el.tbodyAkun.innerHTML = `<tr><td colspan="5"><div class="empty-state">Tidak ada relawan yang cocok.</div></td></tr>`;
      return;
    }

    el.tbodyAkun.innerHTML = rows.map(r => {
      const akun = akunById[r.id];
      let akunCell;
      let aksiCell;

      if (!akun) {
        akunCell = `<span class="badge nonaktif">Belum Ada Akun</span>`;
        aksiCell = `<button type="button" class="btn-mini primary btn-buat-akun">+ Buat Akun</button>`;
      } else if (akun.statusAkun === 'NONAKTIF') {
        akunCell = `${escapeHtml(akun.username)} <span class="badge akun-nonaktif">Nonaktif</span>`;
        aksiCell = `<button type="button" class="btn-mini btn-toggle-status" data-status-baru="AKTIF">Aktifkan</button>`;
      } else {
        akunCell = `${escapeHtml(akun.username)} <span class="badge ${akun.wajibGantiPassword ? 'terlambat' : 'aktif'}">${akun.wajibGantiPassword ? 'Wajib Ganti Password' : 'Aktif'}</span>`;
        aksiCell = `<button type="button" class="btn-mini btn-reset-password">Reset Password</button>
          <button type="button" class="btn-mini btn-toggle-status" data-status-baru="NONAKTIF">Nonaktifkan</button>`;
      }

      return `
      <tr data-id="${escapeHtml(r.id)}" data-nama="${escapeHtml(r.nama)}">
        <td>${escapeHtml(r.id)}</td>
        <td>${escapeHtml(r.nama)}</td>
        <td>${escapeHtml(r.divisi)}</td>
        <td class="cell-akun">${akunCell}</td>
        <td class="cell-aksi-akun">${aksiCell}</td>
      </tr>`;
    }).join('');

    el.tbodyAkun.querySelectorAll('.btn-buat-akun').forEach(btn => {
      btn.addEventListener('click', () => {
        const tr = btn.closest('tr');
        const id = tr.dataset.id;
        const nama = tr.dataset.nama;
        tr.querySelector('.cell-aksi-akun').innerHTML = `
          <form class="akun-inline-form">
            <input type="text" class="input-username-baru" placeholder="username" value="${escapeHtml(saranUsername(nama, id))}" required>
            <input type="tel" class="input-nohp-baru" placeholder="No HP (opsional)">
            <button type="submit" class="btn-mini primary">Buat</button>
            <button type="button" class="btn-mini btn-batal-akun">Batal</button>
          </form>`;
        const form = tr.querySelector('.akun-inline-form');
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const username = form.querySelector('.input-username-baru').value.trim();
          const noHp = form.querySelector('.input-nohp-baru').value.trim();
          showLoading('Membuat akun...');
          try {
            const hasil = await apiPost('addAkunRelawan', { token: authToken, idRelawan: id, username, noHp });
            await muatUlangAkun();
            tampilkanPasswordAlert(hasil.nama, hasil.username, hasil.passwordSementara);
          } catch (err) {
            showError(err.message || 'Gagal membuat akun.');
          } finally {
            hideLoading();
          }
        });
        tr.querySelector('.btn-batal-akun').addEventListener('click', renderAkunTable);
      });
    });

    el.tbodyAkun.querySelectorAll('.btn-reset-password').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tr = btn.closest('tr');
        const id = tr.dataset.id;
        const nama = tr.dataset.nama;
        if (!confirm(`Reset password untuk ${nama}? Password lama langsung tidak berlaku.`)) return;
        showLoading('Mereset password...');
        try {
          const hasil = await apiPost('resetPasswordRelawan', { token: authToken, idRelawan: id });
          await muatUlangAkun();
          tampilkanPasswordAlert(nama, akunById[id] ? akunById[id].username : '-', hasil.passwordSementara);
        } catch (err) {
          showError(err.message || 'Gagal mereset password.');
        } finally {
          hideLoading();
        }
      });
    });

    el.tbodyAkun.querySelectorAll('.btn-toggle-status').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tr = btn.closest('tr');
        const id = tr.dataset.id;
        const nama = tr.dataset.nama;
        const statusBaru = btn.dataset.statusBaru;
        const pesanKonfirmasi = statusBaru === 'NONAKTIF'
          ? `Nonaktifkan akun ${nama}? Relawan ini tidak akan bisa login lagi, dan akan otomatis keluar pada aktivitas berikutnya jika sedang login.`
          : `Aktifkan kembali akun ${nama}?`;
        if (!confirm(pesanKonfirmasi)) return;
        showLoading(statusBaru === 'NONAKTIF' ? 'Menonaktifkan akun...' : 'Mengaktifkan akun...');
        try {
          await apiPost('updateStatusAkunRelawan', { token: authToken, idRelawan: id, statusBaru });
          await muatUlangAkun();
          showSuccess(`Akun ${nama} berhasil ${statusBaru === 'NONAKTIF' ? 'dinonaktifkan' : 'diaktifkan'}.`);
        } catch (err) {
          showError(err.message || 'Gagal mengubah status akun.');
        } finally {
          hideLoading();
        }
      });
    });
  }

  [el.cariAkun, el.filterStatusAkun].forEach(elm => {
    elm.addEventListener('input', renderAkunTable);
    elm.addEventListener('change', renderAkunTable);
  });
})();
