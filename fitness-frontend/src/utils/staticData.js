// Static fallback data for offline functionality
// This data is used when the backend is unavailable

export const staticTrainers = [
  {
    id: 1,
    first_name: "Alex",
    last_name: "Rodriguez",
    email: "alex@fitnessgym.com",
    phone: "+1 (555) 123-4567",
    specialization: "Strength Training",
    start_date: "2023-01-15",
    image: "/images/trainer1.jpg"
  },
  {
    id: 2,
    first_name: "Sarah",
    last_name: "Johnson",
    email: "sarah@fitnessgym.com", 
    phone: "+1 (555) 234-5678",
    specialization: "Cardio & HIIT",
    start_date: "2022-08-20",
    image: "/images/trainer2.jpg"
  },
  {
    id: 3,
    first_name: "Mike",
    last_name: "Chen",
    email: "mike@fitnessgym.com",
    phone: "+1 (555) 345-6789", 
    specialization: "Yoga & Flexibility",
    start_date: "2023-03-10",
    image: "/images/trainer3.jpg"
  },
  {
    id: 4,
    first_name: "Emma",
    last_name: "Williams",
    email: "emma@fitnessgym.com",
    phone: "+1 (555) 456-7890",
    specialization: "CrossFit & Functional",
    start_date: "2022-11-05",
    image: "/images/trainer4.jpg"
  }
];

export const staticTrainings = [
  {
    id: 1,
    image: "/images/chest.jpeg",
    type: "Chest Workout",
    description: "Embrace the essence of strength as we delve into its physical, mental, and emotional dimensions.",
    trainer_name: "Alex Rodriguez",
    trainer_email: "alex@fitnessgym.com",
    datetime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    duration: 60,
    capacity: 15
  },
  {
    id: 2,
    image: "/images/shoulder.jpg",
    type: "Shoulder Workout", 
    description: "Improve health, strength, flexibility, and overall well-being through dynamic activities.",
    trainer_name: "Sarah Johnson",
    trainer_email: "sarah@fitnessgym.com",
    datetime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
    duration: 45,
    capacity: 12
  },
  {
    id: 3,
    image: "/images/fat.jpg",
    type: "Fat Loss",
    description: "With routines and guidance, we'll help you burn fat and reach your goals effectively.",
    trainer_name: "Mike Chen",
    trainer_email: "mike@fitnessgym.com",
    datetime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 90,
    capacity: 20
  },
  {
    id: 4,
    image: "/images/weight.jpg",
    type: "Weight Gain",
    description: "Our program provides a structured approach to gaining weight in a sustainable manner.",
    trainer_name: "Emma Williams",
    trainer_email: "emma@fitnessgym.com",
    datetime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 75,
    capacity: 10
  }
];

export const staticProducts = [
  {
    product_id: 1,
    id: 1,
    name: "Premium Protein Powder",
    description: "High-quality whey protein for muscle building and recovery",
    price: 49.99,
    image: "/images/whey.jpg",
    image_url: "/images/whey.jpg",
    category: "Supplements",
    stock: 25,
    rating: 4.8,
    on_sale: false,
    compare_at_price: null
  },
  {
    product_id: 2,
    id: 2,
    name: "Resistance Bands Set",
    description: "Complete set of resistance bands for strength training",
    price: 29.99,
    image: "/images/belt.jpg",
    image_url: "/images/belt.jpg",
    category: "Equipment",
    stock: 15,
    rating: 4.6,
    on_sale: true,
    compare_at_price: 39.99
  },
  {
    product_id: 3,
    id: 3,
    name: "Yoga Mat Premium",
    description: "Non-slip premium yoga mat for all fitness activities",
    price: 39.99,
    image: "/images/gloves.jpg",
    image_url: "/images/gloves.jpg",
    category: "Equipment", 
    stock: 30,
    rating: 4.7,
    on_sale: false,
    compare_at_price: null
  },
  {
    product_id: 4,
    id: 4,
    name: "Pre-Workout Energy",
    description: "Natural pre-workout supplement for enhanced performance",
    price: 34.99,
    image: "/images/energy.jpg",
    image_url: "/images/energy.jpg",
    category: "Supplements",
    stock: 20,
    rating: 4.5,
    on_sale: false,
    compare_at_price: null
  }
];

export const staticMembers = [
  {
    id: 1,
    first_name: "John",
    last_name: "Doe",
    email: "john.doe@email.com",
    phone: "+1 (555) 123-0001",
    membership_type: "Premium",
    expiry_date: "2025-12-31",
    athlete_id: "GYM001",
    is_active: true
  },
  {
    id: 2,
    first_name: "Jane",
    last_name: "Smith",
    email: "jane.smith@email.com",
    phone: "+1 (555) 123-0002",
    membership_type: "Basic",
    expiry_date: "2025-06-30",
    athlete_id: "GYM002",
    is_active: true
  },
  {
    id: 3,
    first_name: "Mike",
    last_name: "Wilson",
    email: "mike.wilson@email.com",
    phone: "+1 (555) 123-0003",
    membership_type: "Premium",
    expiry_date: "2025-11-15",
    athlete_id: "GYM003",
    is_active: true
  }
];

export const staticAttendance = [
  {
    id: 1,
    member_name: "John Doe",
    athlete_id: "GYM001",
    check_in_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    check_out_time: null,
    date: new Date().toISOString().split('T')[0],
    status: "checked_in"
  },
  {
    id: 2,
    member_name: "Jane Smith", 
    athlete_id: "GYM002",
    check_in_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
    check_out_time: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: "completed"
  }
];

export const staticStats = {
  total_members: 156,
  active_members: 142,
  total_trainers: 6,
  total_revenue: 12450.00,
  monthly_growth: 8.5,
  attendance_rate: 78.5
};

// Utility function to simulate API delay
export const simulateApiDelay = (ms = 1000) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Check if app is in offline mode
export const isOfflineMode = () => {
  return !navigator.onLine || import.meta.env.VITE_ENABLE_OFFLINE_MODE === 'true';
};
