import mongoose from 'mongoose';
import { unitedKingBakersMenuSeed } from './united-king-bakers-menu.seed';

const MONGODB_URI =
  'mongodb+srv://sahamahmed70_db_user:vEAyG6rchaIQYKyG@cluster0.yslutaf.mongodb.net/restaurant-bot?retryWrites=true&w=majority&appName=Cluster0';

const MenuItemSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    description: String,
    category: { type: String, required: true },
    price: { type: Number, required: true },
    isAvailable: { type: Boolean, default: true },
    imageUrl: String,
    preparationTime: { type: Number, default: 0 },
    sortOrder: { type: Number, default: 0 },
    unitType: {
      type: String,
      enum: ['countable', 'weight', 'volume'],
      default: 'countable',
    },
    baseUnit: {
      type: String,
      enum: [
        'piece',
        'box',
        'loaf',
        'pack',
        'dozen',
        'combo',
        'kg',
        'pound',
        'liter',
      ],
      default: 'piece',
    },
    minOrderQty: { type: Number, default: 1 },
    orderIncrement: { type: Number, default: 1 },
    variants: [
      {
        name: String,
        price: Number,
        isAvailable: { type: Boolean, default: true },
      },
    ],
    sku: String,
  },
  { timestamps: true },
);

async function seedMenu() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const MenuItem = mongoose.model('MenuItem', MenuItemSchema);

    console.log('🗑️  Clearing existing menu items for United King Bakers...');
    await MenuItem.deleteMany({
      restaurantId: new mongoose.Types.ObjectId('694fd0fcd114999e836f8666'),
    });

    console.log('🌱 Seeding menu items...');
    const items = unitedKingBakersMenuSeed.map((item) => ({
      ...item,
      restaurantId: new mongoose.Types.ObjectId(item.restaurantId),
    }));

    await MenuItem.insertMany(items);

    console.log(`✅ Successfully seeded ${items.length} menu items!`);

    const stats = await MenuItem.aggregate([
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId('694fd0fcd114999e836f8666'),
        },
      },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    console.log('\n📊 Menu items by category:');
    stats.forEach((stat) => {
      console.log(`   ${stat._id}: ${stat.count} items`);
    });

    console.log('\n✨ Seed completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

seedMenu();
