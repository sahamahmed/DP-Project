// Dummy data for the admin dashboard

export interface MenuItem {
  id: string
  name: string
  category: string
  description: string
  image: string
  basePrice: number
  available: boolean
  featured: boolean
  prepTime: number
  sortOrder: number
  sku?: string
  unitType: "countable" | "weight" | "volume"
  baseUnit: string
  minOrderQty: number
  orderIncrement: number
  variants?: Variant[]
}

export interface Variant {
  id: string
  name: string
  price: number
  available: boolean
}

export interface Order {
  id: string
  customerId: string
  customerName: string
  customerPhone: string
  items: OrderItem[]
  total: number
  status: "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled"
  source: "bot" | "agent"
  paymentType: "cash" | "online"
  address: string
  createdAt: Date
}

export interface OrderItem {
  menuItemId: string
  name: string
  quantity: number
  price: number
  variant?: string
}

export interface Customer {
  id: string
  name: string
  phone: string
  totalOrders: number
  totalSpend: number
  lastInteraction: Date
  blocked: boolean
}

export interface Chat {
  id: string
  customerId: string
  customerName: string
  customerPhone: string
  lastMessage: string
  status: "bot" | "agent" | "closed"
  messages: Message[]
  orderId?: string
  agentNotes?: string
  updatedAt: Date
}

export interface Message {
  id: string
  content: string
  sender: "customer" | "bot" | "agent"
  timestamp: Date
}

export const categories = ["Breads", "Pastries", "Cakes", "Cookies", "Beverages", "Savory Items"]

export const menuItems: MenuItem[] = [
  {
    id: "1",
    name: "Sourdough Loaf",
    category: "Breads",
    description: "Traditional sourdough bread with a crispy crust",
    image: "/rustic-sourdough-loaf.png",
    basePrice: 250,
    available: true,
    featured: true,
    prepTime: 15,
    sortOrder: 1,
    sku: "BRD-001",
    unitType: "countable",
    baseUnit: "piece",
    minOrderQty: 1,
    orderIncrement: 1,
  },
  {
    id: "2",
    name: "Chocolate Croissant",
    category: "Pastries",
    description: "Buttery croissant filled with rich chocolate",
    image: "/chocolate-croissant.png",
    basePrice: 120,
    available: true,
    featured: true,
    prepTime: 5,
    sortOrder: 2,
    unitType: "countable",
    baseUnit: "piece",
    minOrderQty: 1,
    orderIncrement: 1,
  },
  {
    id: "3",
    name: "Black Forest Cake",
    category: "Cakes",
    description: "Classic chocolate cake with cherries and cream",
    image: "/black-forest-cake.png",
    basePrice: 800,
    available: true,
    featured: false,
    prepTime: 30,
    sortOrder: 3,
    unitType: "weight",
    baseUnit: "kg",
    minOrderQty: 0.5,
    orderIncrement: 0.25,
    variants: [
      { id: "v1", name: "500g", price: 450, available: true },
      { id: "v2", name: "1kg", price: 800, available: true },
      { id: "v3", name: "2kg", price: 1500, available: false },
    ],
  },
  {
    id: "4",
    name: "Butter Cookies",
    category: "Cookies",
    description: "Melt-in-mouth butter cookies",
    image: "/butter-cookies.jpg",
    basePrice: 180,
    available: false,
    featured: false,
    prepTime: 10,
    sortOrder: 4,
    unitType: "countable",
    baseUnit: "box",
    minOrderQty: 1,
    orderIncrement: 1,
  },
  {
    id: "5",
    name: "Fresh Orange Juice",
    category: "Beverages",
    description: "Freshly squeezed orange juice",
    image: "/orange-juice-glass.png",
    basePrice: 150,
    available: true,
    featured: false,
    prepTime: 5,
    sortOrder: 5,
    unitType: "volume",
    baseUnit: "liter",
    minOrderQty: 0.25,
    orderIncrement: 0.25,
  },
  {
    id: "6",
    name: "Veggie Sandwich",
    category: "Savory Items",
    description: "Fresh vegetables with hummus on artisan bread",
    image: "/veggie-sandwich.png",
    basePrice: 180,
    available: true,
    featured: false,
    prepTime: 10,
    sortOrder: 6,
    unitType: "countable",
    baseUnit: "piece",
    minOrderQty: 1,
    orderIncrement: 1,
  },
]

