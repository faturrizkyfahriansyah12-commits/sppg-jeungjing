/**
 * SPPG JEUNGJING — SISTEM ABSENSI RELAWAN
 * Absensi.gs — Kirim absensi, cegah duplikasi, rekap harian & bulanan
 */

const KOLOM_ABSENSI = {
  NO: 0, TIMESTAMP: 1, TANGGAL: 2, JAM: 3, ID_RELAWAN: 4,
  NAMA_RELAWAN: 5, DIVISI: 6, JENIS_ABSENSI: 7, KETERANGAN: 8
};

function submitAbsensi(body) {
  const idRelawan = sanitize(body.id);
  const namaRelawan = sanitize(body.nama);
  const divisi = sanitize(body.divisi);
  const jenis = sanitize(body.jenis).toUpperCase();
  const keterangan = sanitize(body.keterangan);

  if (!idRelawan || !namaRelawan || !divisi) throw new Error('Data relawan tidak lengkap.');
  if (jenis !== 'MASUK' && jenis !== 'PULANG') throw new Error('Jenis absensi tidak valid.');

  // Pastikan relawan masih terdaftar & aktif (mencegah pengiriman dari data lama/nonaktif).
  const relawanAktif = getRelawanList(null, false).some(r => r.id === idRelawan);
  if (!relawanAktif) throw new Error('Data relawan tidak ditemukan atau sudah nonaktif. Hubungi admin.');

  const now = new Date();
  const tanggal = formatTanggal(now); // waktu SERVER, bukan dari perangkat pengguna
  const jam = formatJam(now);

  const sheet = getSheet(NAMA_SHEET.ABSENSI);
  const data = sheet.getDataRange().getValues();

  // ----- Cegah absensi ganda pada tanggal yang sama -----
  let sudahMasuk = false;
  let sudahPulang = false;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][KOLOM_ABSENSI.TANGGAL]) === tanggal && String(data[i][KOLOM_ABSENSI.ID_RELAWAN]) === idRelawan) {
      const jenisBaris = String(data[i][KOLOM_ABSENSI.JENIS_ABSENSI]);
      if (jenisBaris === 'MASUK') sudahMasuk = true;
      if (jenisBaris === 'PULANG') sudahPulang = true;
    }
  }

  if (jenis === 'MASUK' && sudahMasuk) {
    throw new Error('Anda sudah melakukan absensi masuk hari ini.');
  }
  if (jenis === 'PULANG') {
    if (!sudahMasuk) throw new Error('Anda belum melakukan absensi masuk hari ini.');
    if (sudahPulang) throw new Error('Anda sudah melakukan absensi pulang hari ini.');
  }

  // ----- Simpan (data lama TIDAK PERNAH dihapus/ditimpa) -----
  const nomorBaru = data.length; // jumlah baris data (tanpa header) + 1
  sheet.appendRow([nomorBaru, now, tanggal, jam, idRelawan, namaRelawan, divisi, jenis, keterangan]);

  return { nama: namaRelawan, divisi: divisi, jenis: jenis, tanggal: tanggal, jam: formatJamPendek(now) };
}

function getAbsensiList(params) {
  const rows = sheetToObjects(getSheet(NAMA_SHEET.ABSENSI));
  return rows.filter(r => {
    if (params.tanggal && r.TANGGAL !== params.tanggal) return false;
    if (params.divisi && r.DIVISI !== params.divisi) return false;
    if (params.nama && r.NAMA_RELAWAN !== params.nama) return false;
    return true;
  });
}

// ------------------------------------------------------------
// REKAP HARIAN
// ------------------------------------------------------------

