import { useEffect, useRef, useState } from 'react';
import HisabPayCheckout from './payment/HisabPayCheckout';
import PaymentSuccess from './payment/PaymentSuccess';
import api from '../services/api';
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

  const featuredProductsRef = useRef(null);

  // Fetch member PK after login (or on mount if token exists)
  useEffect(() => {
    const fetchMemberPK = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) return;
      try {
        const res = await api.get(`get-member-pk/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMemberId(res.data.member_pk);
        // Optionally store in localStorage for other components
        localStorage.setItem("memberId", res.data.member_pk);
      } catch (err) {
        console.error("Failed to fetch member PK:", err.response?.data || err.message);
      }
    };
    fetchMemberPK();
  }, []);

  useEffect(() => {
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
  const token = localStorage.getItem("access_token");
  for (const item of cartItems) {
    const purchaseData = {
      product: item.product_id || item.id,
      quantity: item.quantity,
      total_price: (item.price * item.quantity).toFixed(2),
    };
    // Only add member if logged in
    if (memberId) {
      purchaseData.member = memberId;
    }
    try {
      await api.post(
        "purchases/",
        purchaseData,
        token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      );
    } catch (err) {
      console.error("Failed to create purchase:", err.response?.data || err.message);
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
    setTransactionId(txnId);
    setShowHisabPay(false);
    setShowPaymentSuccess(true);

    // Save purchases to backend
    await createPurchase(cart);

    // Create notifications for each purchased product
    const token = localStorage.getItem("token");
    for (const item of cart) {
      const message = `${item.name} sold out for ${parseFloat(item.price * item.quantity).toFixed(2)} AFN`;
      try {
        await api.post(
          `create-notification/`,
          { message },
          token ? { headers: { Authorization: `Bearer ${token}` } } : {}
        );
      } catch (err) {
        console.error("Failed to create notification:", err.response?.data || err.message);
      }
    }

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
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-auto z-10 overflow-y-auto max-h-[90vh] transform transition-transform duration-300 scale-100">
          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/2 p-6 bg-gray-50 flex items-center justify-center">
              {selectedProduct.image_url ? (
                <img
                  src={selectedProduct.image_url}
                  alt={selectedProduct.name}
                  className="max-h-80 object-contain"
                />
              ) : selectedProduct.image ? (
                <img
                  src={`http://127.0.0.1:8000${selectedProduct.image}`}
                  alt={selectedProduct.name}
                  className="max-h-80 object-contain"
                />
              ) : (
                <div className="h-80 w-full bg-gray-200 flex items-center justify-center text-gray-500">
                  No image available
                </div>
              )}
            </div>
            <div className="md:w-1/2 p-6">
              <div className="flex justify-between items-start">
                <h3 className="text-2xl font-bold text-gray-800">{selectedProduct.name}</h3>
                <button onClick={closeQuickView} className="text-gray-400 hover:text-gray-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-4">
                <span className="text-xl font-bold text-gray-800">AFN {parseFloat(selectedProduct.price).toFixed(2)}</span>
                {selectedProduct.compare_at_price && (
                  <span className="ml-3 text-gray-500 line-through">AFN {parseFloat(selectedProduct.compare_at_price).toFixed(2)}</span>
                )}
              </div>
              {selectedProduct.description && (
                <p className="mt-4 text-gray-600">{selectedProduct.description}</p>
              )}
              {selectedProduct.category && (
                <div className="mt-6">
                  <span className="text-sm text-gray-500">Category:</span>
                  <span className="ml-2 text-sm bg-gray-100 text-gray-800 py-1 px-2 rounded">
                    {selectedProduct.category}
                  </span>
                </div>
              )}
              <div className="mt-6">
                <div className="flex items-center space-x-3">
                  <span className="text-gray-700">Quantity:</span>
                  <div className="flex items-center border border-gray-300 rounded">
                    <button
                      onClick={() => setQuantity(prev => Math.max(prev - 1, 1))}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600"
                    >-</button>
                    <span className="px-3 py-1">{quantity}</span>
                    <button
                      onClick={() => setQuantity(prev => prev + 1)}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600"
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
      <div className={`fixed inset-y-0 right-0 w-full max-w-full sm:max-w-md md:w-96 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${showCart ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-3 sm:p-4 border-b flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-semibold">Your Cart ({cart.length})</h3>
            <button onClick={() => setShowCart(false)} className="text-gray-400 hover:text-gray-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
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
                  <div key={item.product_id} className="flex border-b pb-4">
                    <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" />
                      ) : item.image ? (
                        <img src={`http://127.0.0.1:8000${item.image}`} alt={item.name} className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <span className="text-xs text-gray-500">No image</span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <h4 className="text-sm font-medium">{item.name}</h4>
                      <p className="text-sm text-gray-500">AFN {parseFloat(item.price).toFixed(2)}</p>
                      <div className="flex items-center mt-2">
                        <button
                          onClick={() => updateCartQuantity(item.product_id, item.quantity - 1)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="mx-2 text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.product_id, item.quantity + 1)}
                          className="text-gray-500 hover:text-gray-700"
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
                        className="text-gray-400 hover:text-red-500"
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
            <div className="border-t p-4">
              <div className="flex justify-between mb-4">
                <span className="font-medium">Subtotal</span>
                <span className="font-bold">AFN {cartTotal.toFixed(2)}</span>
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
                className="w-full mt-2 border border-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-50 transition duration-300"
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
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-500 mb-4"></div>
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <section id="products" className="py-12 bg-white">
        <div className="container mx-auto py-8 px-4">
          <h2 className="text-4xl font-bold text-center mb-12">
            OUR <span className="text-yellow-500">SHOP</span>
          </h2>
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-md">
            <div className="flex items-center">
              <svg className="h-6 w-6 text-red-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700">{error}</p>
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
    <section id="products" className="py-8 sm:py-12 bg-white">
      <div className="container mx-auto py-4 sm:py-8 px-2 sm:px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <h2 className="text-4xl font-bold">
            OUR <span className="text-yellow-500">SHOP</span>
          </h2>
          
          <div className="mt-4 md:mt-0 flex items-center space-x-4">
            {/* Search input */}
            <div className="relative hidden md:block w-64">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2 pl-9 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none"
              />
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            {/* Sort dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none text-sm"
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
              className="relative p-2 text-gray-600 hover:text-yellow-500 transition"
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
        <div className="md:hidden mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        
        {/* Category filters - horizontal scrollable for mobile */}
        <div className="mb-8 overflow-x-auto pb-4">
          <div className="flex space-x-2 min-w-max">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-md text-sm ${
                  selectedCategory === category
                    ? 'bg-yellow-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
        
        {filteredProducts.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your search or filter to find what you're looking for.</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div 
                key={product.product_id} 
                className="bg-white p-4 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className="mb-4 h-48 bg-gray-50 flex items-center justify-center overflow-hidden rounded-lg relative group">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name} 
                      className="h-48 object-contain transition-transform duration-500 ease-in-out group-hover:scale-110"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/150?text=No+Image';
                      }}
                    />
                  ) : product.image ? (
                    <img 
                      src={`http://127.0.0.1:8000${product.image}`} 
                      alt={product.name} 
                      className="h-48 object-contain transition-transform duration-500 ease-in-out group-hover:scale-110"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/150?text=No+Image';
                      }}
                    />
                  ) : (
                    <div className="h-48 w-full bg-gray-200 flex items-center justify-center text-gray-500">
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
                
                <h3 className="text-lg font-semibold mb-1 text-gray-800 truncate">{product.name}</h3>
                
                {product.category && (
                  <div className="mb-2">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {product.category}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-xl font-bold text-gray-800">
                      AFN {parseFloat(product.price).toFixed(2)}
                    </span>
                    {product.compare_at_price && (
                      <span className="ml-2 text-sm text-gray-500 line-through">
                        AFN {parseFloat(product.compare_at_price).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                
                <button 
                  onClick={() => addToCart(product)}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-md transition duration-300 flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
