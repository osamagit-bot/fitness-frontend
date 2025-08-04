import { useEffect, useState } from 'react';
import { FiChevronDown, FiChevronUp, FiEdit2, FiHelpCircle, FiMessageSquare, FiPlus, FiTrash2 } from 'react-icons/fi';
import AppToastContainer from "../../components/ui/ToastContainer";
import ConfirmModal from "../../components/ui/ConfirmModal";
import api from "../../utils/api";
import { formatDate, formatDateTime } from "../../utils/dateUtils";
import { showToast } from "../../utils/toast";
function AdminSupportManagement() {
  const [tickets, setTickets] = useState([]);
  const [faqCategories, setFaqCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('tickets');
  const [activeTicket, setActiveTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ticketResponse, setTicketResponse] = useState('');
  const [newFaqCategory, setNewFaqCategory] = useState('');
  const [newFaq, setNewFaq] = useState({ category: '', question: '', answer: '' });
  const [ticketFilter, setTicketFilter] = useState('all');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, faqId: null, categoryId: null });

  const token = localStorage.getItem('access_token');

  useEffect(() => {
    fetchSupportData();
  }, []);

  const fetchSupportData = async () => {
    setLoading(true);
    try {
      const config = {
        headers: { 'Authorization': `Bearer ${token}` }
      };

      // Fetch all tickets
      const ticketsResponse = await api.get('admin-support/tickets/', config);
      setTickets(Array.isArray(ticketsResponse.data) ? ticketsResponse.data : []);

      // Fetch FAQ categories with their FAQs
      const faqCategoriesResponse = await api.get('admin-support/faq-categories/', config);
      const categories = Array.isArray(faqCategoriesResponse.data) ? faqCategoriesResponse.data : [];
      setFaqCategories(categories);
      
      // Initialize expanded state for categories
      const initialExpanded = {};
      categories.forEach(category => {
        initialExpanded[category.id] = false;
      });
      setExpandedCategories(initialExpanded);

      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load support management data. Please try again later.');
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const handleTicketResponse = async (ticketId) => {
    if (!ticketResponse.trim()) {
      showToast.warn('Please enter a response message');
      return;
    }

    try {
      const response = await api.post(
        `admin-support/${ticketId}/respond/`,
        { message: ticketResponse },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      setTickets(tickets.map(ticket =>
        ticket.id === ticketId
          ? { 
              ...ticket, 
              responses: [...(ticket.responses || []), response.data],
              status: 'responded' 
            }
          : ticket
      ));

      setTicketResponse('');
    } catch (err) {
      console.error('Error sending response:', err);
      showToast.error('Failed to send response. Please try again.');
    }
  };

  const handleCloseTicket = async (ticketId) => {
    try {
      await api.patch(
        `admin-support/${ticketId}/close/`, 
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      setTickets(tickets.map(ticket =>
        ticket.id === ticketId ? { ...ticket, status: 'closed' } : ticket
      ));
    } catch (err) {
      console.error('Error closing ticket:', err);
      showToast.error('Failed to close ticket. Please try again.');
    }
  };

  const handleCreateFaqCategory = async (e) => {
    e.preventDefault();
    if (!newFaqCategory.trim()) return;

    try {
      const response = await api.post(
        'admin-support/faq-categories/',
        { name: newFaqCategory },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      setFaqCategories([...faqCategories, response.data]);
      setNewFaqCategory('');
      setIsCreatingCategory(false);
      setExpandedCategories(prev => ({ ...prev, [response.data.id]: true }));
    } catch (err) {
      console.error('Error creating FAQ category:', err);
      showToast.error('Failed to create FAQ category. Please try again.');
    }
  };

  const handleCreateFaq = async (e) => {
    e.preventDefault();
    if (!newFaq.category || !newFaq.question.trim() || !newFaq.answer.trim()) {
      showToast.warn('Please fill in all FAQ fields');
      return;
    }

    try {
      const response = await api.post(
        'admin-support/faqs/',
        newFaq,
        { headers: { 'Authorization': `Bearer ${token}` 
      ,'Content-Type': 'application/json'} }
      );
      console.log("FAQ created successfully!");
      setFaqCategories(faqCategories.map(category =>
        category.id === newFaq.category
          ? { 
              ...category, 
              faqs: [...(category.faqs || []), response.data],
              expanded: true 
            }
          : category
      ));

      setNewFaq({ category: newFaq.category, question: '', answer: '' });
      
    } catch (err) {
      console.error('Error creating FAQ:', err);
      showToast.error('Failed to create FAQ. Please try again.');
    }
  };

  const handleDeleteFaq = (faqId, categoryId) => {
    setConfirmModal({ isOpen: true, faqId, categoryId });
  };

  const executeDeleteFaq = async () => {
    const { faqId, categoryId } = confirmModal;
    setConfirmModal({ isOpen: false, faqId: null, categoryId: null });

    try {
      await api.delete(
        `admin-support/${faqId}/delete-faq/`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      setFaqCategories(faqCategories.map(category =>
        category.id === categoryId
          ? { 
              ...category, 
              faqs: category.faqs.filter(faq => faq.id !== faqId) 
            }
          : category
      ));
      showToast.success('FAQ deleted successfully!');
    } catch (err) {
      console.error('Error deleting FAQ:', err);
      showToast.error('Failed to delete FAQ. Please try again.');
    }
  };

  const handleCancelDelete = () => {
    setConfirmModal({ isOpen: false, faqId: null, categoryId: null });
  };

  const filteredTickets = Array.isArray(tickets)
    ? tickets.filter(ticket => {
        if (ticketFilter === 'all') return true;
        return ticket.status === ticketFilter;
      })
    : [];

  const filteredCategories = Array.isArray(faqCategories)
    ? faqCategories.filter(category => 
        category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (category.faqs && category.faqs.some(faq => 
          faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
        ))
      )
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-10">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={fetchSupportData}
          className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-2 sm:p-4 max-w-7xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Support Management</h1>
          <p className="text-gray-300 text-sm sm:text-base">Manage support tickets and FAQs for your platform</p>
        </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4 sm:mb-6">
        <nav className="flex space-x-4 sm:space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center space-x-1 sm:space-x-2 whitespace-nowrap ${
              activeTab === 'tickets'
                ? 'border-yellow-500 text-yellow-500'
                : 'border-transparent text-gray-300 hover:text-white hover:border-gray-500'
            }`}
          >
            <FiMessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Support Tickets</span>
            <span className="sm:hidden">Tickets</span>
          </button>
          <button
            onClick={() => setActiveTab('faqs')}
            className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center space-x-1 sm:space-x-2 whitespace-nowrap ${
              activeTab === 'faqs'
                ? 'border-yellow-500 text-yellow-500'
                : 'border-transparent text-gray-300 hover:text-white hover:border-gray-500'
            }`}
          >
            <FiHelpCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">FAQ Management</span>
            <span className="sm:hidden">FAQs</span>
          </button>
        </nav>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'tickets' && (
        <div className="bg-gray-700 rounded-xl shadow-md overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-600">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <h2 className="text-lg sm:text-xl font-semibold text-white">Support Tickets</h2>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <div className="relative">
                  <select
                    className="appearance-none w-full sm:w-auto pl-3 sm:pl-4 pr-8 sm:pr-10 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-gray-800 text-white text-sm sm:text-base"
                    value={ticketFilter}
                    onChange={(e) => setTicketFilter(e.target.value)}
                  >
                    <option value="all">All Tickets</option>
                    <option value="open">Open Tickets</option>
                    <option value="closed">Closed Tickets</option>
                    <option value="responded">Responded Tickets</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-300">
                    <svg className="fill-current h-3 w-3 sm:h-4 sm:w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {filteredTickets.length > 0 ? (
            <div className="divide-y divide-gray-600">
              {filteredTickets.map(ticket => {
                console.log('Ticket data:', ticket); // Debug log
                return (
                <div
                  key={ticket.id}
                  className={`transition-all duration-200 ${
                    activeTicket === ticket.id ? 'bg-gray-600' : 'hover:bg-gray-600'
                  }`}
                >
                  <div
                    className={`p-3 sm:p-4 lg:p-6 cursor-pointer ${
                      ticket.status === 'open' ? 'border-l-4 border-blue-500' :
                      ticket.status === 'responded' ? 'border-l-4 border-yellow-500' :
                      'border-l-4 border-green-500'
                    }`}
                    onClick={() => setActiveTicket(activeTicket === ticket.id ? null : ticket.id)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-2 sm:gap-3">
                          <div className={`flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center ${
                            ticket.status === 'open' ? 'bg-blue-100 text-blue-600' :
                            ticket.status === 'responded' ? 'bg-yellow-100 text-yellow-600' :
                            'bg-green-100 text-green-600'
                          }`}>
                            {ticket.status === 'open' ? (
                              <FiMessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                            ) : ticket.status === 'responded' ? (
                              <FiEdit2 className="h-4 w-4 sm:h-5 sm:w-5" />
                            ) : (
                              <FiTrash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-white text-sm sm:text-base truncate">{ticket.subject}</h3>
                            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-300 mt-1">
                              <p className="truncate">From: {ticket.member_name}</p>
                              <p>Type: {ticket.type}</p>
                              <p className="hidden sm:block">Date: {ticket.date_created ? formatDate(ticket.date_created) : ticket.created_at ? formatDate(ticket.created_at) : ticket.timestamp ? formatDate(ticket.timestamp) : new Date().toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2 sm:px-3 py-1 text-xs font-medium rounded-full ${
                          ticket.status === 'open' ? 'bg-blue-100 text-blue-800' :
                          ticket.status === 'responded' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {ticket.status === 'open' ? 'Open' : 
                           ticket.status === 'responded' ? 'Responded' : 'Closed'}
                        </span>
                        {ticket.status !== 'closed' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCloseTicket(ticket.id);
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            title="Close ticket"
                          >
                            <FiTrash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {activeTicket === ticket.id && (
                    <div className="px-3 sm:px-4 lg:px-6 pb-4 sm:pb-6 pt-2 bg-gray-700">
                      <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-600 rounded-lg">
                        <h4 className="font-medium text-white mb-2 text-sm sm:text-base">Original Message:</h4>
                        <p className="text-gray-300 whitespace-pre-line text-sm sm:text-base">{ticket.message}</p>
                      </div>

                      {ticket.responses && ticket.responses.length > 0 && (
                        <div className="mt-4 sm:mt-6">
                          <h4 className="font-medium text-white mb-2 sm:mb-3 text-sm sm:text-base">Responses:</h4>
                          <div className="space-y-2 sm:space-y-3">
                            {ticket.responses.map((response, index) => (
                              <div key={index} className="bg-yellow-500/10 p-3 sm:p-4 rounded-lg border border-yellow-500/30 shadow-xs">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-1 sm:gap-0">
                                  <p className="font-medium text-xs sm:text-sm text-white">{response.author}</p>
                                  <p className="text-xs text-gray-400">
                                  {response.date_created ? formatDateTime(response.date_created) : response.created_at ? formatDateTime(response.created_at) : new Date().toLocaleDateString()}
                                  </p>
                                </div>
                                <p className="text-gray-300 whitespace-pre-line text-sm sm:text-base">{response.message}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {ticket.status !== 'closed' && (
                        <div className="mt-4 sm:mt-6">
                          <h4 className="font-medium text-white mb-2 sm:mb-3 text-sm sm:text-base">Add Response:</h4>
                          <div className="space-y-3">
                            <textarea
                              placeholder="Type your response here..."
                              className="w-full px-3 sm:px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-gray-800 text-white placeholder-gray-400 text-sm sm:text-base"
                              rows="3"
                              value={ticketResponse}
                              onChange={e => setTicketResponse(e.target.value)}
                            ></textarea>
                            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                              <button
                                onClick={() => {
                                  setTicketResponse('');
                                  setActiveTicket(null);
                                }}
                                className="px-3 sm:px-4 py-2 border border-gray-600 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm sm:text-base"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleTicketResponse(ticket.id)}
                                className="px-3 sm:px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-300 text-sm sm:text-base font-medium"
                              >
                                Send Response
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          ) : (
            <div className="p-10 text-center">
              <div className="text-gray-400 mb-4">
                <FiMessageSquare className="h-12 w-12 mx-auto" />
              </div>
              <p className="text-gray-500">No tickets found matching the selected filter.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'faqs' && (
        <div className="bg-gray-700 rounded-xl shadow-md overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-600">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <h2 className="text-lg sm:text-xl font-semibold text-white">FAQ Management</h2>
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search FAQs..."
                  className="w-full pl-3 sm:pl-4 pr-8 sm:pr-10 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-gray-800 text-white placeholder-gray-400 text-sm sm:text-base"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:pr-3 pointer-events-none">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-6">
            {/* Categories Column */}
            <div className="lg:col-span-1 border-b lg:border-b-0 lg:border-r border-gray-600">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">Categories</h3>
                  <button
                    onClick={() => setIsCreatingCategory(!isCreatingCategory)}
                    className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                    title={isCreatingCategory ? 'Cancel' : 'Add category'}
                  >
                    <FiPlus className="h-5 w-5" />
                  </button>
                </div>

                {isCreatingCategory && (
                  <form onSubmit={handleCreateFaqCategory} className="mb-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="New category name"
                        className="flex-1 px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-gray-800 text-white placeholder-gray-400"
                        value={newFaqCategory}
                        onChange={e => setNewFaqCategory(e.target.value)}
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="px-3 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-300"
                      >
                        Add
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-2">
                  {filteredCategories.length > 0 ? (
                    filteredCategories.map(category => (
                      <div key={category.id} className="border border-gray-600 rounded-lg overflow-hidden">
                        <div
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-600"
                          onClick={() => toggleCategory(category.id)}
                        >
                          <span className="font-medium text-white">{category.name}</span>
                          <span className="flex items-center">
                            <span className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded-full mr-2">
                              {category.faqs?.length || 0}
                            </span>
                            {expandedCategories[category.id] ? (
                              <FiChevronUp className="h-4 w-4 text-gray-300" />
                            ) : (
                              <FiChevronDown className="h-4 w-4 text-gray-300" />
                            )}
                          </span>
                        </div>
                        {expandedCategories[category.id] && category.faqs && category.faqs.length > 0 && (
                          <div className="border-t border-gray-600 divide-y divide-gray-600">
                            {category.faqs.map(faq => (
                              <div key={faq.id} className="p-3 bg-gray-600">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium text-white">{faq.question}</p>
                                    <p className="text-sm text-gray-300 line-clamp-2">{faq.answer}</p>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteFaq(faq.id, category.id)}
                                    className="text-red-400 hover:text-red-600 transition-colors"
                                    title="Delete FAQ"
                                  >
                                    <FiTrash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-300">
                      No categories found matching your search.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* FAQ Creation Column */}
            <div className="lg:col-span-2 p-4 sm:p-6">
              <h3 className="font-semibold text-white mb-4">Create New FAQ</h3>
              <form onSubmit={handleCreateFaq} className="space-y-4">
                <div>
                  <label htmlFor="category-select" className="block text-xs sm:text-sm font-medium text-white mb-1">
                    Category
                  </label>
                  <select
                    id="category-select"
                    className="w-full px-3 sm:px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-gray-800 text-white text-sm sm:text-base"
                    value={newFaq.category}
                    onChange={e => setNewFaq({ ...newFaq, category: e.target.value })}
                    required
                  >
                    <option value="">Select a category</option>
                    {faqCategories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="question" className="block text-xs sm:text-sm font-medium text-white mb-1">
                    Question
                  </label>
                  <input
                    id="question"
                    type="text"
                    placeholder="What is...?"
                    className="w-full px-3 sm:px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-gray-800 text-white placeholder-gray-400 text-sm sm:text-base"
                    value={newFaq.question}
                    onChange={e => setNewFaq({ ...newFaq, question: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="answer" className="block text-xs sm:text-sm font-medium text-white mb-1">
                    Answer
                  </label>
                  <textarea
                    id="answer"
                    placeholder="Provide a detailed answer..."
                    className="w-full px-3 sm:px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-gray-800 text-white placeholder-gray-400 min-h-[120px] sm:min-h-[150px] text-sm sm:text-base"
                    value={newFaq.answer}
                    onChange={e => setNewFaq({ ...newFaq, answer: e.target.value })}
                    required
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setNewFaq({ category: '', question: '', answer: '' })}
                    className="px-3 sm:px-4 py-2 border border-gray-600 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm sm:text-base"
                  >
                    Clear
                  </button>
                  <button
                    type="submit"
                    className="px-3 sm:px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-300 text-sm sm:text-base font-medium"
                  >
                    Create FAQ
                  </button>
                </div>
              </form>

              {/* FAQ Preview */}
              {newFaq.question && (
                <div className="mt-8">
                  <h3 className="font-semibold text-white mb-3">Preview</h3>
                  <div className="bg-gray-600 p-4 rounded-lg border border-gray-500">
                    <h4 className="font-medium text-lg text-white mb-2">{newFaq.question}</h4>
                    <div className="prose max-w-none text-gray-300">
                      {newFaq.answer.split('\n').map((paragraph, i) => (
                        <p key={i}>{paragraph}</p>
                      ))}
                    </div>
                    {newFaq.category && (
                      <div className="mt-3">
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          {faqCategories.find(c => c.id === newFaq.category)?.name || 'Unknown Category'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
      
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={handleCancelDelete}
        onConfirm={executeDeleteFaq}
        title="Delete FAQ"
        message="Are you sure you want to delete this FAQ? This action cannot be undone."
      />
      
      <AppToastContainer />
    </>
  );
}

export default AdminSupportManagement;
