// SubPages/ProductsPage.jsx
import { useEffect, useState } from "react";
import AppToastContainer from "../../components/ui/ToastContainer";
import api from "../../utils/api";
import { showToast } from "../../utils/toast";

// Icons (using inline SVGs)
const PlusIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
    />
  </svg>
);

const RefreshIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

const TrashIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const ShoppingBagIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 8a2 2 0 01-2 2H8a2 2 0 01-2-2L5 9z"
    />
  </svg>
);

const PhotoIcon = () => (
  <svg
    className="w-8 h-8"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const ChartIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    />
  </svg>
);
function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [soldProducts, setSoldProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [soldLoading, setSoldLoading] = useState(false);
  const [error, setError] = useState("");
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    description: "",
    image: null,
  });
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchSoldProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("admin_access_token");
      const response = await api.get("products/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const productsData = response.data.results || response.data;
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (error) {
      console.error("Error fetching products:", error);
      setError(
        error.response
          ? `Error ${error.response.status}: ${JSON.stringify(
              error.response.data
            )}`
          : error.request
          ? "Network error: Could not connect to the server"
          : `Error: ${error.message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSoldProducts = async () => {
    setSoldLoading(true);
    try {
      const token = localStorage.getItem("admin_access_token");
      const response = await api.get("purchases/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const soldData = response.data.results || response.data;
      setSoldProducts(Array.isArray(soldData) ? soldData : []);
    } catch (error) {
      console.error("Error fetching sold products:", error);
    } finally {
      setSoldLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct({ ...newProduct, [name]: value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewProduct({ ...newProduct, image: file });
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("admin_access_token");
      const formData = new FormData();
      formData.append("name", newProduct.name);
      formData.append("price", newProduct.price);
      if (newProduct.description)
        formData.append("description", newProduct.description);
      if (newProduct.image) formData.append("image", newProduct.image);

      await api.post("products/", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setNewProduct({ name: "", price: "", description: "", image: null });
      setImagePreview(null);
      fetchProducts();
      showToast.success("Product added successfully!");
    } catch (error) {
      console.error("Error adding product:", error);
      setError(
        error.response
          ? `Error ${error.response.status}: ${JSON.stringify(
              error.response.data
            )}`
          : error.request
          ? "Network error: Could not connect to the server"
          : `Error: ${error.message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProduct = async (productId) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        const token = localStorage.getItem("admin_access_token");
        await api.delete(`products/${productId}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProducts(
          products.filter((product) => product.product_id !== productId)
        );
        showToast.success("Product deleted successfully!");
      } catch (error) {
        console.error("Error deleting product:", error);
        showToast.error(
          error.response
            ? `Failed to delete product: ${
                error.response.data.detail ||
                JSON.stringify(error.response.data)
              }`
            : "Failed to delete product: Network error"
        );
      }
    }
  };

  return (
    <>
      <div
        id="products"
        className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 p-2 md:p-6"
      >
        {/* Header Section */}
        <div className="bg-black/30 rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-700 p-3 rounded-lg">
              <ShoppingBagIcon className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-100">
                Products Management
              </h1>
              <p className="text-gray-300">
                Manage your fitness products and track sales
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-amber-600 rounded-full"></div>
              <span>{products.length} Products</span>
            </span>
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>{soldProducts.length} Sales</span>
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-red-400 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
                <div className="mt-4">
                  <button
                    onClick={fetchProducts}
                    className="bg-red-100 px-4 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 transition-colors duration-200"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add New Product Form */}
        <div className="bg-black/20 rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-2 rounded-lg">
              <PlusIcon className="text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-200">
              Add New Product
            </h2>
          </div>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Product Name
              </label>
              <input
                type="text"
                name="name"
                value={newProduct.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border text-white bg-gray-800 border-gray-300 rounded-lg focus:outline-none transition-all duration-200"
                placeholder="Enter product name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Price ($)
              </label>
              <input
                type="number"
                name="price"
                step="0.01"
                value={newProduct.price}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border text-white bg-gray-800 border-gray-300 rounded-lg focus:outline-none transition-all duration-200"
                placeholder="0.00"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={newProduct.description}
                onChange={handleInputChange}
                rows="4"
                className="w-full px-4 py-3 border text-white bg-gray-800 border-gray-300 rounded-lg focus:outline-none transition-all duration-200"
                placeholder="Enter product description"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Product Image
              </label>
              <div className="mt-1 flex justify-center bg-gray-800 px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-yellow-500 transition-colors duration-200">
                <div className="space-y-1 text-center">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="mx-auto h-32 w-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setNewProduct({ ...newProduct, image: null });
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <PhotoIcon className="mx-auto text-gray-400" />
                      <div className="flex text-sm text-gray-300">
                        <label className="relative cursor-pointer rounded-md font-medium text-yellow-600 hover:text-yellow-700 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-yellow-500">
                          <span>Upload a file</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="sr-only"
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-300">
                        PNG, JPG, GIF up to 10MB
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-700 text-white py-3 px-6 rounded-lg hover:from-yellow-600 hover:to-yellow-800 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Adding Product...</span>
                  </>
                ) : (
                  <>
                    <PlusIcon />
                    <span>Add Product</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Products List */}
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-2 rounded-lg">
                <ShoppingBagIcon className="text-white w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Products List
                </h2>
                <p className="text-sm text-gray-300">
                  {products.length} products available
                </p>
              </div>
            </div>
            <button
              onClick={fetchProducts}
              className="flex items-center space-x-2 bg-gradient-to-r from-yellow-500 to-yellow-700 text-white px-4 py-2 rounded-lg hover:from-yellow-600 hover:to-yellow-800 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200"
              disabled={isLoading}
            >
              <RefreshIcon />
              <span>{isLoading ? "Loading..." : "Refresh"}</span>
            </button>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-500 border-t-transparent"></div>
              <p className="mt-4 text-gray-300">Loading products...</p>
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <div
                  key={product.product_id}
                  className="bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-700"
                >
                  <div className="relative overflow-hidden rounded-t-xl">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-48 object-cover rounded-t-xl transition-transform duration-300 hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-500 rounded-t-xl">
                        <PhotoIcon />
                        <span className="ml-2 text-sm">No image</span>
                      </div>
                    )}
                    <div className="absolute top-4 right-4">
                      <button
                        onClick={() => deleteProduct(product.product_id)}
                        className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transform hover:scale-110 transition-all duration-200"
                        title="Delete Product"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-lg text-white mb-2 truncate">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-yellow-400">
                        ${parseFloat(product.price).toFixed(2)}
                      </span>
                      <div className="bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-medium">
                        In Stock
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <ShoppingBagIcon className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                No products found
              </h3>
              <p className="text-gray-300 mb-6">
                Start by adding your first product to the store.
              </p>
              <button
                onClick={() =>
                  document.querySelector('input[name="name"]').focus()
                }
                className="bg-gradient-to-r from-yellow-500 to-yellow-700 text-white px-6 py-2 rounded-lg hover:from-yellow-600 hover:to-yellow-800 transition-all duration-200"
              >
                Add Your First Product
              </button>
            </div>
          )}
        </div>

        {/* Sold Products Section */}
        <div className="bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-2 rounded-lg">
              <ChartIcon className="text-white w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                Sales History
              </h2>
              <p className="text-sm text-gray-300">
                {soldProducts.length} transactions recorded
              </p>
            </div>
          </div>

          {soldLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
              <p className="mt-4 text-gray-300">Loading sales data...</p>
            </div>
          ) : soldProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider bg-gray-700 rounded-tl-lg">
                      #
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider bg-gray-700">
                      Date & Time
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider bg-gray-700">
                      Product
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider bg-gray-700 rounded-tr-lg">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-600">
                  {soldProducts.map((sold, index) => (
                    <tr
                      key={sold.id || index}
                      className="hover:bg-gray-700 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-600 rounded-full text-sm font-medium">
                          {index + 1}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">
                          {new Date(sold.date).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-300">
                          {new Date(sold.date).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-white">
                          {sold.product_name ||
                            (sold.product && sold.product.name)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          $
                          {parseFloat(sold.total_price || sold.price).toFixed(
                            2
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Sales Summary */}
              <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {soldProducts.length}
                    </div>
                    <div className="text-sm text-gray-600">Total Sales</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      $
                      {soldProducts
                        .reduce(
                          (sum, sale) =>
                            sum + parseFloat(sale.total_price || sale.price),
                          0
                        )
                        .toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">Total Revenue</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      $
                      {soldProducts.length > 0
                        ? (
                            soldProducts.reduce(
                              (sum, sale) =>
                                sum +
                                parseFloat(sale.total_price || sale.price),
                              0
                            ) / soldProducts.length
                          ).toFixed(2)
                        : "0.00"}
                    </div>
                    <div className="text-sm text-gray-600">Average Sale</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <ChartIcon className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                No sales recorded yet
              </h3>
              <p className="text-gray-300">
                Sales data will appear here once customers start purchasing
                products.
              </p>
            </div>
          )}
        </div>
      </div>
      <AppToastContainer />
    </>
  );
}

export default ProductsPage;
