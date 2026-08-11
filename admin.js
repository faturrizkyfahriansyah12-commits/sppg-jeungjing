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
    rekapBulanan: []
  };

  const el = {
    loginWrap: document.getElementById('loginWrap'),
    dashboardWrap: document.getElementById('dashboardWrap'),
    loginForm: document.getElementById('loginForm'),
    inputUsername: document.getElementById('inputUsername'),
    inputPassword: document.getElementById('inputPassword'),
    loginError: document.getElementById('loginError'),
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

    filterBulan: document.getElementById('filterBulan'),
    filterDivisiBulanan: document.getElementById('filterDivisiBulanan'),
    btnMuatBulanan: document.getElementById('btnMuatBulanan'),
    btnExportBulanan: document.getElementById('btnExportBulanan'),
    tbodyBulanan: document.getElementById('tbodyBulanan'),

    formTambahRelawan: document.getElementById('formTambahRelawan'),
    inputNamaRelawanBaru: document.getElementById('inputNamaRelawanBaru'),
    selectDivisiRelawanBaru: document.getElementById('selectDivisiRelawanBaru'),
    cariRelawan: document.getElementById('cariRelawan'),
    filterDivisiRelawan: document.getElementById('filterDivisiRelawan'),
    filterStatusRelawan: document.getElementById('filterStatusRelawan'),
    tbodyRelawan: document.getElementById('tbodyRelawan'),

    formTambahDivisi: document.getElementById('formTambahDivisi'),
    inputDivisiBaru: document.getElementById('inputDivisiBaru'),
    tbodyDivisi: document.getElementById('tbodyDivisi')
  };

  // ===== LOGIN / LOGOUT =====
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

  el.btnLogout.addEventListener('click', () => {
    authToken = null;
    el.dashboardWrap.classList.add('is-hidden');
    el.loginWrap.classList.remove('is-hidden');
    el.inputPassword.value = '';
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
      const [divisiList, relawanList] = await Promise.all([
        apiGet('getDivisi'),
        apiGet('getRelawan', { semua: '1' })
      ]);
      cache.divisiList = divisiList;
      cache.relawanList = relawanList;
      fillDivisiSelects();
      renderRelawanTable();
      renderDivisiTable();

      const now = new Date();
      el.filterTanggal.value = toDateInputValue(now);
      el.filterBulan.value = toMonthInputValue(now);

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
    el.filterDivisiBulanan.innerHTML = opts;
    el.filterDivisiRelawan.innerHTML = opts;
    el.selectDivisiRelawanBaru.innerHTML = '<option value="" disabled selected>Pilih Divisi</option>' +
      cache.divisiList.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
  }

  function pad2(n) { return String(n).padStart(2, '0'); }
  function toDateInputValue(date) { return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`; }
  function toMonthInputValue(date) { return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`; }
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

  // ===== REKAP BULANAN =====
  el.btnMuatBulanan.addEventListener('click', muatRekapBulanan);

  async function muatRekapBulanan() {
    if (!el.filterBulan.value) return;
    const [tahun, bulan] = el.filterBulan.value.split('-');
    showLoading('Memuat rekap bulanan...');
    try {
      const res = await apiGet('getRekapBulanan', { bulan: Number(bulan), tahun: Number(tahun) });
      cache.rekapBulanan = res.data;
      renderRekapBulananTable();
    } catch (err) {
      showError(err.message || 'Gagal memuat rekap bulanan.');
    } finally {
      hideLoading();
    }
  }

  function renderRekapBulananTable() {
    let rows = cache.rekapBulanan;
    const divisi = el.filterDivisiBulanan.value;
    if (divisi) rows = rows.filter(r => r.divisi === divisi);
    if (!rows.length) {
      el.tbodyBulanan.innerHTML = `<tr><td colspan="7"><div class="empty-state">Belum ada data untuk bulan ini.</div></td></tr>`;
      return;
    }
    el.tbodyBulanan.innerHTML = rows.map(r => `
      <tr>
        <td>${escapeHtml(r.nama)}</td>
        <td>${escapeHtml(r.divisi)}</td>
        <td>${r.hadir}</td>
        <td>${r.terlambat}</td>
        <td>${r.izin}</td>
        <td>${r.sakit}</td>
        <td>${r.tidakHadir}</td>
      </tr>`).join('');
  }
  el.filterDivisiBulanan.addEventListener('change', () => cache.rekapBulanan.length && renderRekapBulananTable());

  el.btnExportBulanan.addEventListener('click', () => {
    if (!cache.rekapBulanan.length) { showError('Tidak ada data untuk diexport.'); return; }
    const rows = [['Nama', 'Divisi', 'Hadir', 'Terlambat', 'Izin', 'Sakit', 'Tidak Hadir']];
    cache.rekapBulanan.forEach(r => rows.push([r.nama, r.divisi, r.hadir, r.terlambat, r.izin, r.sakit, r.tidakHadir]));
    downloadCsv(rows, `rekap-bulanan-${el.filterBulan.value}.csv`);
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
})();
