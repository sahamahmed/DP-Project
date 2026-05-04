import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminRepository } from '../repositories/admin.repository';
import { Admin, AdminSchema } from '../database/schemas/admin.schema';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { MediaManagerModule } from '../media-manager/media-manager.module';
import { SessionStoreModule } from '../session-store/session-store.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Admin.name, schema: AdminSchema }]),
    AuthModule,
    DatabaseModule,
    MediaManagerModule,
    SessionStoreModule,
  ],
  controllers: [AdminController],
  providers: [AdminRepository],
  exports: [AdminRepository],
})
export class AdminModule {}
