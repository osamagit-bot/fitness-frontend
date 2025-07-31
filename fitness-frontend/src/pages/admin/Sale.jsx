import { useEffect, useState } from "react";
import ConfirmModal from "../../components/ui/ConfirmModal";
import api from "../../utils/api";
import { getRelativeTime } from "../../utils/timeUtils";
import { formatDateTime } from "../../utils/dateUtils";

function Sale() {
  const [saleData, setSaleData] = useState({
    item: "",
    quantity: "",
    price: "",
    date: new Date().toISOString().split('T')[0]
  });
  
  const [salesList, setSalesList] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ total_sales: 0, total_quantity: 0, total_revenue: 0, total_profit: 0 });
  const [availableItems, setAvailableItems] = useState([]);
  const [unitPrice, setUnitPrice] = useState(0);
  const [error, setError] = useState("");
  const [deletedItems, setDeletedItems] = useState([]);
  const [showDeletedModal, setShowDeletedModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all"); // all, today, yesterday, specific
  const [selectedDate, setSelectedDate] = useState("");
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null, id: null, title: '', message: '' });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'item') {
      const selectedItem = availableItems.find(item => item.item === value);
      const itemUnitPrice = selectedItem ? parseFloat(selectedItem.price) : 0;
      setUnitPrice(itemUnitPrice);
      setError(""); // Clear any previous errors
      setSaleData(prev => ({
        ...prev,
        [name]: value,
        price: itemUnitPrice // Set default selling price to cost price
      }));
    } else if (name === 'quantity') {
      const quantityValue = parseInt(value) || 0;
      
      // Check if quantity exceeds available stock
      if (saleData.item) {
        const selectedItem = availableItems.find(item => item.item === saleData.item);
        if (selectedItem && quantityValue > selectedItem.quantity) {
          setError(`Only ${selectedItem.quantity} units available for ${saleData.item}`);
        } else {
          setError(""); // Clear error if quantity is valid
        }
      }
      
      setSaleData(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setSaleData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  useEffect(() => {
    fetchSalesData();
    fetchAvailableItems();
    fetchDeletedItems();
    fetchSummary();
  }, []);

  const fetchAvailableItems = async () => {
    try {
      console.log('Fetching available items...'); // Debug log
      const response = await api.get('stock/stockin/available_stock/');
      const items = response.data.results || response.data;
      console.log('Available items fetched:', items); // Debug log
      setAvailableItems(items);
    } catch (error) {
      console.error('Error fetching available items:', error);
    }
  };

  const fetchSalesData = async () => {
    try {
      const response = await api.get('stock/stockout/');
      const salesData = response.data.results || response.data;
      console.log('Sales data:', salesData); // Debug log
      setSalesList(salesData);
    } catch (error) {
      console.error('Error fetching sales data:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await api.get('stock/stockout/summary/');
      console.log('Summary response:', response.data); // Debug log
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchSummaryWithoutRevenue = async () => {
    try {
      const response = await api.get('stock/stockout/summary/');
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    // Validate quantity before sending
    if (!saleData.quantity || parseInt(saleData.quantity) <= 0) {
      setError("Please enter a valid quantity");
      setLoading(false);
      return;
    }
    
    if (!saleData.item) {
      setError("Please select an item");
      setLoading(false);
      return;
    }
    
    try {
      // Send selling price and cost price to backend
      const selectedItem = availableItems.find(item => item.item === saleData.item);
      const costPrice = selectedItem ? parseFloat(selectedItem.price) : 0;
      
      const dataToSend = {
        ...saleData,
        price: parseFloat(saleData.price), // Selling price per unit
        cost_price: costPrice, // Cost price per unit from stock
        quantity: parseInt(saleData.quantity) // Ensure quantity is integer
      };
      
      console.log('Sending sale data:', dataToSend); // Debug log
      
      if (editingId) {
        await api.put(`stock/stockout/${editingId}/`, dataToSend);
        setEditingId(null);
      } else {
        const response = await api.post('stock/stockout/', dataToSend);
        console.log('Sale created successfully:', response.data); // Debug log
      }
      
      // Reset form
      setSaleData({
        item: "",
        quantity: "",
        price: "",
        date: new Date().toISOString().split('T')[0]
      });
      setUnitPrice(0);
      
      // Refresh data
      await fetchSalesData();
      await fetchAvailableItems(); // This should show updated quantities
      
      if (editingId) {
        // For edits, just refresh summary normally
        fetchSummaryWithoutRevenue();
      } else {
        // For new sales, refresh summary from database
        fetchSummary();
      }
      
      console.log('Available items refreshed after sale'); // Debug log
    } catch (error) {
      console.error('Error saving sale:', error);
      if (error.response && error.response.data) {
        // Handle validation errors from backend (like insufficient stock)
        if (error.response.data.non_field_errors) {
          setError(error.response.data.non_field_errors[0]);
        } else if (typeof error.response.data === 'string') {
          setError(error.response.data);
        } else {
          setError('Error saving sale. Please check your input.');
        }
      } else {
        setError('Error saving sale. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    const selectedItem = availableItems.find(availableItem => availableItem.item === item.item);
    const itemUnitPrice = selectedItem ? parseFloat(selectedItem.price) : parseFloat(item.price);
    setUnitPrice(itemUnitPrice);
    setSaleData({
      item: item.item,
      quantity: item.quantity,
      price: item.total_value, // Display total price in the form
      date: item.date
    });
    setEditingId(item.id);
  };

  const handleDelete = (id) => {
    const itemToDelete = salesList.find(item => item.id === id);
    setConfirmModal({
      isOpen: true,
      action: 'delete',
      id: id,
      title: 'Delete Sale Record',
      message: `Are you sure you want to delete the sale of ${itemToDelete?.item || 'this item'}? This will move it to deleted items and you can restore it later if needed.`
    });
  };

  const handleResetSummary = () => {
    setConfirmModal({
      isOpen: true,
      action: 'reset_summary',
      id: null,
      title: 'Reset Sales Summary',
      message: 'Are you sure you want to reset all sales data? This will permanently delete ALL sales records and cannot be undone. This action will also reset your inventory calculations.'
    });
  };

  const handleConfirmAction = async () => {
    const { action, id } = confirmModal;
    setConfirmModal({ isOpen: false, action: null, id: null, title: '', message: '' });

    if (action === 'delete') {
      try {
        // Perform soft delete via API
        await api.delete(`stock/stockout/${id}/`);
        
        // Refresh data
        await fetchSalesData();
        await fetchDeletedItems();
        // Don't fetch summary to preserve cumulative revenue
        // Don't refresh available items - quantities should remain the same since item was actually sold
        
        console.log('Item soft deleted successfully (inventory preserved)');
      } catch (error) {
        console.error('Error deleting sale:', error);
      }
    } else if (action === 'permanent_delete') {
      try {
        // Perform permanent delete via API
        await api.delete(`stock/stockout/${id}/permanent/`);
        
        // Refresh deleted items list only - do NOT refresh summary or available items
        // as permanent deletion should not affect inventory quantities or summary totals
        await fetchDeletedItems();
        
        console.log('Item permanently deleted successfully');
      } catch (error) {
        console.error('Error permanently deleting item:', error);
      }
    } else if (action === 'reset_summary') {
      try {
        // Reset all sales data via API
        await api.post('stock/stockout/reset_summary/');
        
        // Refresh all data
        await fetchSalesData();
        await fetchDeletedItems();
        await fetchSummary();
        await fetchAvailableItems();
        
        console.log('Sales summary reset successfully');
      } catch (error) {
        console.error('Error resetting sales summary:', error);
      }
    }
  };

  const handleCancelAction = () => {
    setConfirmModal({ isOpen: false, action: null, id: null, title: '', message: '' });
  };

  const fetchDeletedItems = async () => {
    try {
      const response = await api.get('stock/stockout/deleted/');
      const items = response.data.results || response.data;
      console.log('Loaded deleted items from database:', items);
      // Debug: Check if deleted_at field exists
      items.forEach(item => {
        console.log(`Item ${item.id}: deleted_at = ${item.deleted_at}`);
      });
      setDeletedItems(items);
    } catch (error) {
      console.error('Error fetching deleted items:', error);
      setDeletedItems([]);
    }
  };

  const handleRestoreItem = async (deletedItem) => {
    try {
      console.log('Restoring item:', deletedItem); // Debug log
      
      // Restore via API
      await api.post(`stock/stockout/${deletedItem.id}/restore/`);
      
      // Refresh data
      await fetchSalesData();
      await fetchDeletedItems();
      
      console.log('Item restored successfully'); // Debug log
      
      // Close the modal to show the updated data
      setShowDeletedModal(false);
      
    } catch (error) {
      console.error('Error restoring item:', error);
      setError('Error restoring item. Please try again.');
    }
  };

  const handleRemovePermanently = (deletedItem) => {
    setConfirmModal({
      isOpen: true,
      action: 'permanent_delete',
      id: deletedItem.id,
      title: 'Permanently Delete Item',
      message: `Are you sure you want to permanently delete the sale of ${deletedItem.item}? This action cannot be undone.`
    });
  };

  // Filter sales based on search term and date filter
  const filteredSalesList = salesList.filter(item => {
    // Search filter
    const matchesSearch = item.item.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Date filter
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    let matchesDate = true;
    if (dateFilter === 'today') {
      matchesDate = item.date === today;
    } else if (dateFilter === 'yesterday') {
      matchesDate = item.date === yesterday;
    } else if (dateFilter === 'specific' && selectedDate) {
      matchesDate = item.date === selectedDate;
    }
    
    return matchesSearch && matchesDate;
  });

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-yellow-400 mb-6">Stock Out Management (Sales)</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add Sale Form */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              {editingId ? 'Edit Sale' : 'Record New Sale'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500 text-white p-3 rounded-lg">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-white text-sm font-medium mb-2">Item Name</label>
                <select
                  name="item"
                  value={saleData.item}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  required
                >
                  <option value="">Select Item</option>
                  {availableItems.map((item) => (
                    <option key={item.id} value={item.item}>
                      {item.item} (Available: {item.quantity})
                    </option>
                  ))}
                </select>
                {availableItems.length === 0 && (
                  <p className="text-yellow-400 text-sm mt-1">No items available in stock</p>
                )}
              </div>
              
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Quantity Sold
                  {saleData.item && availableItems.find(item => item.item === saleData.item) && (
                    <span className="text-yellow-400 text-xs ml-2">
                      (Available: {availableItems.find(item => item.item === saleData.item)?.quantity || 0})
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={saleData.quantity}
                  onChange={handleInputChange}
                  min="1"
                  max={saleData.item ? availableItems.find(item => item.item === saleData.item)?.quantity || 0 : undefined}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  required
                />
              </div>
              
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Selling Price per Unit
                  {unitPrice > 0 && (
                    <span className="text-yellow-400 text-xs ml-2">
                      (Cost: AFN {unitPrice})
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="price"
                  value={saleData.price}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="Enter selling price per unit"
                  required
                />
                {unitPrice > 0 && saleData.price && (
                  <div className="mt-2 text-sm">
                    <span className="text-gray-300">Total: AFN {(parseFloat(saleData.price) * (parseInt(saleData.quantity) || 0)).toFixed(2)}</span>
                    {parseFloat(saleData.price) !== unitPrice && (
                      <span className={`ml-4 ${parseFloat(saleData.price) > unitPrice ? 'text-yellow-400' : 'text-red-400'}`}>
                        Profit: AFN {((parseFloat(saleData.price) - unitPrice) * (parseInt(saleData.quantity) || 0)).toFixed(2)}
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-white text-sm font-medium mb-2">Sale Date</label>
                <input
                  type="date"
                  name="date"
                  value={saleData.date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 [color-scheme:dark]"
                  required
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingId ? 'Update Sale' : 'Record Sale')}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setUnitPrice(0);
                      setError("");
                      setSaleData({
                        item: "",
                        quantity: "",
                        price: "",
                        date: new Date().toISOString().split('T')[0]
                      });
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Sales Summary */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Sales Summary</h2>
              <button
                onClick={handleResetSummary}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                title="Reset all sales data"
              >
                Reset
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                <span className="text-gray-300">Total Transactions</span>
                <span className="text-yellow-400 font-bold">{summary.total_sales}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                <span className="text-gray-300">Total Revenue</span>
                <span className="text-yellow-400 font-bold">AFN {summary.total_revenue?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                <span className="text-gray-300">Total Profit</span>
                <span className="text-yellow-400 font-bold">AFN {summary.total_profit?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                <span className="text-gray-300">Deleted Items</span>
                <span className="text-red-400 font-bold">{deletedItems.length}</span>
              </div>
              <button
                onClick={() => setShowDeletedModal(true)}
                className="w-full px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
              >
                Show Deleted Items
              </button>
            </div>
          </div>
        </div>

        {/* Sales List */}
        <div className="mt-6 bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <h2 className="text-xl font-semibold text-white">Sales History</h2>
            
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {/* Search Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 pl-10"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              
              {/* Date Filter */}
              <select
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  if (e.target.value !== 'specific') {
                    setSelectedDate("");
                  }
                }}
                className="px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="all">All Sales</option>
                <option value="today">Today's Sales</option>
                <option value="yesterday">Yesterday's Sales</option>
                <option value="specific">Select Date</option>
              </select>
              
              {/* Date Picker - Show when "Select Date" is chosen */}
              {dateFilter === 'specific' && (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 [color-scheme:dark]"
                />
              )}
            </div>
          </div>
          
          {/* Results Summary */}
          {(searchTerm || dateFilter !== 'all') && (
            <div className="mb-4 p-3 bg-gray-700 rounded-lg">
              <p className="text-gray-300 text-sm">
                Showing {filteredSalesList.length} of {salesList.length} sales
                {searchTerm && ` matching "${searchTerm}"`}
                {dateFilter === 'today' && ' from today'}
                {dateFilter === 'yesterday' && ' from yesterday'}
                {dateFilter === 'specific' && selectedDate && ` from ${new Date(selectedDate).toLocaleDateString()}`}
              </p>
            </div>
          )}
          
          {salesList.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No sales recorded yet</p>
          ) : filteredSalesList.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No sales found matching your criteria</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-white">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4">Item</th>
                    <th className="text-left py-3 px-4">Quantity</th>
                    <th className="text-left py-3 px-4">Price per Item</th>
                    <th className="text-left py-3 px-4">Total Price</th>
                    <th className="text-left py-3 px-4">Profit</th>
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSalesList.map((item) => (
                    <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-700">
                      <td className="py-3 px-4">{item.item}</td>
                      <td className="py-3 px-4">{item.quantity}</td>
                      <td className="py-3 px-4">AFN {parseFloat(item.price).toFixed(2)}</td>
                      <td className="py-3 px-4 text-yellow-400">AFN {parseFloat(item.total_value).toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <span className={`${(item.total_profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          AFN {item.total_profit ? item.total_profit.toFixed(2) : '0.00'}
                        </span>
                        {!item.total_profit && item.cost_price === 0 && (
                          <div className="text-xs text-yellow-400">No cost data</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="text-white text-sm">
                            {formatDateTime(item.created_at || item.date)}
                          </span>
                          <span className="text-gray-400 text-xs">
                            {getRelativeTime(item.created_at || item.date)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="px-3 py-1 bg-yellow-600 text-black text-sm rounded hover:bg-yellow-700 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Deleted Items Modal */}
        {showDeletedModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Deleted Items</h2>
                <button
                  onClick={() => setShowDeletedModal(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              
              {deletedItems.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No deleted items found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-white">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4">Item</th>
                        <th className="text-left py-3 px-4">Quantity</th>
                        <th className="text-left py-3 px-4">Price per Item</th>
                        <th className="text-left py-3 px-4">Total Price</th>
                        <th className="text-left py-3 px-4">Sale Date</th>
                        <th className="text-left py-3 px-4">Deleted At</th>
                        <th className="text-left py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deletedItems.map((item, index) => (
                        <tr key={`${item.id}-${index}`} className="border-b border-gray-700 hover:bg-gray-700">
                          <td className="py-3 px-4">{item.item}</td>
                          <td className="py-3 px-4">{item.quantity}</td>
                          <td className="py-3 px-4">AFN {parseFloat(item.price).toFixed(2)}</td>
                          <td className="py-3 px-4 text-yellow-400">AFN {parseFloat(item.total_value).toFixed(2)}</td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              <span className="text-white text-sm">
                                {formatDateTime(item.created_at || item.date)}
                              </span>
                              <span className="text-gray-400 text-xs">
                                {getRelativeTime(item.created_at || item.date)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-red-400">
                            <div className="flex flex-col">
                              <span className="text-red-400 text-sm">
                                {item.deleted_at ? formatDateTime(item.deleted_at) : 'N/A'}
                              </span>
                              <span className="text-red-300 text-xs">
                                {item.deleted_at ? getRelativeTime(item.deleted_at) : ''}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleRestoreItem(item)}
                                className="px-3 py-1 bg-yellow-600 text-black text-sm rounded hover:bg-yellow-700 transition-colors"
                              >
                                Restore
                              </button>
                              <button
                                onClick={() => handleRemovePermanently(item)}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={handleCancelAction}
          onConfirm={handleConfirmAction}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText="Delete"
          cancelText="Cancel"
        />
      </div>
    </div>
  );
}

export default Sale;