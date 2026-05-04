import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AdminRepository } from '../repositories/admin.repository';
import { AdminRole } from '../database/schemas/admin.schema';
import * as bcrypt from 'bcryptjs';

async function seedAdmins() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const adminRepository = app.get(AdminRepository);

  const admins = [
    {
      name: 'United King Admin',
      email: 'admin@unitedking.com',
      password: 'admin123',
      restaurantId: '69564742976fac96f24e6b22',
      role: AdminRole.ADMIN,
    },
  ];

  console.log('🌱 Seeding admins...\n');

  for (const adminData of admins) {
    try {
      // Check if admin already exists
      const existing = await adminRepository.findByEmail(adminData.email);
      if (existing) {
        console.log(
          `⏭️  Admin "${adminData.email}" already exists, skipping...`,
        );
        continue;
      }

      // Hash password
      const hashedPassword = bcrypt.hashSync(adminData.password, 10);

      // Create admin
      const admin = await adminRepository.create({
        ...adminData,
        password: hashedPassword,
      });

      console.log(`✅ Created admin: ${admin.name} (${admin.email})`);
      console.log(`   Restaurant ID: ${admin.restaurantId}`);
      console.log(`   Password: ${adminData.password}`);
      console.log('');
    } catch (error) {
      console.error(`❌ Failed to create admin "${adminData.email}":`, error);
    }
  }

  console.log('🎉 Admin seeding complete!\n');
  console.log('You can now login with:');
  console.log('  Email: admin@unitedking.com');
  console.log('  Password: admin123');

  await app.close();
}

seedAdmins()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
