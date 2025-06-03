// SubPages/ProductsPage.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';

function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    description: '',
    image: null
  });
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('api.newdomain.com/api/products/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const productsData = response.data.results || response.data;
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError(
        error.response
          ? `Error ${error.response.status}: ${JSON.stringify(error.response.data)}`
          : error.request
          ? 'Network error: Could not connect to the server'
          : `Error: ${error.message}`
      );
    } finally {
      setIsLoading(false);
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
    setError('');
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('name', newProduct.name);
      formData.append('price', newProduct.price);
      if (newProduct.description) formData.append('description', newProduct.description);
      if (newProduct.image) formData.append('image', newProduct.image);

      await axios.post('api.newdomain.com/api/products/', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        }
      });

      setNewProduct({ name: '', price: '', description: '', image: null });
      setImagePreview(null);
      fetchProducts();
      alert('Product added successfully!');
    } catch (error) {
      console.error('Error adding product:', error);
      setError(
        error.response
          ? `Error ${error.response.status}: ${JSON.stringify(error.response.data)}`
          : error.request
          ? 'Network error: Could not connect to the server'
          : `Error: ${error.message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`api.newdomain.com/api/products/${productId}/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setProducts(products.filter(product => product.product_id !== productId));
        alert('Product deleted successfully!');
      } catch (error) {
        console.error('Error deleting product:', error);
        alert(
          error.response
            ? `Failed to delete product: ${error.response.data.detail || JSON.stringify(error.response.data)}`
            : 'Failed to delete product: Network error'
        );
      }
    }
  };

  return (
    <div id="products" className="p-2 md:p-4">
      <h1 className="text-xl md:text-2xl font-bold mb-4">Products Management</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={fetchProducts}
            className="mt-2 px-3 py-1 bg-red-200 rounded hover:bg-red-300 text-sm"
          >
            Try Again
          </button>
        </div>
      )}

      <div className="bg-gray-100 p-4 rounded-lg shadow-md mb-6">
        <h2 className="text-lg font-semibold mb-4">Add New Product</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Product Name</label>
            <input
              type="text"
              name="name"
              value={newProduct.name}
              onChange={handleInputChange}
              required
              className="mt-1 p-2 block w-full rounded-md border border-gray-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Price ($)</label>
            <input
              type="number"
              name="price"
              step="0.01"
              value={newProduct.price}
              onChange={handleInputChange}
              required
              className="mt-1 p-2 block w-full rounded-md border border-gray-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              name="description"
              value={newProduct.description}
              onChange={handleInputChange}
              rows="3"
              className="mt-1 p-2 block w-full rounded-md border border-gray-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="block text-sm text-gray-500"
            />
            {imagePreview && (
              <img src={imagePreview} alt="Preview" className="mt-2 h-20 w-20 object-cover rounded" />
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? 'Adding...' : 'Add Product'}
          </button>
        </form>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Products List</h2>
          <button
            onClick={fetchProducts}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Refresh List'}
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map(product => (
                    <tr key={product.product_id}>
                      <td className="px-6 py-4">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="h-20 w-20 object-contain" />
                        ) : (
                          <div className="h-20 w-20 bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
                            No image
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">{product.name}</td>
                      <td className="px-6 py-4">${parseFloat(product.price).toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => deleteProduct(product.product_id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-4">
              {products.map(product => (
                <div key={product.product_id} className="border rounded-lg p-4 shadow-sm">
                  <div className="flex flex-col items-center space-y-2">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="h-40 object-contain" />
                    ) : (
                      <div className="h-40 w-full bg-gray-200 flex items-center justify-center text-gray-500">No image</div>
                    )}
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="font-medium">${parseFloat(product.price).toFixed(2)}</p>
                    <button
                      onClick={() => deleteProduct(product.product_id)}
                      className="mt-2 w-full py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                    >
                      Delete Product
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center text-gray-500 py-6">No products found</div>
        )}
      </div>
    </div>
  );
}

export default ProductsPage;
