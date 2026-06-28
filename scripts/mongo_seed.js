// MongoDB seed / reset script for SiagaSekitar
// - Empties all data EXCEPT the admin SSO account
// - Adds disaster categories and dummy users
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Minimal .env loader (no dotenv dependency)
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const txt = fs.readFileSync(envPath, 'utf8');
  for (const line of txt.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) {
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}
loadEnv();

const uri = process.env.MONGO_URL;
const dbName = process.env.DB_NAME || 'siagasekitar';

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const now = new Date();

  console.log('Mengosongkan data (kecuali admin SSO)...');
  await db.collection('user_notifications').deleteMany({});
  await db.collection('audit_logs').deleteMany({});
  await db.collection('disaster_events').deleteMany({});
  await db.collection('disaster_categories').deleteMany({});
  await db.collection('users').deleteMany({ email: { $ne: 'admin@sso.local' } });

  // Ensure admin SSO exists
  const admin = await db.collection('users').findOne({ email: 'admin@sso.local' });
  if (!admin) {
    await db.collection('users').insertOne({
      id: uuidv4(),
      email: 'admin@sso.local',
      passwordHash: await bcrypt.hash('Admin12345!', 10),
      fullName: 'Administrator SSO',
      role: 'SSO',
      isActive: true,
      homeLat: -6.2088,
      homeLng: 106.8456,
      kelurahan: 'Menteng',
      kecamatan: 'Menteng',
      kota: 'Jakarta Pusat',
      provinsi: 'DKI Jakarta',
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    console.log('Admin SSO dibuat: admin@sso.local');
  } else {
    console.log('Admin SSO dipertahankan: admin@sso.local');
  }

  // Categories
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
    await db.collection('disaster_categories').insertOne({
      id: uuidv4(),
      code: c.code,
      name: c.name,
      description: c.description,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    console.log('Kategori ditambahkan:', c.name);
  }

  // Dummy users
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
    await db.collection('users').insertOne({
      id: uuidv4(),
      email: u.email,
      passwordHash: await bcrypt.hash(u.password, 10),
      fullName: u.fullName,
      role: 'USER',
      isActive: true,
      homeLat: u.homeLat,
      homeLng: u.homeLng,
      kelurahan: u.kelurahan,
      kecamatan: u.kecamatan,
      kota: u.kota,
      provinsi: u.provinsi,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    console.log('User ditambahkan:', u.fullName);
  }

  // Helpful indexes
  await db.collection('users').createIndex({ id: 1 });
  await db.collection('disaster_categories').createIndex({ id: 1 });
  await db.collection('disaster_events').createIndex({ id: 1 });
  await db.collection('user_notifications').createIndex({ id: 1 });

  console.log('Selesai!');
  await client.close();
}

main().catch((e) => { console.error('Error:', e); process.exit(1); });
