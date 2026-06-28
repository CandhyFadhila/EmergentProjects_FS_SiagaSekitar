const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const updates = [
    { email: 'admin@sso.local', pw: 'Admin12345!' },
    { email: 'user1@test.com', pw: 'User12345!' },
    { email: 'user2@test.com', pw: 'User12345!' },
  ];
  for (const u of updates) {
    const hash = await bcrypt.hash(u.pw, 10);
    await prisma.user.updateMany({ where: { email: u.email }, data: { passwordHash: hash } });
    console.log('Reset password for', u.email);
  }
}
main().finally(() => prisma.$disconnect());
