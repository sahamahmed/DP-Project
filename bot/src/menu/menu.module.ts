import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenuController } from './menu.controller';
import { MenuRepository } from '../repositories/menu.repository';
import { MenuItem, MenuItemSchema } from '../database/schemas/menu-item.schema';
import { Category, CategorySchema } from '../database/schemas/category.schema';
import { AuthModule } from '../auth/auth.module';
import { SessionStoreModule } from '../session-store/session-store.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MenuItem.name, schema: MenuItemSchema },
      { name: Category.name, schema: CategorySchema },
    ]),
    AuthModule,
    SessionStoreModule,
    DatabaseModule,
  ],
  controllers: [MenuController],
  providers: [MenuRepository],
  exports: [MenuRepository],
})
export class MenuModule {}
