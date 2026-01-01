const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin12345!', 10);
  
  // Check if admin exists
  let admin = await prisma.user.findFirst({
    where: { 
      email: 'admin@sso.local',
      deletedAt: null
    }
  });

  if (!admin) {
    admin = await prisma.user.create({
      data: {
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
  }
  console.log('✅ Admin created:', admin.email);

  // Create sample users
  const user1Password = await bcrypt.hash('User12345!', 10);
  let user1 = await prisma.user.findFirst({
    where: {
      email: 'user1@test.com',
      deletedAt: null
    }
  });
  
  if (!user1) {
    user1 = await prisma.user.create({
      data: {
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
  }
  console.log('✅ User1 created:', user1.email);

  const user2Password = await bcrypt.hash('User12345!', 10);
  let user2 = await prisma.user.findFirst({
    where: {
      email: 'user2@test.com',
      deletedAt: null
    }
  });
  
  if (!user2) {
    user2 = await prisma.user.create({
      data: {
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
  }
  console.log('✅ User2 created:', user2.email);

  // Create disaster categories
  let gempa = await prisma.disasterCategory.findFirst({
    where: {
      code: 'GEMPA',
      deletedAt: null
    }
  });
  
  if (!gempa) {
    gempa = await prisma.disasterCategory.create({
      data: {
        code: 'GEMPA',
        name: 'Gempa Bumi',
        description: 'Kejadian gempa bumi dengan kekuatan tertentu',
        isActive: true,
      },
    });
  }
  console.log('✅ Category created:', gempa.name);

  let banjir = await prisma.disasterCategory.findFirst({
    where: {
      code: 'BANJIR',
      deletedAt: null
    }
  });
  
  if (!banjir) {
    banjir = await prisma.disasterCategory.create({
      data: {
        code: 'BANJIR',
        name: 'Banjir',
        description: 'Bencana banjir akibat luapan air',
        isActive: true,
      },
    });
  }
  console.log('✅ Category created:', banjir.name);

  let longsor = await prisma.disasterCategory.findFirst({
    where: {
      code: 'LONGSOR',
      deletedAt: null
    }
  });
  
  if (!longsor) {
    longsor = await prisma.disasterCategory.create({
      data: {
        code: 'LONGSOR',
        name: 'Tanah Longsor',
        description: 'Bencana tanah longsor',
        isActive: true,
      },
    });
  }
  console.log('✅ Category created:', longsor.name);

  let tsunami = await prisma.disasterCategory.findFirst({
    where: {
      code: 'TSUNAMI',
      deletedAt: null
    }
  });
  
  if (!tsunami) {
    tsunami = await prisma.disasterCategory.create({
      data: {
        code: 'TSUNAMI',
        name: 'Tsunami',
        description: 'Gelombang tsunami yang mengancam',
        isActive: true,
      },
    });
  }
  console.log('✅ Category created:', tsunami.name);

  // Create sample disaster event
  const existingEvent = await prisma.disasterEvent.findFirst({
    where: {
      title: 'Gempa Bumi 5.2 SR di Jakarta Pusat',
      deletedAt: null
    }
  });
  
  if (!existingEvent) {
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
  }

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
