# Database Seed Instructions

## Prerequisites

1. Make sure MongoDB is running
2. Make sure your `.env` file has the correct `MONGODB_URI`
3. Database should be empty (or drop existing collections)

## How to Run the Seed Script

### Step 1: Clear Database (Optional)
If you have existing data, drop the database first:

```bash
# Using MongoDB shell
mongosh

use restaurant_bot  # or your database name
db.dropDatabase()
exit
```

### Step 2: Run Seed Script

```bash
cd bot
npm run seed
```

### Expected Output

```
🌱 Starting database seed...

🗑️  Clearing existing data...
✅ Database cleared

📍 Creating restaurant...
✅ Restaurant created: United King Bakers

📂 Creating categories...
✅ 6 categories created

🍰 Creating menu items...
✅ 26 menu items created

📊 Seed Summary:
─────────────────────────────────────
✅ Restaurant: United King Bakers
✅ Categories: 6
✅ Menu Items: 26
   - Featured Items: 6

📂 Categories Created:
   • Savories: 5 items
   • Sweets: 4 items
   • Breads & Rusks: 5 items
   • Cake: 4 items
   • Nimco: 4 items
   • Deals: 4 items

✨ Database seeded successfully!
```

## What Gets Created

### 1. Restaurant
- **Name:** United King Bakers
- **WhatsApp Number:** 15550819382
- **Delivery Fee:** Rs. 30
- **Min Order:** Rs. 200

### 2. Categories (6)
1. **Savories** - Crispy patties, puffs and savory snacks
2. **Sweets** - Traditional Pakistani sweets
3. **Breads & Rusks** - Fresh breads and crispy rusks
4. **Cake** - Delicious cakes in various flavors
5. **Nimco** - Savory snack mixes
6. **Deals** - Special combo deals

### 3. Menu Items (26 total, 6 featured)

#### Savories (5 items, 1 featured ⭐)
- ⭐ **Chicken Patty** - Rs. 45/piece - Crispy flaky pastry filled with spiced chicken
- **Vegetable Puff** - Rs. 35/piece - Golden puff pastry with mixed vegetables
- **Chicken Roll** - Rs. 50/piece - Soft roll with seasoned chicken filling
- **Pizza Puff** - Rs. 55/piece - Puff pastry with pizza toppings and cheese
- **Sausage Roll** - Rs. 60/piece - Flaky pastry wrapped around savory sausage

#### Sweets (4 items, 1 featured ⭐)
- ⭐ **Gulab Jamun** - Rs. 1000/kg (min 250g) - Traditional milk-solid sweet in sugar syrup
- **Rasgulla** - Rs. 45/piece - Soft cottage cheese balls in light syrup
- **Kheer** - Rs. 320/liter (min 250ml) - Creamy rice pudding with cardamom and nuts
- **Barfi** - Rs. 1200/kg (min 250g) - Sweet milk fudge with pistachios

#### Breads & Rusks (5 items, 1 featured ⭐)
- **White Bread** - Rs. 120/loaf - Fresh soft white bread loaf
- **Brown Bread** - Rs. 140/loaf - Whole wheat brown bread loaf
- ⭐ **Regular Rusk** - Rs. 180/pack - Crispy twice-baked bread slices
- **Milk Rusk** - Rs. 200/pack - Sweet milk-flavored rusks
- **Elaichi Rusk** - Rs. 220/pack - Cardamom-flavored premium rusks

#### Cake (4 items, 1 featured ⭐)
- ⭐ **Chocolate Cake** - Variants: Half Pound (Rs. 225), 1 Pound (Rs. 450), 2 Pounds (Rs. 900), 3 Pounds (Rs. 1350)
- **Vanilla Cake** - Variants: Half Pound (Rs. 200), 1 Pound (Rs. 400), 2 Pounds (Rs. 800), 3 Pounds (Rs. 1200)
- **Black Forest Cake** - Variants: Half Pound (Rs. 275), 1 Pound (Rs. 550), 2 Pounds (Rs. 1100), 3 Pounds (Rs. 1650)
- **Red Velvet Cake** - Variants: Half Pound (Rs. 300), 1 Pound (Rs. 600), 2 Pounds (Rs. 1200), 3 Pounds (Rs. 1800)

#### Nimco (4 items, 1 featured ⭐)
- **Masala Peanuts** - Rs. 600/kg (min 250g) - Crunchy roasted peanuts with spices
- ⭐ **Mix Nimco** - Rs. 720/kg (min 250g) - Assorted savory snacks mix
- **Daal Moth** - Rs. 640/kg (min 250g) - Spicy fried lentil mix
- **Chatpata Mix** - Rs. 680/kg (min 250g) - Tangy and spicy snack mix

#### Deals (4 items, 1 featured ⭐)
- **Breakfast Deal** - Rs. 450/combo - 1 White Bread + 1 Regular Rusk + 6 Chicken Patties
- ⭐ **Tea Time Deal** - Rs. 500/combo - 1 Milk Rusk + 6 Vegetable Puffs + 250g Mix Nimco
- **Party Pack** - Rs. 1200/combo - 12 Chicken Patties + 12 Veg Puffs + 1kg Nimco + 2 Rusks
- **Sweet Tooth Deal** - Rs. 650/combo - 12 Gulab Jamun + 250g Barfi + 250ml Kheer

## Testing the Bot

After seeding, you can test the WhatsApp bot:

1. Start the bot:
```bash
npm run start:dev
```

2. Send a message on WhatsApp to trigger the bot
3. Select "Browse Menu"
4. You should see all 6 categories
5. **Featured items** will appear first in each category ⭐

## Important Notes

⚠️ **Update WhatsApp Credentials**

Before using in production, update these fields in the seed script:

```typescript
// scripts/seed-database.ts

const restaurant = await restaurantModel.create({
  whatsappNumber: 'YOUR_ACTUAL_NUMBER',        // ← Change this
  phoneNumberId: 'YOUR_PHONE_NUMBER_ID',       // ← Change this
  accessToken: 'YOUR_FACEBOOK_ACCESS_TOKEN',   // ← Change this
  // ...rest of the fields
});
```

## Customizing the Seed Data

Edit `scripts/seed-database.ts` to:
- Change restaurant details
- Add/remove categories
- Add/remove menu items
- Modify prices, descriptions, etc.

Then re-run: `npm run seed`

## Troubleshooting

### Error: "Cannot find module '@nestjs/mongoose'"
Run: `npm install`

### Error: "Connection refused"
Make sure MongoDB is running:
```bash
# Check if MongoDB is running
mongosh

# If not, start it (depends on your setup)
brew services start mongodb-community  # macOS
sudo systemctl start mongod             # Linux
```

### Error: "Duplicate key error"
Database already has data. Drop it first or change the restaurant whatsappNumber.

### Script hangs
Press `Ctrl+C` and check your MongoDB connection string in `.env`

## Verifying the Seed

Check MongoDB directly:

```bash
mongosh

use restaurant_bot

# Count documents
db.restaurants.countDocuments()  # Should be 1
db.categories.countDocuments()   # Should be 6
db.menuitems.countDocuments()    # Should be 26

# View restaurant
db.restaurants.findOne()

# View categories
db.categories.find().pretty()

# View featured items
db.menuitems.find({ isFeatured: true }).pretty()
```

## Next Steps

After seeding:
1. ✅ Test WhatsApp bot conversation flow
2. ✅ Test ordering flow
3. ✅ Test checkout with location
4. ✅ Test order tracking
5. 🔧 Build admin panel to manage this data
