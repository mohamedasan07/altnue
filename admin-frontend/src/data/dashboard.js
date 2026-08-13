import {
  FiDollarSign,
  FiShoppingBag,
  FiPackage,
  FiUsers,
  FiPlus,
  FiBarChart2,
} from 'react-icons/fi'

/**
 * Sprint 17 — Dashboard mock data.
 * Static sample values only; backend integration comes in a later sprint.
 */

export const dashboardStats = [
  {
    id: 'revenue',
    label: 'Revenue',
    value: '₹0',
    percentage: '+12.5%',
    hint: 'vs last month',
    trend: 'up',
    accent: 'green',
    icon: FiDollarSign,
  },
  {
    id: 'orders',
    label: 'Orders',
    value: '0',
    percentage: '+8.2%',
    hint: 'vs last month',
    trend: 'up',
    accent: 'blue',
    icon: FiShoppingBag,
  },
  {
    id: 'products',
    label: 'Products',
    value: '0',
    percentage: '+3.4%',
    hint: 'vs last month',
    trend: 'up',
    accent: 'purple',
    icon: FiPackage,
  },
  {
    id: 'customers',
    label: 'Customers',
    value: '0',
    percentage: '+5.1%',
    hint: 'vs last month',
    trend: 'up',
    accent: 'orange',
    icon: FiUsers,
  },
]

export const salesOverview = [
  { month: 'Jan', revenue: 42000, orders: 320 },
  { month: 'Feb', revenue: 51000, orders: 385 },
  { month: 'Mar', revenue: 46000, orders: 352 },
  { month: 'Apr', revenue: 62000, orders: 430 },
  { month: 'May', revenue: 58000, orders: 405 },
  { month: 'Jun', revenue: 74000, orders: 490 },
]

export const recentOrders = [
  {
    id: '#ORD-1024',
    customer: 'Ananya Sharma',
    amount: '₹2,499',
    status: 'Delivered',
    date: '12 Aug 2026',
  },
  {
    id: '#ORD-1023',
    customer: 'Rohan Mehta',
    amount: '₹4,398',
    status: 'Processing',
    date: '12 Aug 2026',
  },
  {
    id: '#ORD-1022',
    customer: 'Priya Nair',
    amount: '₹1,490',
    status: 'Pending',
    date: '11 Aug 2026',
  },
  {
    id: '#ORD-1021',
    customer: 'Kabir Singh',
    amount: '₹7,199',
    status: 'Delivered',
    date: '11 Aug 2026',
  },
  {
    id: '#ORD-1020',
    customer: 'Sara Khan',
    amount: '₹2,099',
    status: 'Cancelled',
    date: '10 Aug 2026',
  },
]

export const lowStockProducts = [
  {
    id: 12,
    name: 'Graphic Tee',
    category: 'tshirts',
    stock: 6,
    image:
      'https://res.cloudinary.com/jtfzpgol/image/upload/v1786373905/unsorted/products/tshirt_1.jpg',
  },
  {
    id: 11,
    name: 'Oxford Shirt',
    category: 'shirts',
    stock: 9,
    image:
      'https://res.cloudinary.com/jtfzpgol/image/upload/v1786373901/unsorted/products/ralph_lauren.jpg',
  },
  {
    id: 16,
    name: 'Thrift Bucket Hat',
    category: 'accessories',
    stock: 4,
    image:
      'https://res.cloudinary.com/jtfzpgol/image/upload/v1786373923/unsorted/products/accessory1_cap.jpg',
  },
  {
    id: 14,
    name: 'Vintage Wash Tee',
    category: 'tshirts',
    stock: 7,
    image:
      'https://res.cloudinary.com/jtfzpgol/image/upload/v1786373919/unsorted/products/tshirt_3.jpg',
  },
]

export const recentActivity = [
  {
    id: 1,
    type: 'product',
    title: 'Admin added product',
    detail: 'Graphic Tee was added to the catalog',
    time: '2 min ago',
  },
  {
    id: 2,
    type: 'order',
    title: 'Customer placed order',
    detail: '#ORD-1024 · ₹2,499',
    time: '18 min ago',
  },
  {
    id: 3,
    type: 'ship',
    title: 'Order shipped',
    detail: '#ORD-1019 dispatched to Mumbai',
    time: '1 hr ago',
  },
  {
    id: 4,
    type: 'update',
    title: 'Product updated',
    detail: 'Oxford Shirt stock updated to 55',
    time: '3 hrs ago',
  },
]

export const quickActions = [
  {
    id: 'add-product',
    label: 'Add Product',
    description: 'Create a new listing',
    to: '/products',
    icon: FiPlus,
    accent: 'primary',
  },
  {
    id: 'orders',
    label: 'View Orders',
    description: 'Manage fulfilment',
    to: '/orders',
    icon: FiShoppingBag,
    accent: 'blue',
  },
  {
    id: 'customers',
    label: 'Customers',
    description: 'Browse your audience',
    to: '/customers',
    icon: FiUsers,
    accent: 'purple',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    description: 'Explore insights',
    to: '/analytics',
    icon: FiBarChart2,
    accent: 'orange',
  },
]
