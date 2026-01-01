const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin12345!', 10);
  const admin = await prisma.user.upsert({
    where: { email_deletedAt: { email: 'admin@sso.local', deletedAt: null } },
    update: {},
    create: {
      email: 'admin@sso.local',
      passwordHash: adminPassword,
      fullName: 'Administrator SSO',
      role: 'SSO',
      isActive: true,
      homeLat: -6.2088,
      homeLng: 106.8456,
      kelurahan: 'Menteng',
      kecamatan: 'Menteng',
      kota: 'Jakarta Pusat',
      provinsi: 'DKI Jakarta',
    },
  });
  console.log('✅ Admin created:', admin.email);

  // Create sample users
  const user1Password = await bcrypt.hash('User12345!', 10);
  const user1 = await prisma.user.upsert({
    where: { email_deletedAt: { email: 'user1@test.com', deletedAt: null } },
    update: {},
    create: {
      email: 'user1@test.com',
      passwordHash: user1Password,
      fullName: 'Budi Santoso',
      role: 'USER',
      isActive: true,
      homeLat: -6.2150,
      homeLng: 106.8450,
      kelurahan: 'Gondangdia',
      kecamatan: 'Menteng',
      kota: 'Jakarta Pusat',
      provinsi: 'DKI Jakarta',
    },
  });
  console.log('✅ User1 created:', user1.email);

  const user2Password = await bcrypt.hash('User12345!', 10);
  const user2 = await prisma.user.upsert({
    where: { email_deletedAt: { email: 'user2@test.com', deletedAt: null } },
    update: {},
    create: {
      email: 'user2@test.com',
      passwordHash: user2Password,
      fullName: 'Siti Rahayu',
      role: 'USER',
      isActive: true,
      homeLat: -6.3000,
      homeLng: 106.8000,
      kelurahan: 'Kebayoran Baru',
      kecamatan: 'Kebayoran Baru',
      kota: 'Jakarta Selatan',
      provinsi: 'DKI Jakarta',
    },
  });
  console.log('✅ User2 created:', user2.email);

  // Create disaster categories
  const gempa = await prisma.disasterCategory.upsert({
    where: { code_deletedAt: { code: 'GEMPA', deletedAt: null } },
    update: {},
    create: {
      code: 'GEMPA',
      name: 'Gempa Bumi',
      description: 'Kejadian gempa bumi dengan kekuatan tertentu',
      isActive: true,
    },
  });
  console.log('✅ Category created:', gempa.name);

  const banjir = await prisma.disasterCategory.upsert({
    where: { code_deletedAt: { code: 'BANJIR', deletedAt: null } },
    update: {},
    create: {
      code: 'BANJIR',
      name: 'Banjir',
      description: 'Bencana banjir akibat luapan air',
      isActive: true,
    },
  });
  console.log('✅ Category created:', banjir.name);

  const longsor = await prisma.disasterCategory.upsert({
    where: { code_deletedAt: { code: 'LONGSOR', deletedAt: null } },
    update: {},
    create: {
      code: 'LONGSOR',
      name: 'Tanah Longsor',
      description: 'Bencana tanah longsor',
      isActive: true,
    },
  });
  console.log('✅ Category created:', longsor.name);

  const tsunami = await prisma.disasterCategory.upsert({
    where: { code_deletedAt: { code: 'TSUNAMI', deletedAt: null } },
    update: {},
    create: {
      code: 'TSUNAMI',
      name: 'Tsunami',
      description: 'Gelombang tsunami yang mengancam',
      isActive: true,
    },
  });
  console.log('✅ Category created:', tsunami.name);

  // Create sample disaster event
  const event1 = await prisma.disasterEvent.create({
    data: {
      categoryId: gempa.id,
      title: 'Gempa Bumi 5.2 SR di Jakarta Pusat',
      description: 'Terjadi gempa bumi dengan kekuatan 5.2 SR di wilayah Jakarta Pusat. Masyarakat diimbau untuk tetap waspada.',
      eventTime: new Date(),
      status: 'PUBLISHED',
      publishedAt: new Date(),
      locationLat: -6.2088,
      locationLng: 106.8456,
      kelurahan: 'Menteng',
      kecamatan: 'Menteng',
      kota: 'Jakarta Pusat',
      dangerRadiusM: 3000,
      warningRadiusM: 15000,
      createdBy: admin.id,
    },
  });
  console.log('✅ Event created:', event1.title);

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