export const orders: Order[] = [
  {
    id: "ORD-001",
    customerId: "1",
    customerName: "Priya Sharma",
    customerPhone: "+91 98765 43210",
    items: [
      { menuItemId: "1", name: "Sourdough Loaf", quantity: 2, price: 250 },
      { menuItemId: "2", name: "Chocolate Croissant", quantity: 4, price: 120 },
    ],
    total: 980,
    status: "pending",
    source: "bot",
    paymentType: "online",
    address: "123 MG Road, Bangalore 560001",
    createdAt: new Date(Date.now() - 1000 * 60 * 15),
  },
  {
    id: "ORD-002",
    customerId: "2",
    customerName: "Rahul Verma",
    customerPhone: "+91 98765 12345",
    items: [{ menuItemId: "3", name: "Black Forest Cake", quantity: 1, price: 800, variant: "1kg" }],
    total: 800,
    status: "confirmed",
    source: "agent",
    paymentType: "cash",
    address: "456 Park Street, Bangalore 560002",
    createdAt: new Date(Date.now() - 1000 * 60 * 45),
  },
  {
    id: "ORD-003",
    customerId: "3",
    customerName: "Anita Desai",
    customerPhone: "+91 87654 32109",
    items: [
      { menuItemId: "5", name: "Fresh Orange Juice", quantity: 2, price: 150 },
      { menuItemId: "6", name: "Veggie Sandwich", quantity: 2, price: 180 },
    ],
    total: 660,
    status: "preparing",
    source: "bot",
    paymentType: "online",
    address: "789 Brigade Road, Bangalore 560003",
    createdAt: new Date(Date.now() - 1000 * 60 * 90),
  },
  {
    id: "ORD-004",
    customerId: "1",
    customerName: "Priya Sharma",
    customerPhone: "+91 98765 43210",
    items: [{ menuItemId: "4", name: "Butter Cookies", quantity: 3, price: 180 }],
    total: 540,
    status: "delivered",
    source: "bot",
    paymentType: "cash",
    address: "123 MG Road, Bangalore 560001",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
]

export const customers: Customer[] = [
  {
    id: "1",
    name: "Priya Sharma",
    phone: "+91 98765 43210",
    totalOrders: 12,
    totalSpend: 8500,
    lastInteraction: new Date(Date.now() - 1000 * 60 * 15),
    blocked: false,
  },
  {
    id: "2",
    name: "Rahul Verma",
    phone: "+91 98765 12345",
    totalOrders: 5,
    totalSpend: 3200,
    lastInteraction: new Date(Date.now() - 1000 * 60 * 45),
    blocked: false,
  },
  {
    id: "3",
    name: "Anita Desai",
    phone: "+91 87654 32109",
    totalOrders: 8,
    totalSpend: 4800,
    lastInteraction: new Date(Date.now() - 1000 * 60 * 90),
    blocked: false,
  },
  {
    id: "4",
    name: "Vikram Singh",
    phone: "+91 76543 21098",
    totalOrders: 2,
    totalSpend: 650,
    lastInteraction: new Date(Date.now() - 1000 * 60 * 60 * 48),
    blocked: true,
  },
]

export const chats: Chat[] = [
  {
    id: "1",
    customerId: "1",
    customerName: "Priya Sharma",
    customerPhone: "+91 98765 43210",
    lastMessage: "Thank you! When will my order be ready?",
    status: "bot",
    orderId: "ORD-001",
    messages: [
      {
        id: "m1",
        content: "Hi! I'd like to order some bread",
        sender: "customer",
        timestamp: new Date(Date.now() - 1000 * 60 * 20),
      },
      {
        id: "m2",
        content: "Hello! Welcome to Sunrise Bakery. What would you like to order today?",
        sender: "bot",
        timestamp: new Date(Date.now() - 1000 * 60 * 19),
      },
      {
        id: "m3",
        content: "2 sourdough loaves and 4 chocolate croissants please",
        sender: "customer",
        timestamp: new Date(Date.now() - 1000 * 60 * 18),
      },
      {
        id: "m4",
        content: "Great choice! Your order total is Rs 980. Please confirm your address: 123 MG Road, Bangalore 560001",
        sender: "bot",
        timestamp: new Date(Date.now() - 1000 * 60 * 17),
      },
      {
        id: "m5",
        content: "Yes, that's correct",
        sender: "customer",
        timestamp: new Date(Date.now() - 1000 * 60 * 16),
      },
      {
        id: "m6",
        content: "Order confirmed! Your order ID is ORD-001. Expected ready time: 30 minutes.",
        sender: "bot",
        timestamp: new Date(Date.now() - 1000 * 60 * 15),
      },
      {
        id: "m7",
        content: "Thank you! When will my order be ready?",
        sender: "customer",
        timestamp: new Date(Date.now() - 1000 * 60 * 14),
      },
    ],
    updatedAt: new Date(Date.now() - 1000 * 60 * 14),
  },
  {
    id: "2",
    customerId: "2",
    customerName: "Rahul Verma",
    customerPhone: "+91 98765 12345",
    lastMessage: "I need to speak to someone about a custom cake",
    status: "agent",
    orderId: "ORD-002",
    agentNotes: "Customer wants custom message on cake. Confirmed chocolate flavor.",
    messages: [
      {
        id: "m1",
        content: "I need to speak to someone about a custom cake",
        sender: "customer",
        timestamp: new Date(Date.now() - 1000 * 60 * 50),
      },
      {
        id: "m2",
        content: "I'll connect you with our team. Please wait a moment.",
        sender: "bot",
        timestamp: new Date(Date.now() - 1000 * 60 * 49),
      },
      {
        id: "m3",
        content: "Hi Rahul! I'm here to help with your custom cake order. What would you like?",
        sender: "agent",
        timestamp: new Date(Date.now() - 1000 * 60 * 48),
      },
      {
        id: "m4",
        content: "I want a Black Forest cake for my daughter's birthday. Can you write 'Happy Birthday Neha' on it?",
        sender: "customer",
        timestamp: new Date(Date.now() - 1000 * 60 * 46),
      },
      {
        id: "m5",
        content: "What size would you prefer - 500g, 1kg, or 2kg?",
        sender: "agent",
        timestamp: new Date(Date.now() - 1000 * 60 * 45),
      },
    ],
    updatedAt: new Date(Date.now() - 1000 * 60 * 45),
  },
  {
    id: "3",
    customerId: "3",
    customerName: "Anita Desai",
    customerPhone: "+91 87654 32109",
    lastMessage: "Thanks for your help!",
    status: "closed",
    messages: [
      {
        id: "m1",
        content: "What time do you close today?",
        sender: "customer",
        timestamp: new Date(Date.now() - 1000 * 60 * 120),
      },
      {
        id: "m2",
        content: "We're open until 8 PM today. Is there anything else I can help you with?",
        sender: "bot",
        timestamp: new Date(Date.now() - 1000 * 60 * 119),
      },
      {
        id: "m3",
        content: "Thanks for your help!",
        sender: "customer",
        timestamp: new Date(Date.now() - 1000 * 60 * 118),
      },
    ],
    updatedAt: new Date(Date.now() - 1000 * 60 * 118),
  },
]

export const dashboardStats = {
  ordersToday: 24,
  revenueToday: 18500,
  activeChats: 3,
  abandonedChats: 2,
  botHandled: 75,
  agentHandled: 25,
}
