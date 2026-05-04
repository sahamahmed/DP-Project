import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Restaurant } from '../src/database/schemas/restaurant.schema';
import { Category } from '../src/database/schemas/category.schema';
import { MenuItem } from '../src/database/schemas/menu-item.schema';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const restaurantModel = app.get<Model<Restaurant>>(
    getModelToken(Restaurant.name),
  );
  const categoryModel = app.get<Model<Category>>(getModelToken(Category.name));
  const menuItemModel = app.get<Model<MenuItem>>(
    getModelToken(MenuItem.name),
  );

  console.log('🌱 Starting database seed...\n');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await menuItemModel.deleteMany({});
  await categoryModel.deleteMany({});
  await restaurantModel.deleteMany({});
  console.log('✅ Database cleared\n');

  // Create Restaurant
  console.log('📍 Creating restaurant...');
  const restaurant = await restaurantModel.create({
    whatsappNumber: '15550819382',
    name: 'United King Bakers',
    phoneNumberId: 'your_phone_number_id',
    accessToken: 'your_access_token',
    isActive: true,
    deliveryFee: 30,
    minOrderAmount: 200,
    address: 'Main Market, Karachi',
    city: 'Karachi',
  });
  console.log(`✅ Restaurant created: ${restaurant.name}\n`);

  // Create Categories
  console.log('📂 Creating categories...');
  const categoriesData = [
    {
      restaurantId: restaurant._id,
      name: 'Savories',
      description: 'Crispy patties, puffs and savory snacks',
      isActive: true,
      sortOrder: 1,
    },
    {
      restaurantId: restaurant._id,
      name: 'Sweets',
      description: 'Traditional Pakistani sweets',
      isActive: true,
      sortOrder: 2,
    },
    {
      restaurantId: restaurant._id,
      name: 'Breads & Rusks',
      description: 'Fresh breads and crispy rusks',
      isActive: true,
      sortOrder: 3,
    },
    {
      restaurantId: restaurant._id,
      name: 'Cake',
      description: 'Delicious cakes in various flavors',
      isActive: true,
      sortOrder: 4,
    },
    {
      restaurantId: restaurant._id,
      name: 'Nimco',
      description: 'Savory snack mixes',
      isActive: true,
      sortOrder: 5,
    },
    {
      restaurantId: restaurant._id,
      name: 'Deals',
      description: 'Special combo deals',
      isActive: true,
      sortOrder: 6,
    },
  ];

  const categories = await categoryModel.insertMany(categoriesData);
  console.log(`✅ ${categories.length} categories created\n`);

  // Create category map for easy reference
  const categoryMap = new Map();
  categories.forEach((cat) => {
    categoryMap.set(cat.name, cat._id);
  });

  // Create Menu Items
  console.log('🍰 Creating menu items...');

  const menuItems = [
    // ==================== SAVORIES ====================
    {
      restaurantId: restaurant._id,
      categoryId: categoryMap.get('Savories'),
      name: 'Chicken Patty',
      description: 'Crispy flaky pastry filled with spiced chicken',
      price: 45,
      unitType: 'countable',
      baseUnit: 'piece',
      minOrderQty: 1,
      orderIncrement: 1,
      isAvailable: true,
      isFeatured: true,
      sortOrder: 1,
      sku: 'UKB-SAV-001',
    },
    {
      restaurantId: restaurant._id,
      categoryId: categoryMap.get('Savories'),
      name: 'Vegetable Puff',
      description: 'Golden puff pastry with mixed vegetables',
      price: 35,
      unitType: 'countable',
      baseUnit: 'piece',
      minOrderQty: 1,
      orderIncrement: 1,
      isAvailable: true,
      isFeatured: false,
      sortOrder: 2,
      sku: 'UKB-SAV-002',
    },
    {
      restaurantId: restaurant._id,
      categoryId: categoryMap.get('Savories'),
      name: 'Chicken Roll',
      description: 'Soft roll with seasoned chicken filling',
      price: 50,
      unitType: 'countable',
      baseUnit: 'piece',
      minOrderQty: 1,
      orderIncrement: 1,
      isAvailable: true,
      isFeatured: false,
      sortOrder: 3,
      sku: 'UKB-SAV-003',
    },
    {
      restaurantId: restaurant._id,
      categoryId: categoryMap.get('Savories'),
      name: 'Pizza Puff',
      description: 'Puff pastry with pizza toppings and cheese',
      price: 55,
      unitType: 'countable',
      baseUnit: 'piece',
      minOrderQty: 1,
      orderIncrement: 1,
      isAvailable: true,
      isFeatured: false,
      sortOrder: 4,
      sku: 'UKB-SAV-004',
    },
    {
      restaurantId: restaurant._id,
      categoryId: categoryMap.get('Savories'),
      name: 'Sausage Roll',
      description: 'Flaky pastry wrapped around savory sausage',
      price: 60,
      unitType: 'countable',
      baseUnit: 'piece',
      minOrderQty: 1,
      orderIncrement: 1,
      isAvailable: true,
      isFeatured: false,
      sortOrder: 5,
      sku: 'UKB-SAV-005',
    },

    // ==================== SWEETS ====================
    {
      restaurantId: restaurant._id,
      categoryId: categoryMap.get('Sweets'),
      name: 'Gulab Jamun',
      description: 'Traditional milk-solid sweet in sugar syrup',
      price: 1000,
      unitType: 'weight',
      baseUnit: 'kg',
      minOrderQty: 0.25,
      orderIncrement: 0.25,
      isAvailable: true,
      isFeatured: true,
      sortOrder: 1,
      sku: 'UKB-SWT-001',
    },
    {
      restaurantId: restaurant._id,
      categoryId: categoryMap.get('Sweets'),
      name: 'Rasgulla',
      description: 'Soft cottage cheese balls in light syrup',
      price: 45,
      unitType: 'countable',
      baseUnit: 'piece',
      minOrderQty: 1,
      orderIncrement: 1,
      isAvailable: true,
      isFeatured: false,
      sortOrder: 2,
      sku: 'UKB-SWT-002',
    },
    {
      restaurantId: restaurant._id,
      categoryId: categoryMap.get('Sweets'),
      name: 'Kheer',
      description: 'Creamy rice pudding with cardamom and nuts',
      price: 320,
      unitType: 'volume',
      baseUnit: 'liter',
      minOrderQty: 0.25,
      orderIncrement: 0.25,
      isAvailable: true,
      isFeatured: false,
      sortOrder: 3,
      sku: 'UKB-SWT-003',
    },
    {
      restaurantId: restaurant._id,
      categoryId: categoryMap.get('Sweets'),
      name: 'Barfi',
      description: 'Sweet milk fudge with pistachios',
      price: 1200,
      unitType: 'weight',
      baseUnit: 'kg',
      minOrderQty: 0.25,
      orderIncrement: 0.25,
      isAvailable: true,
      isFeatured: false,
      sortOrder: 4,
      sku: 'UKB-SWT-004',
    },

    // ==================== BREADS & RUSKS ====================
    {
      restaurantId: restaurant._id,
      categoryId: categoryMap.get('Breads & Rusks'),
      name: 'White Bread',
      description: 'Fresh soft white bread loaf',
      price: 120,
      unitType: 'countable',
      baseUnit: 'loaf',
      minOrderQty: 1,
      orderIncrement: 1,
      isAvailable: true,
      isFeatured: false,
      sortOrder: 1,
      sku: 'UKB-BRD-001',
    },
    {
      restaurantId: restaurant._id,
      categoryId: categoryMap.get('Breads & Rusks'),
      name: 'Brown Bread',
      description: 'Whole wheat brown bread loaf',
      price: 140,
      unitType: 'countable',
      baseUnit: 'loaf',
      minOrderQty: 1,
      orderIncrement: 1,
      isAvailable: true,
      isFeatured: false,
      sortOrder: 2,
      sku: 'UKB-BRD-002',
    },
    {
      restaurantId: restaurant._id,
      categoryId: categoryMap.get('Breads & Rusks'),
      name: 'Regular Rusk',
      description: 'Crispy twice-baked bread slices',
      price: 180,
      unitType: 'countable',
      baseUnit: 'pack',
      minOrderQty: 1,
      orderIncrement: 1,
      isAvailable: true,
      isFeatured: true,
      sortOrder: 3,
      sku: 'UKB-RSK-001',
    },
    {
      restaurantId: restaurant._id,
      categoryId: categoryMap.get('Breads & Rusks'),
      name: 'Milk Rusk',
      description: 'Sweet milk-flavored rusks',
      price: 200,
      unitType: 'countable',
      baseUnit: 'pack',
      minOrderQty: 1,
      orderIncrement: 1,
      isAvailable: true,
      isFeatured: false,
      sortOrder: 4,
      sku: 'UKB-RSK-002',
    },
    {
      restaurantId: restaurant._id,
      categoryId: categoryMap.get('Breads & Rusks'),
      name: 'Elaichi Rusk',
      description: 'Cardamom-flavored premium rusks',
      price: 220,
      unitType: 'countable',
      baseUnit: 'pack',
      minOrderQty: 1,
      orderIncrement: 1,
      isAvailable: true,
      isFeatured: false,
      sortOrder: 5,
      sku: 'UKB-RSK-003',
    },

    // ==================== CAKE ====================
    {
      restaurantId: restaurant._id,
      categoryId: categoryMap.get('Cake'),
      name: 'Chocolate Cake',
      description: 'Rich chocolate sponge with chocolate frosting',
      price: 225,
      unitType: 'countable',
      baseUnit: 'piece',
      minOrderQty: 1,
      orderIncrement: 1,
      isAvailable: true,
      isFeatured: true,
      sortOrder: 1,
      sku: 'UKB-CKE-001',
      variants: [
        { name: 'Half Pound', price: 225, isAvailable: true },
        { name: '1 Pound', price: 450, isAvailable: true },
        { name: '2 Pounds', price: 900, isAvailable: true },
        { name: '3 Pounds', price: 1350, isAvailable: true },
      ],
    },
    {
      restaurantId: restaurant._id,
      categoryId: categoryMap.get('Cake'),
      name: 'Vanilla Cake',
      description: 'Classic vanilla sponge with buttercream',
      price: 200,
      unitType: 'countable',
      baseUnit: 'piece',
      minOrderQty: 1,
      orderIncrement: 1,
      isAvailable: true,
      isFeatured: false,
      sortOrder: 2,
      sku: 'UKB-CKE-002',
      variants: [
        { name: 'Half Pound', price: 200, isAvailable: true },
        { name: '1 Pound', price: 400, isAvailable: true },
        { name: '2 Pounds', price: 800, isAvailable: true },
        { name: '3 Pounds', price: 1200, isAvailable: true },
      ],
    },
    {
      restaurantId: restaurant._id,
      categoryId: categoryMap.get('Cake'),
      name: 'Black Forest Cake',
      description: 'Chocolate cake with cherries and whipped cream',
      price: 275,
      unitType: 'countable',
      baseUnit: 'piece',
      minOrderQty: 1,
      orderIncrement: 1,
      isAvailable: true,
      isFeatured: false,
      sortOrder: 3,
      sku: 'UKB-CKE-003',
      variants: [
        { name: 'Half Pound', price: 275, isAvailable: true },
        { name: '1 Pound', price: 550, isAvailable: true },
        { name: '2 Pounds', price: 1100, isAvailable: true },
        { name: '3 Pounds', price: 1650, isAvailable: true },
      ],
    },
    {
      restaurantId: restaurant._id,
      categoryId: categoryMap.get('Cake'),
      name: 'Red Velvet Cake',
      description: 'Velvety red cake with cream cheese frosting',
      price: 300,
      unitType: 'countable',
      baseUnit: 'piece',
      minOrderQty: 1,
      orderIncrement: 1,
      isAvailable: true,
      isFeatured: false,
      sortOrder: 4,
      sku: 'UKB-CKE-004',
      variants: [
        { name: 'Half Pound', price: 300, isAvailable: true },
        { name: '1 Pound', price: 600, isAvailable: true },
        { name: '2 Pounds', price: 1200, isAvailable: true },
        { name: '3 Pounds', price: 1800, isAvailable: true },
      ],
    },

    // ==================== NIMCO ====================
    {
      restaurantId: restaurant._id,
      categoryId: categoryMap.get('Nimco'),
      name: 'Masala Peanuts',
      description: 'Crunchy roasted peanuts with spices',
      price: 600,
      unitType: 'weight',
      baseUnit: 'kg',
      minOrderQty: 0.25,
      orderIncrement: 0.25,
      isAvailable: true,
      isFeatured: false,
      sortOrder: 1,
      sku: 'UKB-NMC-001',
    },
    {
      restaurantId: restaurant._id,
      categoryId: categoryMap.get('Nimco'),
      name: 'Mix Nimco',
      description: 'Assorted savory snacks mix',
      price: 720,
      unitType: 'weight',
      baseUnit: 'kg',
      minOrderQty: 0.25,
      orderIncrement: 0.25,
      isAvailable: true,
      isFeatured: true,
      sortOrder: 2,
      sku: 'UKB-NMC-002',
    },
    {
      restaurantId: restaurant._id,
      categoryId: categoryMap.get('Nimco'),
      name: 'Daal Moth',
      description: 'Spicy fried lentil mix',
      price: 640,
      unitType: 'weight',
      baseUnit: 'kg',
      minOrderQty: 0.25,
      orderIncrement: 0.25,
      isAvailable: true,
      isFeatured: false,
      sortOrder: 3,
      sku: 'UKB-NMC-003',
    },
    {
      restaurantId: restaurant._id,
      categoryId: categoryMap.get('Nimco'),
      name: 'Chatpata Mix',
      description: 'Tangy and spicy snack mix',
      price: 680,
      unitType: 'weight',
      baseUnit: 'kg',
      minOrderQty: 0.25,
      orderIncrement: 0.25,
      isAvailable: true,
      isFeatured: false,
      sortOrder: 4,
      sku: 'UKB-NMC-004',
    },

    // ==================== DEALS ====================
    {
      restaurantId: restaurant._id,
      categoryId: categoryMap.get('Deals'),
      name: 'Breakfast Deal',
      description: '1 White Bread + 1 Regular Rusk + 6 Chicken Patties',
      price: 450,
      unitType: 'countable',
      baseUnit: 'combo',
      minOrderQty: 1,
      orderIncrement: 1,
      isAvailable: true,
      isFeatured: false,
      sortOrder: 1,
      sku: 'UKB-DEAL-001',
    },
    {
      restaurantId: restaurant._id,
      categoryId: categoryMap.get('Deals'),
      name: 'Tea Time Deal',
      description: '1 Milk Rusk + 6 Vegetable Puffs + 250g Mix Nimco',
      price: 500,
      unitType: 'countable',
      baseUnit: 'combo',
      minOrderQty: 1,
      orderIncrement: 1,
      isAvailable: true,
      isFeatured: true,
      sortOrder: 2,
      sku: 'UKB-DEAL-002',
    },
    {
      restaurantId: restaurant._id,
      categoryId: categoryMap.get('Deals'),
      name: 'Party Pack',
      description: '12 Chicken Patties + 12 Veg Puffs + 1kg Nimco + 2 Rusks',
      price: 1200,
      unitType: 'countable',
      baseUnit: 'combo',
      minOrderQty: 1,
      orderIncrement: 1,
      isAvailable: true,
      isFeatured: false,
      sortOrder: 3,
      sku: 'UKB-DEAL-003',
    },
    {
      restaurantId: restaurant._id,
      categoryId: categoryMap.get('Deals'),
      name: 'Sweet Tooth Deal',
      description: '12 Gulab Jamun + 250g Barfi + 250ml Kheer',
      price: 650,
      unitType: 'countable',
      baseUnit: 'combo',
      minOrderQty: 1,
      orderIncrement: 1,
      isAvailable: true,
      isFeatured: false,
      sortOrder: 4,
      sku: 'UKB-DEAL-004',
    },
  ];

  const insertedItems = await menuItemModel.insertMany(menuItems);
  console.log(`✅ ${insertedItems.length} menu items created\n`);

  // Summary
  console.log('📊 Seed Summary:');
  console.log('─────────────────────────────────────');
  console.log(`✅ Restaurant: ${restaurant.name}`);
  console.log(`✅ Categories: ${categories.length}`);
  console.log(`✅ Menu Items: ${insertedItems.length}`);
  console.log(`   - Featured Items: ${insertedItems.filter((i: any) => i.isFeatured).length}`);
  console.log('\n📂 Categories Created:');
  categories.forEach((cat) => {
    const itemCount = insertedItems.filter(
      (item) => item.categoryId.toString() === cat._id.toString(),
    ).length;
    console.log(`   • ${cat.name}: ${itemCount} items`);
  });
  console.log('\n✨ Database seeded successfully!\n');

  await app.close();
  process.exit(0);
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
