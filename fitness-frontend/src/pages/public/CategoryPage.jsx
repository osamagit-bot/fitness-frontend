import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { staticProducts } from '../../utils/staticData';
import HisabPayCheckout from '../../components/payment/HisabPayCheckout';
import PaymentSuccess from '../../components/payment/PaymentSuccess';

const CategoryPage = () => {
  const { category } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { classes } = useTheme();
  
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showQuickView, setShowQuickView] = useState(false);
  const [showHisabPay, setShowHisabPay] = useState(false);
  const [transactionId, setTransactionId] = useState(null);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [memberId, setMemberId] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  // Category information mapping
  const categoryInfo = {
    'supplements': {
      title: 'Supplements',
      description: 'High-quality nutritional supplements to support your fitness goals and overall health.',
      icon: '💊',
      benefits: ['Muscle Building', 'Recovery', 'Performance', 'Health Support']
    },
    'equipment': {
      title: 'Equipment',
      description: 'Premium fitness equipment and accessories for effective workouts at home or gym.',
      icon: '🏋️',
      benefits: ['Strength Training', 'Flexibility', 'Durability', 'Versatile']
    }
  };

  const currentCategory = categoryInfo[category] || {
    title: 'Category Not Found',
    description: 'The requested category could not be found.',
    icon: '❓',
    benefits: ['Not Available']
  };

  useEffect(() => {
    fetchProducts();
  }, [category]);

  useEffect(() => {
    setIsVisible(false);
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('products/');
      const productsData = response.data.results || response.data;
      const productsArray = Array.isArray(productsData) ? productsData : [];
      setProducts(productsArray);
      
      // Filter products by category
      const filtered = productsArray.filter(product => {
        const productCategory = product.category?.toLowerCase().replace(/\s+/g, '-');
        const categoryMatch = productCategory === category;
        const nameMatch = product.name?.toLowerCase().includes(currentCategory.title.toLowerCase());
        return categoryMatch || nameMatch;
      });
      setFilteredProducts(filtered);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to load products');
      // Fallback to static data
      const filtered = staticProducts.filter(product => 
        product.category?.toLowerCase().replace(/\s+/g, '-') === category ||
        product.name?.toLowerCase().includes(currentCategory.title.toLowerCase())
      );
      setFilteredProducts(filtered);
    } finally {
      setIsLoading(false);
    }
  };

  // Cart functionality
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

  // Purchase functionality
  const createPurchase = async (cartItems) => {
    const token = localStorage.getItem("access_token") || localStorage.getItem("member_access_token");
    
    for (const item of cartItems) {
      const purchaseData = {
        product: item.product_id || item.id,
        quantity: parseInt(item.quantity),
        total_price: parseFloat((item.price * item.quantity).toFixed(2)),
        date: new Date().toISOString(),
      };
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

  const handleCheckout = () => {
    setShowCart(false);
    setShowHisabPay(true);
  };

  const handlePaymentSuccess = async (txnId) => {
    setTransactionId(txnId);
    setShowHisabPay(false);
    setShowPaymentSuccess(true);
    await createPurchase(cart);
    window.dispatchEvent(new CustomEvent('purchaseCompleted', { detail: { cart } }));
    setCart([]);
  };

  const handlePaymentFailure = (errorMessage) => {
    console.error('Payment failed:', errorMessage);
  };

  const handleContinueShopping = () => {
    setShowPaymentSuccess(false);
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen ${classes.bg.primary} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-400 border-t-transparent mx-auto mb-4"></div>
          <p className={`${classes.text.secondary} text-lg`}>Loading {currentCategory.title}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${classes.bg.primary} pt-28 pb-12`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className={`flex mb-8 transform transition-all duration-1000 ease-out ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`} aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <button
                onClick={() => navigate('/')}
                className={`${classes.text.secondary} hover:text-yellow-500 transition-colors`}
              >
                Home
              </button>
            </li>
            <li>
              <div className="flex items-center">
                <svg className={`w-6 h-6 ${classes.text.tertiary}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                </svg>
                <span className={`ml-1 md:ml-2 ${classes.text.primary} font-medium`}>
                  {currentCategory.title}
                </span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Cart Summary Bar */}
        {cart.length > 0 && (
          <div className={`${classes.bg.tertiary} rounded-lg p-4 mb-6 border border-yellow-500/30`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className={`${classes.text.primary} font-medium`}>
                  {cart.length} item{cart.length !== 1 ? 's' : ''} in cart - AFN {cartTotal.toFixed(2)}
                </span>
              </div>
              <button
                onClick={() => setShowCart(true)}
                className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-lg font-semibold transition duration-300"
              >
                View Cart
              </button>
            </div>
          </div>
        )}

        {/* Category Header */}
        <div className={`${classes.bg.secondary} rounded-2xl p-6 md:p-8 mb-8 border-2 border-yellow-500/20 transform transition-all duration-1000 ease-out ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`} style={{ transitionDelay: '200ms' }}>
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
            <div className="flex items-center flex-1">
              <div className="bg-yellow-500 p-4 rounded-full mr-6">
                <span className="text-4xl md:text-5xl">{currentCategory.icon}</span>
              </div>
              <div>
                <h1 className={`text-3xl md:text-4xl lg:text-5xl font-bold ${classes.text.primary} mb-2`}>
                  {currentCategory.title}
                </h1>
                <p className={`text-base md:text-lg ${classes.text.secondary} max-w-3xl leading-relaxed`}>
                  {currentCategory.description}
                </p>
              </div>
            </div>
            
            <div className={`${classes.bg.tertiary} rounded-xl p-4 min-w-[280px]`}>
              <h3 className={`font-bold ${classes.text.primary} mb-3 flex items-center`}>
                <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                Key Benefits
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {currentCategory.benefits.map((benefit, index) => (
                  <div key={index} className={`text-xs ${classes.text.secondary} bg-yellow-500/10 px-2 py-1 rounded-full text-center`}>
                    {benefit}
                  </div>
                ))}
              </div>
              {filteredProducts.length > 0 && (
                <div className={`mt-3 pt-3 border-t ${classes.border.primary} flex items-center text-sm ${classes.text.tertiary}`}>
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                  {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Notice */}
        {error && (
          <div className={`mb-8 ${classes.bg.tertiary} border-l-4 border-yellow-400 p-4 rounded-r-lg`}>
            <div className="flex items-center">
              <svg className="h-6 w-6 text-yellow-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <p className={`${classes.text.primary} font-semibold`}>Notice</p>
                <p className={`${classes.text.secondary}`}>Showing sample products due to: {error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {filteredProducts.map((product, index) => (
              <div 
                key={product.product_id || product.id} 
                className={`group ${classes.card.primary} rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 border ${classes.border.primary} ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
                }`}
                style={{ transitionDelay: `${index * 100 + 400}ms` }}
              >
                <div className={`relative h-64 md:h-72 ${classes.bg.secondary} overflow-hidden`}>
                  {product.image_url || product.image ? (
                    <img 
                      src={product.image_url || product.image}
                      alt={product.name} 
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/images/whey.jpg';
                      }}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center bg-gradient-to-br from-yellow-100 to-yellow-200">
                      <div className="text-center">
                        <span className="text-6xl text-yellow-600 mb-4 block">📦</span>
                        <p className="text-yellow-700 font-semibold">No Image Available</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  {/* Category Badge */}
                  <div className="absolute top-4 left-4">
                    <span className="bg-black text-yellow-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                      {product.category || currentCategory.title}
                    </span>
                  </div>
                  
                  {/* Sale Badge */}
                  {product.compare_at_price && (
                    <div className="absolute top-4 right-4">
                      <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                        SALE
                      </span>
                    </div>
                  )}
                  
                  {/* Quick View Button */}
                  <div className="absolute bottom-4 left-4 right-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 opacity-0 group-hover:opacity-100">
                    <button 
                      onClick={() => openQuickView(product)}
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-black py-2 px-4 rounded-lg font-semibold transition-colors"
                    >
                      Quick View
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="mb-4">
                    <h3 className={`text-xl font-bold ${classes.text.primary} mb-2 group-hover:text-yellow-600 transition-colors line-clamp-2`}>
                      {product.name}
                    </h3>
                    
                    {product.description && (
                      <p className={`${classes.text.secondary} text-sm leading-relaxed line-clamp-3 mb-3`}>
                        {product.description}
                      </p>
                    )}
                  </div>
                  
                  {/* Product Features */}
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1 mb-3">
                      {['Premium Quality', 'Lab Tested', 'Fast Delivery'].map((feature, index) => (
                        <span key={index} className={`text-xs ${classes.text.tertiary} bg-yellow-500/10 px-2 py-1 rounded-full`}>
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Price Section */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className={`text-2xl font-bold ${classes.text.primary}`}>
                        AFN {parseFloat(product.price || 0).toFixed(2)}
                      </span>
                      {product.compare_at_price && (
                        <div>
                          <span className={`text-sm ${classes.text.tertiary} line-through`}>
                            AFN {parseFloat(product.compare_at_price).toFixed(2)}
                          </span>
                          <span className="ml-2 text-sm text-red-500 font-semibold">
                            Save {Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                    <div className={`text-right text-sm ${classes.text.secondary}`}>
                      <div className="flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                        In Stock
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button 
                      onClick={() => addToCart(product)}
                      className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black py-3 rounded-lg transition duration-300 font-semibold flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Add to Cart
                    </button>
                    <button className={`px-3 py-3 border-2 border-yellow-500 ${classes.text.primary} hover:bg-yellow-500 hover:text-black rounded-lg transition duration-300`}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`${classes.bg.secondary} rounded-2xl p-12 text-center border-2 border-dashed ${classes.border.primary} transform transition-all duration-1000 ease-out ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`} style={{ transitionDelay: '400ms' }}>
            <div className="text-8xl mb-6 opacity-50">📦</div>
            <h3 className={`text-3xl font-bold ${classes.text.primary} mb-4`}>
              No {currentCategory.title} Products Found
            </h3>
            <p className={`${classes.text.secondary} mb-8 max-w-md mx-auto text-lg`}>
              We're currently updating our {currentCategory.title.toLowerCase()} collection. Check back soon for amazing products!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/')}
                className="bg-yellow-500 hover:bg-yellow-600 text-black px-8 py-3 rounded-lg font-semibold transition duration-300 flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Browse All Products
              </button>
              <button
                onClick={() => window.location.reload()}
                className={`border-2 border-yellow-500 ${classes.text.primary} hover:bg-yellow-500 hover:text-black px-8 py-3 rounded-lg font-semibold transition duration-300 flex items-center justify-center`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Page
              </button>
            </div>
          </div>
        )}

        {/* Cart Icon */}
        <div className="fixed bottom-6 right-6 z-40">
          <button 
            onClick={() => setShowCart(true)}
            className={`relative p-4 bg-yellow-500 hover:bg-yellow-600 text-black rounded-full shadow-lg transition-all duration-300 ${cart.length > 0 ? 'animate-pulse' : ''}`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold">
                {cart.length}
              </span>
            )}
          </button>
        </div>

        {/* Quick View Modal */}
        {showQuickView && selectedProduct && (
          <div className={`fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 ${showQuickView ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-300`} style={{paddingTop: '2rem'}}>
            <div className="absolute inset-0 bg-black bg-opacity-75" onClick={closeQuickView}></div>
            <div className={`${classes.bg.card} rounded-lg shadow-xl max-w-2xl w-full mx-auto z-10 overflow-y-auto max-h-[85vh] transform transition-transform duration-300`}>
              <div className="flex flex-col md:flex-row">
                <div className={`md:w-1/2 p-4 ${classes.bg.secondary} flex items-center justify-center`}>
                  <img
                    src={selectedProduct.image_url || selectedProduct.image}
                    alt={selectedProduct.name}
                    className="max-h-60 object-contain"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/images/whey.jpg';
                    }}
                  />
                </div>
                <div className="md:w-1/2 p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className={`text-xl font-bold ${classes.text.primary}`}>{selectedProduct.name}</h3>
                    <button onClick={closeQuickView} className={`${classes.text.tertiary} hover:${classes.text.secondary}`}>
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="mb-4">
                    <span className={`text-2xl font-bold ${classes.text.primary}`}>AFN {parseFloat(selectedProduct.price).toFixed(2)}</span>
                    {selectedProduct.compare_at_price && (
                      <span className={`ml-3 ${classes.text.tertiary} line-through`}>AFN {parseFloat(selectedProduct.compare_at_price).toFixed(2)}</span>
                    )}
                  </div>
                  {selectedProduct.description && (
                    <p className={`${classes.text.secondary} mb-4`}>{selectedProduct.description}</p>
                  )}
                  <button
                    onClick={() => {
                      addToCart(selectedProduct);
                      closeQuickView();
                    }}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-black py-3 px-4 rounded-lg transition duration-300 font-semibold"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Shopping Cart Sidebar */}
        {showCart && (
          <div className={`fixed inset-y-0 right-0 w-full max-w-sm ${classes.bg.card} shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${showCart ? 'translate-x-0' : 'translate-x-full'}`}>
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
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map(item => (
                      <div key={item.product_id} className={`flex border-b ${classes.border.primary} pb-4`}>
                        <div className={`w-16 h-16 flex-shrink-0 ${classes.bg.tertiary} rounded overflow-hidden`}>
                          <img src={item.image_url || item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="ml-3 flex-1">
                          <h4 className={`text-sm font-medium ${classes.text.primary}`}>{item.name}</h4>
                          <p className={`text-xs ${classes.text.tertiary}`}>AFN {parseFloat(item.price).toFixed(2)}</p>
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
                        <button
                          onClick={() => removeFromCart(item.product_id)}
                          className={`${classes.text.tertiary} hover:text-red-500 ml-2`}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {cart.length > 0 && (
                <div className={`border-t ${classes.border.primary} p-4`}>
                  <div className="flex justify-between mb-4">
                    <span className={`font-medium ${classes.text.primary}`}>Total</span>
                    <span className={`font-bold ${classes.text.primary}`}>AFN {cartTotal.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={handleCheckout}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-black py-3 rounded-lg transition duration-300 font-semibold"
                  >
                    Pay with Hisab
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment Modals */}
        <HisabPayCheckout 
          isOpen={showHisabPay}
          onClose={() => setShowHisabPay(false)}
          cartItems={cart}
          total={cartTotal}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentFailure={handlePaymentFailure}
        />
        
        {showPaymentSuccess && (
          <PaymentSuccess
            transactionId={transactionId}
            onClose={handleContinueShopping}
          />
        )}
      </div>
    </div>
  );
};

export default CategoryPage;