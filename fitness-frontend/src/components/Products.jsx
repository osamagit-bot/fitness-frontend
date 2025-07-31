import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import api from '../utils/api';
import { staticProducts } from '../utils/staticData';
import HisabPayCheckout from './payment/HisabPayCheckout';
import PaymentSuccess from './payment/PaymentSuccess';
import AOS from 'aos';
import 'aos/dist/aos.css';
export default function Products() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showQuickView, setShowQuickView] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showHisabPay, setShowHisabPay] = useState(false);
  const [transactionId, setTransactionId] = useState(null);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [memberId, setMemberId] = useState(null);
  
  const { classes } = useTheme();

  const featuredProductsRef = useRef(null);

  // Add this helper function at the top of your component
  const getImageUrl = (product) => {
    if (product.image_url) {
      // If it's already a local path, return as is
      if (product.image_url.startsWith('/images/')) {
        return product.image_url;
      }
      return product.image_url;
    }
    if (product.image) {
      // If it's already a local path, return as is
      if (product.image.startsWith('/images/')) {
        return product.image;
      }
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
      const imagePath = product.image.startsWith('/') ? product.image : `/${product.image}`;
      return `${baseUrl}${imagePath}`;
    }
    return '/images/whey.jpg'; // Use local fallback
  };

  // Fetch member PK after login (or on mount if token exists)
  

  useEffect(() => {
    AOS.init();
    fetchProducts();
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  useEffect(() => {
    let result = [...products];
    if (selectedCategory !== 'All') {
      result = result.filter(product => product.category === selectedCategory);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(product =>
        product.name.toLowerCase().includes(query) ||
        (product.description && product.description.toLowerCase().includes(query))
      );
    }
    switch (sortBy) {
      case 'price-low-high':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high-low':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'name-a-z':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-z-a':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      default:
        break;
    }
    setFilteredProducts(result);
  }, [products, selectedCategory, searchQuery, sortBy]);

  const checkIfMobile = () => {
    setIsMobile(window.innerWidth < 768);
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`products/`);
      const productsData = response.data.results || response.data;
      const productsArray = Array.isArray(productsData) ? productsData : [];
      setProducts(productsArray);
      const uniqueCategories = ['All', ...new Set(productsArray.map(p => p.category).filter(Boolean))];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to load products');
      // Fallback to static data if API fails
      setProducts(staticProducts);
      const uniqueCategories = ['All', ...new Set(staticProducts.map(p => p.category).filter(Boolean))];
      setCategories(uniqueCategories);
    } finally {
      setIsLoading(false);
    }
  };

  const nextProduct = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === filteredProducts.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevProduct = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? filteredProducts.length - 1 : prevIndex - 1
    );
  };

  const goToProduct = (index) => {
    if (index >= 0 && index < filteredProducts.length) {
      setCurrentIndex(index);
    }
  };

  // Add to cart
  const addToCart = (product, quantity = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product_id === product.product_id);
      if (existingItem) {
        return prevCart.map(item =>
          item.product_id === product.product_id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        return [...prevCart, { ...product, quantity }];
      }
    });
    setShowCart(true);
    setTimeout(() => setShowCart(false), 3000);
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.product_id !== productId));
  };

  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) return;
    setCart(prevCart =>
      prevCart.map(item =>
        item.product_id === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

  const openQuickView = (product) => {
    setSelectedProduct(product);
    setShowQuickView(true);
  };

  const closeQuickView = () => {
    setShowQuickView(false);
    setTimeout(() => setSelectedProduct(null), 300);
  };

  const scrollToFeatured = () => {
    featuredProductsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // --- CREATE PURCHASE LOGIC ---
  const createPurchase = async (cartItems) => {
  const token = localStorage.getItem("access_token") || localStorage.getItem("member_access_token");
  console.log('🛒 Creating purchases for', cartItems.length, 'items');
  
  for (const item of cartItems) {
    const purchaseData = {
      product: item.product_id || item.id,
      quantity: parseInt(item.quantity),
      total_price: parseFloat((item.price * item.quantity).toFixed(2)),
      date: new Date().toISOString(),
    };
    // Only add member if logged in
    if (memberId) {
      purchaseData.member = memberId;
    }
    
    console.log('🛒 Purchase data:', purchaseData);
    
    try {
      const response = await api.post(
        "purchases/",
        purchaseData,
        token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      );
      console.log('✅ Purchase created:', response.data);
    } catch (err) {
      console.error("❌ Failed to create purchase:", err.response?.data || err.message);
      console.error('Purchase data that failed:', purchaseData);
    }
  }
};

  // Handle Hisab Pay Checkout
  const handleCheckout = () => {
    setShowCart(false);
    setShowHisabPay(true);
  };

  // Handle payment success
  const handlePaymentSuccess = async (txnId) => {
    console.log('💳 Payment successful, transaction ID:', txnId);
    setTransactionId(txnId);
    setShowHisabPay(false);
    setShowPaymentSuccess(true);

    console.log('🛒 Cart items to save:', cart);
    // Save purchases to backend (notifications are created automatically)
    await createPurchase(cart);
    
    // Trigger a custom event to refresh revenue pages
    window.dispatchEvent(new CustomEvent('purchaseCompleted', { detail: { cart } }));

    // Clear cart after successful payment
    setCart([]);
  };

  const handlePaymentFailure = (errorMessage) => {
    console.error('Payment failed:', errorMessage);
  };

  const handleContinueShopping = () => {
    setShowPaymentSuccess(false);
  };

  // Quick View Modal
  const QuickViewModal = () => {
    const [quantity, setQuantity] = useState(1);
    if (!selectedProduct) return null;
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 ${showQuickView ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-300`}>
        <div className="absolute inset-0 bg-black bg-opacity-75" onClick={closeQuickView}></div>
        <div className={`${classes.bg.card} rounded-lg shadow-xl max-w-4xl w-full mx-auto z-10 overflow-y-auto max-h-[90vh] transform transition-transform duration-300 scale-100`}>
          <div className="flex flex-col lg:flex-row">
            <div className={`lg:w-1/2 p-4 md:p-6 ${classes.bg.secondary} flex items-center justify-center`}>
              {selectedProduct.image_url ? (
                <img
                  src={selectedProduct.image_url}
                  alt={selectedProduct.name}
                  className="max-h-60 md:max-h-80 object-contain"
                />
              ) : selectedProduct.image ? (
                <img
                  src={`http://127.0.0.1:8000${selectedProduct.image}`}
                  alt={selectedProduct.name}
                  className="max-h-60 md:max-h-80 object-contain"
                />
              ) : (
                <div className={`h-60 md:h-80 w-full ${classes.bg.tertiary} flex items-center justify-center ${classes.text.tertiary}`}>
                  <img src="/images/whey.jpg" alt="No image" className="max-h-60 md:max-h-80 object-contain" />
                </div>
              )}
            </div>
            <div className="lg:w-1/2 p-4 md:p-6">
              <div className="flex justify-between items-start">
                <h3 className={`text-xl md:text-2xl font-bold ${classes.text.primary}`}>{selectedProduct.name}</h3>
                <button onClick={closeQuickView} className={`${classes.text.tertiary} hover:${classes.text.secondary}`}>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-4">
                <span className={`text-lg md:text-xl font-bold ${classes.text.primary}`}>AFN {parseFloat(selectedProduct.price).toFixed(2)}</span>
                {selectedProduct.compare_at_price && (
                  <span className={`ml-3 text-sm md:text-base ${classes.text.tertiary} line-through`}>AFN {parseFloat(selectedProduct.compare_at_price).toFixed(2)}</span>
                )}
              </div>
              {selectedProduct.description && (
                <p className={`mt-4 ${classes.text.secondary}`}>{selectedProduct.description}</p>
              )}
              {selectedProduct.category && (
                <div className="mt-6">
                  <span className={`text-sm ${classes.text.tertiary}`}>Category:</span>
                  <span className={`ml-2 text-sm ${classes.bg.tertiary} ${classes.text.primary} py-1 px-2 rounded`}>
                    {selectedProduct.category}
                  </span>
                </div>
              )}
              <div className="mt-6">
                <div className="flex items-center space-x-3">
                  <span className={classes.text.primary}>Quantity:</span>
                  <div className={`flex items-center border ${classes.border.primary} rounded`}>
                    <button
                      onClick={() => setQuantity(prev => Math.max(prev - 1, 1))}
                      className={`px-3 py-1 ${classes.bg.tertiary} hover:${classes.bg.secondary} ${classes.text.secondary}`}
                    >-</button>
                    <span className={`px-3 py-1 ${classes.text.primary}`}>{quantity}</span>
                    <button
                      onClick={() => setQuantity(prev => prev + 1)}
                      className={`px-3 py-1 ${classes.bg.tertiary} hover:${classes.bg.secondary} ${classes.text.secondary}`}
                    >+</button>
                  </div>
                </div>
                <button
                  onClick={() => {
                    addToCart(selectedProduct, quantity);
                    closeQuickView();
                  }}
                  className="mt-6 w-full bg-yellow-500 hover:bg-yellow-600 text-white py-3 px-4 rounded-md transition duration-300 flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Shopping Cart Sidebar
  const ShoppingCartSidebar = () => {
    return (
      <div className={`fixed inset-y-0 right-0 w-full max-w-sm sm:max-w-md md:w-96 ${classes.bg.card} shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${showCart ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className={`p-4 border-b ${classes.border.primary} flex items-center justify-between`}>
            <h3 className={`text-lg font-semibold ${classes.text.primary}`}>Your Cart ({cart.length})</h3>
            <button onClick={() => setShowCart(false)} className={`${classes.text.tertiary} hover:${classes.text.secondary}`}>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className={`flex flex-col items-center justify-center h-full ${classes.text.tertiary}`}>
                <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p>Your cart is empty</p>
                <button
                  onClick={() => setShowCart(false)}
                  className="mt-6 text-yellow-500 hover:text-yellow-600 font-medium"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map(item => (
                  <div key={item.product_id} className={`flex border-b ${classes.border.primary} pb-4`}>
                    <div className={`w-16 h-16 md:w-20 md:h-20 flex-shrink-0 ${classes.bg.tertiary} rounded overflow-hidden`}>
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" />
                      ) : item.image ? (
                        <img src={`http://127.0.0.1:8000${item.image}`} alt={item.name} className="w-full h-full object-contain" />
                      ) : (
                        <div className={`w-full h-full ${classes.bg.secondary} flex items-center justify-center`}>
                          <span className={`text-xs ${classes.text.tertiary}`}>No image</span>
                        </div>
                      )}
                    </div>
                    <div className="ml-3 md:ml-4 flex-1">
                      <h4 className={`text-sm font-medium ${classes.text.primary} line-clamp-2`}>{item.name}</h4>
                      <p className={`text-xs md:text-sm ${classes.text.tertiary}`}>AFN {parseFloat(item.price).toFixed(2)}</p>
                      <div className="flex items-center mt-2">
                        <button
                          onClick={() => updateCartQuantity(item.product_id, item.quantity - 1)}
                          className={`${classes.text.tertiary} hover:${classes.text.primary}`}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                          </svg>
                        </button>
                        <span className={`mx-2 text-sm ${classes.text.primary}`}>{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.product_id, item.quantity + 1)}
                          className={`${classes.text.tertiary} hover:${classes.text.primary}`}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="ml-2">
                      <button
                        onClick={() => removeFromCart(item.product_id)}
                        className={`${classes.text.tertiary} hover:text-red-500`}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {cart.length > 0 && (
            <div className={`border-t ${classes.border.primary} p-4`}>
              <div className="flex justify-between mb-4">
                <span className={`font-medium ${classes.text.primary}`}>Subtotal</span>
                <span className={`font-bold ${classes.text.primary}`}>AFN {cartTotal.toFixed(2)}</span>
              </div>
              <button
                onClick={handleCheckout}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-md transition duration-300 flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pay with Hisab
              </button>
              <button
                onClick={() => setShowCart(false)}
                className={`w-full mt-2 border ${classes.border.primary} ${classes.text.primary} py-2 rounded-md hover:${classes.bg.secondary} transition duration-300`}
              >
                Continue Shopping
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={`container mx-auto py-8 px-4 ${classes.bg.primary}`}>
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-500 mb-4"></div>
          <p className={classes.text.secondary}>Loading products...</p>
        </div>
      </div>
    );
  }



  // Only show error page if no products available at all
  if (error && products.length === 0) {
    return (
      <section id="products" className={`py-12 ${classes.bg.primary}`}>
        <div className="container mx-auto py-8 px-4">
          <h2 className={`text-4xl font-bold text-center mb-12 ${classes.text.primary}`}>
            OUR <span className="text-yellow-500">SHOP</span>
          </h2>
          <div className={`${classes.bg.tertiary} border-l-4 border-red-500 p-4 rounded shadow-md`}>
            <div className="flex items-center">
              <svg className="h-6 w-6 text-red-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className={`${classes.text.primary}`}>{error}</p>
            </div>
            <button
              onClick={fetchProducts}
              className="mt-4 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-md transition duration-300"
            >
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Mobile view - single product carousel
  if (isMobile) {
    // ... (mobile view code as in your previous file) ...
    // For brevity, you can use your existing mobile view code here.
  }

  // Desktop view
  return (
    <section id="products" className={`py-8 sm:py-12 ${classes.bg.primary}`}>
      <div className="container mx-auto py-4 sm:py-8 px-2 sm:px-4">

        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8">
          <h2 className={`text-2xl md:text-3xl lg:text-4xl font-bold ${classes.text.primary}`}>
            OUR <span className="text-yellow-500">SHOP</span>
          </h2>
          
          <div className="mt-4 md:mt-0 flex items-center space-x-4">
            {/* Search input */}
            <div className="relative hidden md:block w-48 lg:w-64">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full p-2 pl-9 border rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none text-sm ${classes.input.primary}`}
              />
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            {/* Sort dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={`p-2 border rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none text-sm ${classes.input.primary}`}
            >
              <option value="default">Sort by</option>
              <option value="price-low-high">Price: Low to High</option>
              <option value="price-high-low">Price: High to Low</option>
              <option value="name-a-z">Name: A to Z</option>
              <option value="name-z-a">Name: Z to A</option>
            </select>
            
            {/* Cart button */}
            <button 
              onClick={() => setShowCart(true)}
              className={`relative p-2 ${classes.text.secondary} hover:text-yellow-500 transition`}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cart.length > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        </div>
        
        {/* Mobile search input */}
        <div className="md:hidden mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full p-3 pl-10 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none ${classes.input.primary}`}
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        
        {/* Category filters - horizontal scrollable for mobile */}
        <div className="mb-6 md:mb-8 overflow-x-auto pb-2">
          <div className="flex space-x-2 min-w-max px-1">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 md:px-4 py-2 rounded-md text-sm whitespace-nowrap ${
                  selectedCategory === category
                    ? 'bg-yellow-500 text-white'
                    : `${classes.bg.tertiary} ${classes.text.secondary} hover:${classes.bg.secondary}`
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
        
        {filteredProducts.length === 0 ? (
          <div className={`${classes.bg.secondary} rounded-lg p-8 text-center`}>
            <svg className={`w-16 h-16 mx-auto ${classes.text.tertiary} mb-4`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className={`text-lg font-medium ${classes.text.primary} mb-2`}>No products found</h3>
            <p className={`${classes.text.secondary} mb-6`}>Try adjusting your search or filter to find what you're looking for.</p>
            <button
              onClick={() => {
                setSelectedCategory('All');
                setSearchQuery('');
                setSortBy('default');
              }}
              className="inline-flex items-center px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredProducts.map((product, i) => (
              <div 
                key={product.product_id}
                data-aos="fade-up"
                data-aos-delay={i * 200}
                data-aos-duration="800"
                className={`${classes.card.primary} p-3 md:p-4 rounded-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2`}
              >
                <div className={`mb-3 md:mb-4 h-40 md:h-48 ${classes.bg.secondary} flex items-center justify-center overflow-hidden rounded-lg relative group`}>
                  {product.image_url ? (
                    <img 
                      src={getImageUrl(product)}
                      alt={product.name} 
                      className="h-40 md:h-48 object-contain transition-transform duration-500 ease-in-out group-hover:scale-110"
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/images/whey.jpg'; // Use local fallback
                      }}
                    />
                  ) : product.image ? (
                    <img 
                      src={getImageUrl(product)}
                      alt={product.name} 
                      className="h-40 md:h-48 object-contain transition-transform duration-500 ease-in-out group-hover:scale-110"
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/images/whey.jpg'; // Use local fallback
                      }}
                    />
                  ) : (
                    <div className="h-40 md:h-48 w-full bg-gray-200 flex items-center justify-center text-gray-500">
                      No image
                    </div>
                  )}
                  
                  {/* Sale badge */}
                  {product.on_sale && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md">
                      SALE
                    </div>
                  )}
                  
                  {/* Quick view overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button 
                      onClick={() => openQuickView(product)} 
                      className="bg-white text-gray-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-yellow-500 hover:text-white transition-colors"
                    >
                      Quick View
                    </button>
                  </div>
                </div>
                
                <h3 className={`text-base md:text-lg font-semibold mb-1 ${classes.text.primary} truncate`}>{product.name}</h3>
                
                {product.category && (
                  <div className="mb-2">
                    <span className={`text-xs ${classes.bg.tertiary} ${classes.text.secondary} px-2 py-1 rounded`}>
                      {product.category}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className={`text-lg md:text-xl font-bold ${classes.text.primary}`}>
                      AFN {parseFloat(product.price).toFixed(2)}
                    </span>
                    {product.compare_at_price && (
                      <span className={`ml-2 text-xs md:text-sm ${classes.text.tertiary} line-through`}>
                        AFN {parseFloat(product.compare_at_price).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                
                <button 
                  onClick={() => addToCart(product)}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 md:py-2.5 rounded-md transition duration-300 flex items-center justify-center text-sm md:text-base"
                >
                  <svg className="w-4 h-4 md:w-5 md:h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Add to Cart
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Modals and overlays */}
        <QuickViewModal />
        <ShoppingCartSidebar />
        
        {/* Hisab Pay Checkout Modal */}
        <HisabPayCheckout 
          isOpen={showHisabPay}
          onClose={() => setShowHisabPay(false)}
          cartItems={cart}
          total={cartTotal}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentFailure={handlePaymentFailure}
        />
        
        {/* Payment Success Modal */}
        {showPaymentSuccess && (
          <PaymentSuccess
            transactionId={transactionId}
            onClose={handleContinueShopping}
          />
        )}
      </div>
    </section>
  );
}






