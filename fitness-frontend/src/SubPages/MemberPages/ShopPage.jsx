import { useEffect, useState } from 'react';
import axios from 'axios';
import HisabPayCheckout from '../../components/HisabPayCheckout';
import PaymentSuccess from '../../components/PaymentSuccess';
import { motion, AnimatePresence } from 'framer-motion';

function ShopPage() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showHisabPay, setShowHisabPay] = useState(false);
  const [transactionId, setTransactionId] = useState(null);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cartMessage, setCartMessage] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showQuickView, setShowQuickView] = useState(false);

  // Use userId as the Member PK (from your login state)
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  console.log("Token being sent:", token);
  console.log("userId being sent:", userId);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get('http://127.0.0.1:8000/api/products/');
        setProducts(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        setError('Failed to load products. Please try again later.');
      }
      setLoading(false);
    };
    fetchProducts();
  }, []);

  // Fetch purchase history for this member
  const fetchPurchaseHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await axios.get(
        `http://127.0.0.1:8000/api/purchases/?memberID=${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Purchase history response:", response.data);
      setPurchaseHistory(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setPurchaseHistory([]);
      console.error("Error fetching purchase history:", err);
    }
    setHistoryLoading(false);
  };

  useEffect(() => {
    if (userId) fetchPurchaseHistory();
    // eslint-disable-next-line
  }, [userId]);

  // Add to cart
  const addToCart = (product, quantity = 1) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === product.id);
      if (existing) {
        return prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevCart, { product, quantity }];
    });
    setShowCart(true);
    setTimeout(() => setShowCart(false), 2000);
  };

  // Remove from cart
  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  // Update quantity in cart
  const updateCartQuantity = (productId, quantity) => {
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity: Math.max(1, quantity) }
          : item
      )
    );
  };

  // Cart total
  const cartTotal = cart.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0
  );

  // Checkout
  const handleCheckout = () => {
    setShowCart(false);
    setShowHisabPay(true);
  };

  // Payment success
  const handlePaymentSuccess = async (txnId) => {
    setTransactionId(txnId);
    setShowHisabPay(false);
    setShowPaymentSuccess(true);

    // Save each purchase to backend
    try {
      for (const item of cart) {
        if (!item.product || !item.product.id) {
          console.error("Cart item missing product or product.id", item);
          continue;
        }
        await axios.post(
          'http://127.0.0.1:8000/api/purchases/',
          {
            member: userId, // Use the correct PK
            product: item.product.id,
            quantity: item.quantity,
            total_price: Number(item.product.price) * item.quantity,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      setCart([]);
      fetchPurchaseHistory();
    } catch (err) {
      setError('Failed to save purchase. Please try again.');
      console.error(err);
    }
  };

  // Payment failure
  const handlePaymentFailure = (errorMessage) => {
    setShowHisabPay(false);
    setCartMessage('Payment failed. Please try again.');
  };

  // Continue shopping after payment
  const handleContinueShopping = () => {
    setShowPaymentSuccess(false);
  };

  // Quick View Modal (optional)
  const openQuickView = (product) => {
    setSelectedProduct(product);
    setShowQuickView(true);
  };
  const closeQuickView = () => {
    setShowQuickView(false);
    setTimeout(() => setSelectedProduct(null), 300);
  };

  return (
    <motion.div
      className="container mx-auto px-4 py-8 max-w-6xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-blue-900 mb-2">Shop</h1>
        <p className="text-gray-600">Browse and purchase gym products and accessories.</p>
      </div>

      {/* Cart Button */}
      <div className="flex justify-end mb-4">
        <button
          className="relative px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          onClick={() => setShowCart(true)}
        >
          Cart
          {cart.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full px-2 text-xs">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="text-center text-red-500">{error}</div>
      ) : products.length === 0 ? (
        <div className="text-center text-gray-500">No products available at the moment.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          <AnimatePresence>
            {products.map((product, idx) => (
              <motion.div
                key={product.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col hover:shadow-2xl transition-shadow"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ delay: 0.05 * idx }}
              >
                <div className="relative group">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <div className="h-48 w-full bg-blue-100 flex items-center justify-center text-blue-400 text-5xl">
                      <span role="img" aria-label="product">🛒</span>
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={() => openQuickView(product)}
                      className="bg-white text-gray-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-500 hover:text-white transition-colors"
                    >
                      Quick View
                    </button>
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h2 className="text-lg font-semibold text-blue-800 mb-2">{product.name}</h2>
                  <p className="text-gray-600 mb-4 flex-1">{product.description || "No description."}</p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-xl font-bold text-blue-700">${product.price}</span>
                    <button
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                      onClick={() => addToCart(product, 1)}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Cart Modal */}
      <AnimatePresence>
        {showCart && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full relative"
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 40 }}
            >
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl"
                onClick={() => setShowCart(false)}
                aria-label="Close"
              >
                &times;
              </button>
              <h2 className="text-xl font-bold mb-4 text-blue-800">Your Cart</h2>
              {cart.length === 0 ? (
                <div className="text-center text-gray-500">Your cart is empty.</div>
              ) : (
                <>
                  <div className="space-y-4 max-h-60 overflow-y-auto">
                    {cart.map((item, idx) => (
                      <div key={item.product.id + '-' + idx} className="flex items-center justify-between border-b pb-2">
                        <div>
                          <div className="font-semibold">{item.product.name}</div>
                          <div className="text-sm text-gray-500">${item.product.price} x</div>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => updateCartQuantity(item.product.id, Number(e.target.value))}
                            className="w-14 px-2 py-1 border rounded mr-2"
                          />
                          <button
                            className="text-red-500 hover:text-red-700"
                            onClick={() => removeFromCart(item.product.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-between items-center">
                    <span className="font-bold text-blue-700">Total:</span>
                    <span className="font-bold text-lg text-blue-900">${cartTotal}</span>
                  </div>
                  <button
                    className="w-full py-2 mt-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    onClick={handleCheckout}
                  >
                    Pay with HisabPay
                  </button>
                  {cartMessage && (
                    <div className="mt-4 text-green-600 text-center font-semibold">{cartMessage}</div>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HisabPay Checkout Modal */}
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

      {/* Quick View Modal */}
      <AnimatePresence>
        {showQuickView && selectedProduct && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-lg shadow-xl p-8 max-w-lg w-full relative"
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 40 }}
            >
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl"
                onClick={closeQuickView}
                aria-label="Close"
              >
                &times;
              </button>
              <h2 className="text-xl font-bold mb-2 text-blue-800">{selectedProduct.name}</h2>
              {selectedProduct.image && (
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  className="h-32 w-full object-cover rounded mb-4"
                />
              )}
              <p className="mb-2 text-gray-700">{selectedProduct.description}</p>
              <div className="mb-4">
                <span className="font-semibold text-blue-700 text-lg">${selectedProduct.price}</span>
              </div>
              <button
                className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                onClick={() => {
                  addToCart(selectedProduct, 1);
                  closeQuickView();
                }}
              >
                Add to Cart
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Purchase History Table */}
      <motion.div
        className="mt-12 bg-white rounded-xl shadow p-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xl font-bold text-blue-900 mb-4">My Purchase History</h2>
        {historyLoading ? (
          <div className="text-center text-gray-500">Loading...</div>
        ) : purchaseHistory.length === 0 ? (
          <div className="text-center text-gray-500">You have not purchased any products yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-blue-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-blue-700 uppercase">Product</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-blue-700 uppercase">Quantity</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-blue-700 uppercase">Total Price</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-blue-700 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {purchaseHistory.map((purchase) => (
                  <tr key={purchase.id}>
                    <td className="px-4 py-2">{purchase.product_name || purchase.product?.name}</td>
                    <td className="px-4 py-2">{purchase.quantity}</td>
                    <td className="px-4 py-2">${purchase.total_price}</td>
                    <td className="px-4 py-2">{new Date(purchase.date).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default ShopPage;