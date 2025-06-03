
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Conexión a la database
prisma.$connect()
  .then(() => {
    console.log('Database connected successfully');
  })
  .catch((error: any) => {
    console.error('Database connection error:', error);
    process.exit(1);
  });

export default prisma;