// ============================================================
// SPPG JEUNGJING — LOGIC HALAMAN ABSENSI (index.html)
// Menggunakan fungsi bersama dari common.js (apiGet, apiPost, dst.)
// ============================================================

(function () {
  'use strict';

  const state = {
    divisiList: [],
    relawanList: [],
    selectedDivisi: '',
    selectedRelawan: null, // { id, nama, divisi }
    selectedJenis: '',
    selectedKeterangan: ''
  };

  const el = {
    selectDivisi: document.getElementById('selectDivisi'),
    cardNama: document.getElementById('cardNama'),
    selectNama: document.getElementById('selectNama'),
    cardJenis: document.getElementById('cardJenis'),
    jenisButtons: document.querySelectorAll('.jenis-btn'),
    selectKeterangan: document.getElementById('selectKeterangan'),
    textKeteranganLain: document.getElementById('textKeteranganLain'),
    form: document.getElementById('absensiForm'),
    btnSubmit: document.getElementById('btnSubmit'),
    successModal: document.getElementById('successModal'),
    successDetails: document.getElementById('successDetails'),
    successMessageName: document.querySelector('#successMessage strong'),
    btnKembali: document.getElementById('btnKembali'),
    progressSteps: document.querySelectorAll('.progress-steps .step')
  };

  function setStep(n) {
    el.progressSteps.forEach(step => {
      const val = Number(step.dataset.step);
      step.classList.toggle('active', val === n);
      step.classList.toggle('done', val < n);
    });
  }

  async function init() {
    setStep(1);
    showLoading('Memuat data divisi...');
    try {
      state.divisiList = await apiGet('getDivisi');
      if (!state.divisiList.length) {
        el.selectDivisi.innerHTML = '<option value="" disabled selected>Belum ada data divisi.</option>';
        return;
      }
      el.selectDivisi.innerHTML = '<option value="" disabled selected>Pilih Divisi</option>' +
        state.divisiList.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
    } catch (err) {
      el.selectDivisi.innerHTML = '<option value="" disabled selected>Gagal memuat divisi</option>';
      showError(err.message || 'Absensi belum dapat disimpan. Silakan periksa koneksi internet dan coba kembali.');
    } finally {
      hideLoading();
    }
  }

  el.selectDivisi.addEventListener('change', async () => {
    state.selectedDivisi = el.selectDivisi.value;
    state.selectedRelawan = null;
    resetStepsFrom(2);
    if (!state.selectedDivisi) return;

    el.cardNama.classList.remove('is-disabled');
    el.selectNama.disabled = true;
    el.selectNama.innerHTML = '<option value="" disabled selected>Memuat nama relawan...</option>';

    showLoading('Memuat nama relawan...');
    try {
      state.relawanList = await apiGet('getRelawan', { divisi: state.selectedDivisi });
      if (!state.relawanList.length) {
        el.selectNama.innerHTML = '<option value="" disabled selected>Belum ada relawan aktif pada divisi ini.</option>';
      } else {
        el.selectNama.innerHTML = '<option value="" disabled selected>Pilih Nama</option>' +
          state.relawanList.map(r => `<option value="${escapeHtml(r.id)}">${escapeHtml(r.nama)}</option>`).join('');
        el.selectNama.disabled = false;
        setStep(2);
      }
    } catch (err) {
      el.selectNama.innerHTML = '<option value="" disabled selected>Gagal memuat data</option>';
      showError(err.message || 'Absensi belum dapat disimpan. Silakan periksa koneksi internet dan coba kembali.');
    } finally {
      hideLoading();
    }
  });

  el.selectNama.addEventListener('change', () => {
    state.selectedRelawan = state.relawanList.find(r => r.id === el.selectNama.value) || null;
    resetStepsFrom(3);
    if (state.selectedRelawan) {
      el.cardJenis.classList.remove('is-disabled');
      el.jenisButtons.forEach(b => { b.disabled = false; });
      setStep(3);
    }
    updateSubmitState();
  });

  el.jenisButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      state.selectedJenis = btn.dataset.jenis;
      el.jenisButtons.forEach(b => b.classList.toggle('selected', b === btn));
      setStep(4);
      updateSubmitState();
    });
  });

  el.selectKeterangan.addEventListener('change', () => {
    state.selectedKeterangan = el.selectKeterangan.value;
    const isLainnya = state.selectedKeterangan === 'Lainnya';
    el.textKeteranganLain.classList.toggle('is-hidden', !isLainnya);
    if (!isLainnya) el.textKeteranganLain.value = '';
  });

  function resetStepsFrom(step) {
    if (step <= 2) {
      el.selectNama.innerHTML = '<option value="" disabled selected>Tentukan divisi terlebih dahulu.</option>';
      el.selectNama.disabled = true;
      el.cardNama.classList.add('is-disabled');
    }
    if (step <= 3) {
      state.selectedJenis = '';
      el.jenisButtons.forEach(b => { b.classList.remove('selected'); b.disabled = true; });
      el.cardJenis.classList.add('is-disabled');
    }
    updateSubmitState();
  }

  function updateSubmitState() {
    el.btnSubmit.disabled = !(state.selectedDivisi && state.selectedRelawan && state.selectedJenis);
  }

  el.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (el.btnSubmit.disabled) return;

    const keterangan = state.selectedKeterangan === 'Lainnya'
      ? el.textKeteranganLain.value.trim()
      : state.selectedKeterangan;

    el.btnSubmit.disabled = true;
    showLoading('Menyimpan absensi...');
    try {
      const result = await apiPost('submitAbsensi', {
        id: state.selectedRelawan.id,
        nama: state.selectedRelawan.nama,
        divisi: state.selectedDivisi,
        jenis: state.selectedJenis,
        keterangan: keterangan
      });
      showSuccess(result);
      resetForm();
    } catch (err) {
      showError(err.message || 'Absensi belum dapat disimpan. Silakan periksa koneksi internet dan coba kembali.');
      el.btnSubmit.disabled = false;
    } finally {
      hideLoading();
    }
  });

  function showSuccess(result) {
    el.successMessageName.textContent = result.nama;
    el.successDetails.innerHTML = `
      <dt>Nama</dt><dd>${escapeHtml(result.nama)}</dd>
      <dt>Divisi</dt><dd>${escapeHtml(result.divisi)}</dd>
      <dt>Jenis Absensi</dt><dd>${escapeHtml(result.jenis)}</dd>
      <dt>Tanggal</dt><dd>${escapeHtml(result.tanggal)}</dd>
      <dt>Jam</dt><dd>${escapeHtml(result.jam)}</dd>
    `;
    el.successModal.classList.remove('is-hidden');
  }

  function resetForm() {
    el.form.reset();
    state.selectedDivisi = '';
    state.selectedRelawan = null;
    state.selectedJenis = '';
    state.selectedKeterangan = '';
    el.textKeteranganLain.classList.add('is-hidden');
    resetStepsFrom(2);
    setStep(1);
  }

  el.btnKembali.addEventListener('click', () => {
    el.successModal.classList.add('is-hidden');
  });

  init();
})();
