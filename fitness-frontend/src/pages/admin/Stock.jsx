import { useEffect, useState } from "react";
import ConfirmModal from "../../components/ui/ConfirmModal";
import api from "../../utils/api";
import { formatDateTime } from "../../utils/dateUtils";
import { getRelativeTime } from "../../utils/timeUtils";

function Stock() {
  const [stockData, setStockData] = useState({
    item: "",
    quantity: "",
    price: "",
    date: new Date().toISOString().split('T')[0]
  });
  
  const [stockList, setStockList] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ total_items: 0, total_quantity: 0, total_value: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all"); // all, today, yesterday, specific
  const [selectedDate, setSelectedDate] = useState("");
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null, id: null, title: '', message: '' });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setStockData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  useEffect(() => {
    fetchStockData();
    fetchSummary();
  }, []);

  const fetchStockData = async () => {
    try {
      // Use available_stock endpoint to get calculated available quantities
      const response = await api.get('stock/stockin/available_stock/');
      setStockList(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching stock data:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await api.get('stock/stockin/summary/');
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (editingId) {
        await api.put(`stock/stockin/${editingId}/`, stockData);
        setEditingId(null);
      } else {
        await api.post('stock/stockin/', stockData);
      }
      
      setStockData({
        item: "",
        quantity: "",
        price: "",
        date: new Date().toISOString().split('T')[0]
      });
      
      fetchStockData();
      fetchSummary();
    } catch (error) {
      console.error('Error saving stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setStockData({
      item: item.item,
      quantity: item.quantity,
      price: item.price,
      date: item.date
    });
    setEditingId(item.id);
  };

  const handleDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      action: 'delete',
      id: id,
      title: 'Delete Stock Item',
      message: 'Are you sure you want to delete this stock item? This action cannot be undone.'
    });
  };

  const handleRestock = (itemName) => {
    setConfirmModal({
      isOpen: true,
      action: 'restock',
      id: itemName,
      title: 'Restock Item',
      message: `Do you want to add more ${itemName} to inventory? Use the form above to add new stock.`
    });
  };

  const handleOutOfStock = (itemName) => {
    setConfirmModal({
      isOpen: true,
      action: 'outofstock',
      id: itemName,
      title: 'Out of Stock',
      message: `${itemName} is currently out of stock. Would you like to add more inventory using the form above?`
    });
  };

  const handleConfirmAction = async () => {
    const { action, id } = confirmModal;
    setConfirmModal({ isOpen: false, action: null, id: null, title: '', message: '' });

    if (action === 'delete') {
      try {
        await api.delete(`stock/stockin/${id}/`);
        fetchStockData();
        fetchSummary();
      } catch (error) {
        console.error('Error deleting stock:', error);
      }
    } else if (action === 'restock' || action === 'outofstock') {
      // Just close the modal - user can use the form above
      // Optionally, we could scroll to the form or pre-fill the item name
      setStockData(prev => ({ ...prev, item: id }));
    }
  };

  const handleCancelAction = () => {
    setConfirmModal({ isOpen: false, action: null, id: null, title: '', message: '' });
  };

  // Filter stock based on search term and date filter
  const filteredStockList = stockList.filter(item => {
    // Search filter
    const matchesSearch = item.item.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Date filter
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    let matchesDate = true;
    if (dateFilter === 'today') {
      const itemDate = item.created_at ? new Date(item.created_at).toISOString().split('T')[0] :
                      (item.date ? item.date : null);
      matchesDate = itemDate === today;
    } else if (dateFilter === 'yesterday') {
      const itemDate = item.created_at ? new Date(item.created_at).toISOString().split('T')[0] :
                      (item.date ? item.date : null);
      matchesDate = itemDate === yesterday;
    } else if (dateFilter === 'specific' && selectedDate) {
      const itemDate = item.created_at ? new Date(item.created_at).toISOString().split('T')[0] :
                      (item.date ? item.date : null);
      matchesDate = itemDate === selectedDate;
    }
    
    return matchesSearch && matchesDate;
  });

  return (
    <>
      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slide-in-left {
          from {
            opacity: 0;
            transform: translateX(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
        .animate-slide-in-left {
          animation: slide-in-left 0.8s ease-out forwards;
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.8s ease-out forwards;
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
      <div className="p-6 bg-gray-900 min-h-screen">
        <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-yellow-400 mb-6 animate-fade-in-up">Stock In Management</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add Stock Form */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 transform transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-400/20 animate-slide-in-left">
            <h2 className="text-xl font-semibold text-white mb-4 animate-fade-in">
              {editingId ? 'Edit Stock' : 'Add New Stock'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="transform transition-all duration-300 hover:translate-x-1">
                <label className="block text-white text-sm font-medium mb-2">Item Name</label>
                <input
                  type="text"
                  name="item"
                  value={stockData.item}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg outline-none transition-all duration-300 focus:ring-2 focus:ring-yellow-400 focus:bg-gray-600 focus:scale-105"
                  required
                />
              </div>
              
              <div className="transform transition-all duration-300 hover:translate-x-1">
                <label className="block text-white text-sm font-medium mb-2">Quantity</label>
                <input
                  type="number"
                  name="quantity"
                  value={stockData.quantity}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg outline-none transition-all duration-300 focus:ring-2 focus:ring-yellow-400 focus:bg-gray-600 focus:scale-105"
                  required
                />
              </div>
              
              <div className="transform transition-all duration-300 hover:translate-x-1">
                <label className="block text-white text-sm font-medium mb-2">Price per Unit</label>
                <input
                  type="number"
                  step="0.01"
                  name="price"
                  value={stockData.price}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg outline-none transition-all duration-300 focus:ring-2 focus:ring-yellow-400 focus:bg-gray-600 focus:scale-105"
                  required
                />
              </div>
              
              <div className="transform transition-all duration-300 hover:translate-x-1">
                <label className="block text-white text-sm font-medium mb-2">Date</label>
                <input
                  type="date"
                  name="date"
                  value={stockData.date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg outline-none transition-all duration-300 focus:ring-2 focus:ring-yellow-400 focus:bg-gray-600 focus:scale-105 [color-scheme:dark]"
                  required
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-600 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-yellow-400/50 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : (editingId ? 'Update Stock' : 'Add Stock')}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setStockData({
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

          {/* Stock Summary */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 transform transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-400/20 animate-slide-in-right">
            <h2 className="text-xl font-semibold text-white mb-4 animate-fade-in">Stock Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg transform transition-all duration-300 hover:bg-gray-600 hover:scale-105 hover:shadow-lg animate-fade-in-up" style={{animationDelay: '0.1s'}}>
                <span className="text-gray-300">Total Items</span>
                <span className="text-yellow-400 font-bold text-lg animate-pulse">{summary.total_items}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg transform transition-all duration-300 hover:bg-gray-600 hover:scale-105 hover:shadow-lg animate-fade-in-up" style={{animationDelay: '0.2s'}}>
                <span className="text-gray-300">Total Value</span>
                <span className="text-yellow-400 font-bold text-lg animate-pulse">AFN {summary.total_value?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stock List */}
        <div className="mt-6 bg-gray-800 rounded-lg shadow-lg p-6 transform transition-all duration-500 hover:shadow-2xl hover:shadow-yellow-400/10 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <h2 className="text-xl font-semibold text-white animate-fade-in">Available Stock Inventory</h2>
            
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {/* Search Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 px-3 py-2 bg-gray-700 text-white rounded-lg outline-none"
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
                className="px-3 py-2 bg-gray-700 text-white rounded-lg outline-none"
              >
                <option value="all">All Items</option>
                <option value="today">Added Today</option>
                <option value="yesterday">Added Yesterday</option>
                <option value="specific">Select Date</option>
              </select>
              
              {/* Date Picker - Show when "Select Date" is chosen */}
              {dateFilter === 'specific' && (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 bg-gray-700 text-white rounded-lg outline-none [color-scheme:dark]"
                />
              )}
            </div>
          </div>
          
          {/* Results Summary */}
          {(searchTerm || dateFilter !== 'all') && (
            <div className="mb-4 p-3 bg-gray-700 rounded-lg">
              <p className="text-gray-300 text-sm">
                Showing {filteredStockList.length} of {stockList.length} items
                {searchTerm && ` matching "${searchTerm}"`}
                {dateFilter === 'today' && ' added today'}
                {dateFilter === 'yesterday' && ' added yesterday'}
                {dateFilter === 'specific' && selectedDate && ` added on ${new Date(selectedDate).toLocaleDateString()}`}
              </p>
            </div>
          )}
          
          {stockList.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No stock items added yet</p>
          ) : filteredStockList.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No items found matching your criteria</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-white">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4">Item</th>
                    <th className="text-left py-3 px-4">Available Quantity</th>
                    <th className="text-left py-3 px-4">Price per Unit</th>
                    <th className="text-left py-3 px-4">Total Value</th>
                    <th className="text-left py-3 px-4">Last Updated</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStockList.map((item, index) => (
                    <tr key={item.id || item.item} className={`border-b border-gray-700 hover:bg-gray-700 transform transition-all duration-300 hover:scale-105 animate-fade-in-up ${item.quantity <= 5 && item.quantity > 0 ? 'bg-red-900/30' : item.quantity > 5 && item.quantity <= 15 ? 'bg-yellow-900/30' : ''}`} style={{animationDelay: `${index * 0.1}s`}}>
                      <td className="py-3 px-4">{item.item}</td>
                      <td className="py-3 px-4">
                        <span className={item.quantity > 0 ? "text-yellow-400" : "text-red-400"}>
                          {item.quantity}
                        </span>
                        {item.quantity === 0 && (
                          <span className="text-red-400 text-xs ml-2">(Out of Stock)</span>
                        )}
                      </td>
                      <td className="py-3 px-4">AFN {parseFloat(item.price).toFixed(2)}</td>
                      <td className="py-3 px-4 text-yellow-400">AFN {item.total_value?.toFixed(2) || '0.00'}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="text-white text-sm">
                            {item.created_at ? formatDateTime(item.created_at) : (item.date ? formatDateTime(item.date) : 'N/A')}
                          </span>
                          <span className="text-gray-400 text-xs">
                            {item.created_at ? getRelativeTime(item.created_at) : (item.date ? getRelativeTime(item.date) : '')}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRestock(item.item)}
                            className="px-3 py-1 bg-yellow-600 text-black text-sm rounded hover:bg-yellow-700 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-yellow-600/50"
                          >
                            Restock
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-red-600/50"
                          >
                            Delete
                          </button>
                          {item.quantity === 0 && (
                            <span className="px-3 py-1 bg-orange-600 text-white text-xs rounded">
                              Out of Stock
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={handleCancelAction}
          onConfirm={handleConfirmAction}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.action === 'delete' ? 'Delete' : 'OK'}
          cancelText="Cancel"
        />
        </div>
      </div>
    </>
  );
}

export default Stock;