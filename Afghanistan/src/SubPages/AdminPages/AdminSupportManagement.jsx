// src/SubPages/AdminPages/AdminSupportManagement.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';

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
  
  const token = localStorage.getItem('token');
  
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
      const ticketsResponse = await axios.get('http://127.0.0.1:8000/api/admin/support/tickets/', config);
      setTickets(ticketsResponse.data);
      
      // Fetch FAQ categories
      const faqCategoriesResponse = await axios.get('http://127.0.0.1:8000/api/admin/support/faq-categories/', config);
      setFaqCategories(faqCategoriesResponse.data);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load support management data. Please try again later.');
      setLoading(false);
    }
  };
  
  const handleTicketResponse = async (ticketId) => {
    if (!ticketResponse.trim()) {
      alert('Please enter a response message');
      return;
    }
    
    try {
      const response = await axios.post(`http://127.0.0.1:8000/api/admin/support/tickets/${ticketId}/respond/`, {
        message: ticketResponse
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Update the ticket in the state
      setTickets(tickets.map(ticket => 
        ticket.id === ticketId 
          ? { ...ticket, responses: [...ticket.responses, response.data] }
          : ticket
      ));
      
      // Clear the response text
      setTicketResponse('');
      alert('Response sent successfully!');
    } catch (err) {
      console.error('Error sending response:', err);
      alert('Failed to send response. Please try again.');
    }
  };
  
  const handleCloseTicket = async (ticketId) => {
    if (!window.confirm('Are you sure you want to close this ticket?')) {
      return;
    }
    
    try {
      await axios.patch(`http://127.0.0.1:8000/api/admin/support/tickets/${ticketId}/close/`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Update the ticket status in the state
      setTickets(tickets.map(ticket => 
        ticket.id === ticketId ? { ...ticket, status: 'closed' } : ticket
      ));
      
      alert('Ticket closed successfully!');
    } catch (err) {
      console.error('Error closing ticket:', err);
      alert('Failed to close ticket. Please try again.');
    }
  };
  
  const handleCreateFaqCategory = async (e) => {
    e.preventDefault();
    
    if (!newFaqCategory.trim()) {
      alert('Please enter a category name');
      return;
    }
    
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/admin/support/faq-categories/create/', {
        name: newFaqCategory
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setFaqCategories([...faqCategories, response.data]);
      setNewFaqCategory('');
      setNewFaq({ ...newFaq, category: response.data.id });
      alert('FAQ Category created successfully!');
    } catch (err) {
      console.error('Error creating FAQ category:', err);
      alert('Failed to create FAQ category. Please try again.');
    }
  };
  
  const handleCreateFaq = async (e) => {
    e.preventDefault();
    
    if (!newFaq.category || !newFaq.question.trim() || !newFaq.answer.trim()) {
      alert('Please fill in all FAQ fields');
      return;
    }
    
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/admin/support/faqs/create/', newFaq, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Update the FAQ category in the state
      setFaqCategories(faqCategories.map(category => 
        category.id === newFaq.category 
          ? { ...category, faqs: [...category.faqs, response.data] }
          : category
      ));
      
      setNewFaq({ category: newFaq.category, question: '', answer: '' });
      alert('FAQ created successfully!');
    } catch (err) {
      console.error('Error creating FAQ:', err);
      alert('Failed to create FAQ. Please try again.');
    }
  };
  
  const filteredTickets = ticketFilter === 'all' 
    ? tickets 
    : tickets.filter(ticket => ticket.status === ticketFilter);
  
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
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Support Management</h1>
        <p className="text-gray-600">Manage support tickets and FAQs.</p>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'tickets'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Support Tickets
          </button>
          <button
            onClick={() => setActiveTab('faqs')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'faqs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            FAQ Management
          </button>
        </nav>
      </div>
      
      {/* Content based on active tab */}
      {activeTab === 'tickets' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Support Tickets</h2>
            <div>
              <select
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={ticketFilter}
                onChange={(e) => setTicketFilter(e.target.value)}
              >
                <option value="all">All Tickets</option>
                <option value="open">Open Tickets</option>
                <option value="closed">Closed Tickets</option>
              </select>
            </div>
          </div>
          
          {filteredTickets.length > 0 ? (
            <div className="space-y-6">
              {filteredTickets.map(ticket => (
                <div 
                  key={ticket.id} 
                  className={`bg-white rounded-lg shadow-md overflow-hidden ${
                    activeTicket === ticket.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div 
                    className={`p-4 cursor-pointer ${
                      ticket.status === 'open' ? 'bg-blue-50 border-l-4 border-blue-500' : 
                                               'bg-green-50 border-l-4 border-green-500'
                    }`}
                    onClick={() => setActiveTicket(activeTicket === ticket.id ? null : ticket.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                        <div className="flex text-sm text-gray-500 mt-1 space-x-4">
                          <p>From: {ticket.member_name}</p>
                          <p>Type: {ticket.type}</p>
                          <p>Date: {new Date(ticket.date_created).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          ticket.status === 'open' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {ticket.status === 'open' ? 'Open' : 'Closed'}
                        </span>
                        {ticket.status === 'open' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCloseTicket(ticket.id);
                            }}
                            className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full hover:bg-red-200"
                          >
                            Close
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {activeTicket === ticket.id && (
                    <div>
                      <div className="p-4 border-b border-gray-200">
                        <p className="text-gray-700">{ticket.message}</p>
                      </div>
                      
                      {ticket.responses && ticket.responses.length > 0 && (
                        <div className="p-4 bg-gray-50">
                          <h4 className="font-medium text-sm mb-3">Responses:</h4>
                          <div className="space-y-3">
                            {ticket.responses.map((response, index) => (
                              <div key={index} className="bg-white p-3 rounded border border-gray-200">
                                <div className="flex justify-between mb-1">
                                  <p className="font-medium text-sm">{response.author}</p>
                                  <p className="text-xs text-gray-500">{new Date(response.date_created).toLocaleDateString()}</p>
                                </div>
                                <p className="text-sm text-gray-700">{response.message}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {ticket.status === 'open' && (
                        <div className="p-4 bg-white border-t border-gray-200">
                          <h4 className="font-medium text-sm mb-3">Add Response:</h4>
                          <div className="space-y-3">
                            <textarea
                              placeholder="Enter your response..."
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              rows="3"
                              value={ticketResponse}
                              onChange={(e) => setTicketResponse(e.target.value)}
                            ></textarea>
                            <div className="text-right">
                              <button
                                onClick={() => handleTicketResponse(ticket.id)}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
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
              ))}
            </div>
          ) : (
            <div className="text-center p-10 bg-white rounded-lg shadow">
              <p className="text-gray-500">No tickets found matching the filter.</p>
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'faqs' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Create FAQ Category */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-4 mb-4">
                <h3 className="font-medium text-gray-700 mb-3">Create Category</h3>
                <form onSubmit={handleCreateFaqCategory}>
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="New category name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newFaqCategory}
                      onChange={(e) => setNewFaqCategory(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    Add Category
                  </button>
                </form>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="font-medium text-gray-700 mb-3">Categories</h3>
                <ul className="space-y-2">
                  {faqCategories.map(category => (
                    <li key={category.id}>
                      <div className="flex justify-between items-center px-3 py-2 bg-gray-100 rounded-md">
                        <span>{category.name}</span>
                        <span className="text-xs text-gray-500">{category.faqs?.length || 0} FAQs</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Create FAQ */}
            <div className="md:col-span-3">
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Create New FAQ</h2>
                <form onSubmit={handleCreateFaq}>
                  <div className="mb-4">
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      id="category"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newFaq.category}
                      onChange={(e) => setNewFaq({ ...newFaq, category: e.target.value })}
                      required
                    >
                      <option value="">Select a category</option>
                      {faqCategories.map(category => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                    <input
                      id="question"
                      type="text"
                      placeholder="Enter question"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newFaq.question}
                      onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-1">Answer</label>
                    <textarea
                      id="answer"
                      placeholder="Enter answer"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="4"
                      value={newFaq.answer}
                      onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                      required
                    ></textarea>
                  </div>
                  <div className="text-right">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Add FAQ
                    </button>
                  </div>
                </form>
              </div>
              
              {/* View/Edit Existing FAQs */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold mb-4">Existing FAQs</h2>
                {faqCategories.map(category => (
                  <div key={category.id} className="mb-6 last:mb-0">
                    <h3 className="text-md font-semibold mb-3 pb-2 border-b border-gray-200">{category.name}</h3>
                    {category.faqs && category.faqs.length > 0 ? (
                      <div className="space-y-4">
                        {category.faqs.map((faq, index) => (
                          <div key={index} className="border border-gray-200 rounded-md p-4">
                            <h4 className="font-medium text-gray-800 mb-2">{faq.question}</h4>
                            <p className="text-gray-600 text-sm">{faq.answer}</p>
                            <div className="flex justify-end mt-2 space-x-2">
                              <button className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200">
                                Edit
                              </button>
                              <button className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200">
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No FAQs in this category yet.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminSupportManagement;