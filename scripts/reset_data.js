const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('Mengosongkan data...');
  // Urutan penghapusan sesuai foreign key
  await prisma.userNotification.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.disasterEvent.deleteMany({});
  await prisma.disasterCategory.deleteMany({});
  // Hapus semua user kecuali admin SSO
  await prisma.user.deleteMany({ where: { email: { not: 'admin@sso.local' } } });
  console.log('Data dikosongkan (admin SSO dipertahankan).');

  // Tambahkan kategori bencana
  const categories = [
    { code: 'BANJIR', name: 'Banjir', description: 'Bencana banjir akibat luapan air' },
    { code: 'GEMPA', name: 'Gempa Bumi', description: 'Kejadian gempa bumi dengan kekuatan tertentu' },
    { code: 'PUTING_BELIUNG', name: 'Angin Puting Beliung', description: 'Angin kencang berputar yang merusak' },
    { code: 'KABUT', name: 'Kabut', description: 'Kabut tebal yang mengganggu jarak pandang' },
    { code: 'HUJAN_RINGAN', name: 'Hujan Ringan', description: 'Hujan dengan intensitas ringan' },
    { code: 'HUJAN_SEDANG', name: 'Hujan Sedang', description: 'Hujan dengan intensitas sedang' },
    { code: 'HUJAN_LEBAT', name: 'Hujan Lebat', description: 'Hujan dengan intensitas lebat' },
    { code: 'HUJAN_LEBAT_PETIR', name: 'Hujan Lebat Berpetir', description: 'Hujan lebat disertai petir' },
  ];
  for (const c of categories) {
    await prisma.disasterCategory.create({ data: { ...c, isActive: true } });
    console.log('Kategori ditambahkan:', c.name);
  }

  // Tambahkan user dummy
  const users = [
    {
      email: 'bupatimagetan@userbupati.com',
      password: 'bupatimagetan',
      fullName: 'Bupati Magetan',
      homeLat: -7.6515, homeLng: 111.3409,
      kelurahan: 'Magetan', kecamatan: 'Magetan', kota: 'Magetan', provinsi: 'Jawa Timur',
    },
    {
      email: 'kepala.dinas.pariwisata.jatim@userpariwisata.com',
      password: 'pariwisatajatim',
      fullName: 'Kepala Dinas Kebudayaan dan Pariwisata Provinsi Jawa Timur',
      homeLat: -7.2756, homeLng: 112.6426,
      kelurahan: 'Genteng', kecamatan: 'Genteng', kota: 'Surabaya', provinsi: 'Jawa Timur',
    },
    {
      email: 'kepala.dinas.pendidikan.jatim@userpendidikan.com',
      password: 'pendidikanjatim',
      fullName: 'Kepala Dinas Pendidikan Provinsi Jawa Timur',
      homeLat: -7.3197, homeLng: 112.7274,
      kelurahan: 'Gayungan', kecamatan: 'Gayungan', kota: 'Surabaya', provinsi: 'Jawa Timur',
    },
  ];
  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.create({
      data: {
        email: u.email,
        passwordHash,
        fullName: u.fullName,
        role: 'USER',
        isActive: true,
        homeLat: u.homeLat,
        homeLng: u.homeLng,
        kelurahan: u.kelurahan,
        kecamatan: u.kecamatan,
        kota: u.kota,
        provinsi: u.provinsi,
      },
    });
    console.log('User ditambahkan:', u.fullName);
  }

  console.log('Selesai!');
}

main()
  .catch((e) => { console.error('Error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