function getRekapHarian(tanggal) {
  if (!tanggal) tanggal = formatTanggal(new Date());

  const relawanList = getRelawanList(null, false); // hanya yang berstatus AKTIF
  const absensiHariIni = sheetToObjects(getSheet(NAMA_SHEET.ABSENSI)).filter(a => a.TANGGAL === tanggal);

  const rekap = relawanList.map(r => {
    const recMasuk = absensiHariIni.find(a => a.ID_RELAWAN === r.id && a.JENIS_ABSENSI === 'MASUK');
    const recPulang = absensiHariIni.find(a => a.ID_RELAWAN === r.id && a.JENIS_ABSENSI === 'PULANG');
    // Relawan dapat melapor Izin/Sakit melalui field Keterangan yang sama,
    // termasuk dari luar lokasi absensi (lihat README → "Asumsi & Catatan Desain").
    const recIzinSakit = absensiHariIni.find(a => a.ID_RELAWAN === r.id && (a.KETERANGAN === 'Izin' || a.KETERANGAN === 'Sakit'));

    let status = 'BELUM ABSEN';
    let keterangan = '';

    if (recIzinSakit) {
      status = String(recIzinSakit.KETERANGAN).toUpperCase();
      keterangan = recIzinSakit.KETERANGAN;
    } else if (recMasuk) {
      status = apakahTerlambat(recMasuk.JAM) ? 'TERLAMBAT' : 'HADIR';
      keterangan = recMasuk.KETERANGAN || '';
    }

    return {
      id: r.id,
      nama: r.nama,
      divisi: r.divisi,
      jamMasuk: recMasuk ? recMasuk.JAM : '',
      jamPulang: recPulang ? recPulang.JAM : '',
      status: status,
      keterangan: keterangan
    };
  });

  // Simpan salinan hasil olahan ke sheet REKAP_HARIAN agar bisa dilihat
  // langsung di Spreadsheet juga. Ini HANYA sheet hasil olahan/cache —
  // data mentah di 03_DATA_ABSENSI tidak pernah disentuh oleh fungsi ini.
  try { simpanRekapHarianKeSheet(tanggal, rekap); } catch (e) { /* jangan gagalkan permintaan utama */ }

  return { tanggal: tanggal, data: rekap };
}

function simpanRekapHarianKeSheet(tanggal, rekap) {
  const sheet = getSheet(NAMA_SHEET.REKAP_HARIAN);
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]) === tanggal) sheet.deleteRow(i + 1);
  }
  if (!rekap.length) return;
  const rows = rekap.map(r => [tanggal, r.id, r.nama, r.divisi, r.jamMasuk, r.jamPulang, r.status, r.keterangan]);
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

// ------------------------------------------------------------
// REKAP BULANAN
// ------------------------------------------------------------

function getRekapBulanan(bulan, tahun) {
  const now = new Date();
  bulan = Number(bulan) || Number(Utilities.formatDate(now, ZONA_WAKTU, 'M'));
  tahun = Number(tahun) || Number(Utilities.formatDate(now, ZONA_WAKTU, 'yyyy'));

  const relawanList = getRelawanList(null, false);
  const semuaAbsensi = sheetToObjects(getSheet(NAMA_SHEET.ABSENSI));

  const absensiBulanIni = semuaAbsensi.filter(a => {
    const bagian = String(a.TANGGAL).split('/'); // format dd/mm/yyyy
    return bagian.length === 3 && Number(bagian[1]) === bulan && Number(bagian[2]) === tahun;
  });

  // Jumlah hari unik yang tercatat ada aktivitas absensi bulan ini —
  // dipakai sebagai perkiraan jumlah "hari kerja" untuk menghitung Tidak Hadir.
  const tanggalUnik = Array.from(new Set(absensiBulanIni.map(a => a.TANGGAL)));

  const rekap = relawanList.map(r => {
    const recAbsensi = absensiBulanIni.filter(a => a.ID_RELAWAN === r.id);
    let hadir = 0, terlambat = 0, izin = 0, sakit = 0;
    const tanggalTercatat = new Set(); // satu status per hari per relawan

    recAbsensi.forEach(a => {
      if (tanggalTercatat.has(a.TANGGAL)) return;
      if (a.KETERANGAN === 'Izin') { izin++; tanggalTercatat.add(a.TANGGAL); }
      else if (a.KETERANGAN === 'Sakit') { sakit++; tanggalTercatat.add(a.TANGGAL); }
      else if (a.JENIS_ABSENSI === 'MASUK') {
        if (apakahTerlambat(a.JAM)) terlambat++; else hadir++;
        tanggalTercatat.add(a.TANGGAL);
      }
    });

    const tidakHadir = Math.max(0, tanggalUnik.length - (hadir + terlambat + izin + sakit));

    return { id: r.id, nama: r.nama, divisi: r.divisi, hadir: hadir, terlambat: terlambat, izin: izin, sakit: sakit, tidakHadir: tidakHadir };
  });

  try { simpanRekapBulananKeSheet(bulan, tahun, rekap); } catch (e) { /* jangan gagalkan permintaan utama */ }

  return { bulan: bulan, tahun: tahun, data: rekap };
}

function simpanRekapBulananKeSheet(bulan, tahun, rekap) {
  const sheet = getSheet(NAMA_SHEET.REKAP_BULANAN);
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (Number(data[i][0]) === bulan && Number(data[i][1]) === tahun) sheet.deleteRow(i + 1);
  }
  if (!rekap.length) return;
  const rows = rekap.map(r => [bulan, tahun, r.id, r.nama, r.divisi, r.hadir, r.terlambat, r.izin, r.sakit, r.tidakHadir]);
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}
