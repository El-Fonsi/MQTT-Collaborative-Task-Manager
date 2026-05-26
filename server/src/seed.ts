import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'Jake@email.com';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists, skipping.`);
    return;
  }

  const hashed = await bcrypt.hash('password123', 12);
  const user = await prisma.user.create({
    data: {
      email,
      name: 'Jake',
      password: hashed,
    },
  });
  console.log(`Created user: ${user.name} (${user.email})`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
