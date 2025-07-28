import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import AppToastContainer from '../../components/ui/ToastContainer';
import api from '../../utils/api';
import { formatDate, formatDateTime } from '../../utils/dateUtils';
import { showToast } from '../../utils/toast';

function MemberSupportPage() {
  const [tickets, setTickets] = useState([]);
  const [faqCategories, setFaqCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [feedback, setFeedback] = useState({ type: 'general', subject: '', message: '' });
  const [activeTab, setActiveTab] = useState('support');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingTickets, setEditingTickets] = useState({}); // key: ticketId, value: { subject, message, type }
  const [canSubmitToday, setCanSubmitToday] = useState(true);

  const memberName = localStorage.getItem('member_name') || 'Member';
  const memberID = localStorage.getItem('member_id');
  const token = localStorage.getItem('member_access_token');

  // Helper function to check if user can submit ticket today
  const checkCanSubmitToday = (ticketsArray) => {
    const today = new Date().toDateString();
    const todayTickets = ticketsArray.filter(ticket => {
      const ticketDate = new Date(ticket.date).toDateString();
      return ticketDate === today;
    });
    return todayTickets.length === 0;
  };

  // Helper function to check if user owns the ticket
  const isTicketOwner = (ticket) => {
    return ticket.memberID === memberID || ticket.member_name === memberName;
  };

  // Ticket editing functions
  const handleEditTicketStart = (ticketId, currentSubject, currentMessage, currentType) => {
    setEditingTickets(prev => ({
      ...prev,
      [ticketId]: { subject: currentSubject, message: currentMessage, type: currentType }
    }));
  };

  const handleEditTicketCancel = (ticketId) => {
    setEditingTickets(prev => {
      const copy = { ...prev };
      delete copy[ticketId];
      return copy;
    });
  };

  const handleEditTicketChange = (ticketId, field, value) => {
    setEditingTickets(prev => ({
      ...prev,
      [ticketId]: { ...prev[ticketId], [field]: value }
    }));
  };

  useEffect(() => {
    const fetchSupportData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('member_access_token');
        const memberID = localStorage.getItem('member_id');
        if (!memberID) {
          setError('Member ID not found. Please login again.');
          setLoading(false);
          return;
        }
  
        const config = {
          headers: { 'Authorization': `Bearer ${token}` }
        };
  
        // Fetch FAQ categories
        const faqResponse = await api.get('faq-categories/faqs/', config);
        const categories = Array.isArray(faqResponse.data) ? faqResponse.data : [];
        setFaqCategories(categories);
        if (categories.length > 0) {
          setActiveCategory(categories[0].id);
        }
  
        // Fetch tickets with memberID as query param
        const ticketsResponse = await api.get('admin-support/tickets/', {
          headers: { 'Authorization': `Bearer ${token}` },
          params: { memberID }
        });
        const ticketsData = Array.isArray(ticketsResponse.data) ? ticketsResponse.data : [];
        setTickets(ticketsData);
        
        // Check if user can submit ticket today
        setCanSubmitToday(checkCanSubmitToday(ticketsData));
  
      } catch (err) {
        console.error("Error fetching support data:", err);
        setError('Failed to load support content. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
  
    fetchSupportData();
  }, []);
  const submitFeedback = async (e) => {
    e.preventDefault();

    if (!feedback.subject.trim() || !feedback.message.trim()) {
      showToast.warn('Please fill in both subject and message');
      return;
    }

    if (!memberID) {
      showToast.error('Member ID not found. Please login again.');
      return;
    }

    // Check if user can submit ticket today
    if (!canSubmitToday) {
      showToast.error('You can only submit one ticket per day. Please try again tomorrow.');
      return;
    }

    try {
      const response = await api.post('support/tickets/create/', {
        type: feedback.type,
        subject: feedback.subject,
        message: feedback.message,
        memberID: memberID
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const updatedTickets = [response.data, ...(Array.isArray(tickets) ? tickets : [])];
      setTickets(updatedTickets);
      setFeedback({ type: 'general', subject: '', message: '' });
      
      // Update daily submission status
      setCanSubmitToday(checkCanSubmitToday(updatedTickets));
      
      showToast.success('Your ticket has been submitted. We will respond as soon as possible.');
    } catch (err) {
      console.error('Error submitting ticket:', err);
      showToast.error('Failed to submit ticket. Please try again.');
    }
  };

  // Update ticket function
  const handleEditTicketSave = async (ticketId) => {
    const editedTicket = editingTickets[ticketId];
    if (!editedTicket?.subject?.trim() || !editedTicket?.message?.trim()) {
      showToast.warn('Subject and message cannot be empty.');
      return;
    }

    try {
      const response = await api.put(`support/tickets/${ticketId}/`, {
        ticketId: ticketId,
        type: editedTicket.type,
        subject: editedTicket.subject,
        message: editedTicket.message
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setTickets(tickets.map(ticket => 
        ticket.id === ticketId 
          ? { ...ticket, subject: editedTicket.subject, message: editedTicket.message, type: editedTicket.type }
          : ticket
      ));

      handleEditTicketCancel(ticketId);
      showToast.success('Ticket updated successfully.');
    } catch (err) {
      console.error('Error updating ticket:', err);
      if (err.response?.status === 403) {
        showToast.error('You can only edit your own tickets.');
      } else {
        showToast.error('Failed to update ticket. Please try again.');
      }
    }
  };

  // Delete ticket function
  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) return;

    try {
      await api.delete(`support/tickets/delete/?ticketID=${ticketId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const updatedTickets = tickets.filter(ticket => ticket.id !== ticketId);
      setTickets(updatedTickets);
      
      // Update daily submission status after deletion
      setCanSubmitToday(checkCanSubmitToday(updatedTickets));

      showToast.success('Ticket deleted successfully.');
    } catch (err) {
      console.error('Error deleting ticket:', err);
      if (err.response?.status === 403) {
        showToast.error('You can only delete your own tickets.');
      } else {
        showToast.error('Failed to delete ticket. Please try again.');
      }
    }
  };
  



  // Ensure faqCategories is always an array
  const safeFaqCategories = Array.isArray(faqCategories) ? faqCategories : [];
  // Get FAQs for active category safely
  const currentFaqs = safeFaqCategories.find(category => category.id === activeCategory)?.faqs || [];

  if (loading) {
    return (
      <motion.div
        className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-800 via-gray-800 to-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="text-center pl-10 min-h-screen bg-gradient-to-br from-gray-800 via-gray-800 to-black flex flex-col justify-center items-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-red-400 mb-4">{error}</div>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black rounded hover:from-yellow-600 hover:to-yellow-700"
        >
          Retry
        </button>
      </motion.div>
    );
  }

  return (
    <>
      <AppToastContainer />
      <motion.div
        className="container mx-auto p-4 max-w-6xl min-h-screen bg-gradient-to-br from-gray-800 via-gray-800 to-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-3xl font-bold text-white mb-2">Support & Feedback</h1>
        <p className="text-gray-300">Get help, find answers to common questions, or leave us feedback.</p>
      </motion.div>

      {/* Tabs */}
      <motion.div
        className="border-b border-gray-600 mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('support')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'support'
                ? 'border-yellow-500 text-yellow-400'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
            }`}
          >
            Support Tickets
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'faq'
                ? 'border-yellow-500 text-yellow-400'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
            }`}
          >
            FAQ
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'feedback'
                ? 'border-yellow-500 text-yellow-400'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
            }`}
          >
            Submit Feedback
          </button>
        </nav>
      </motion.div>

      {/* Content based on active tab */}
      <AnimatePresence mode="wait">
        {activeTab === 'support' && (
          <motion.div
            key="support"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-xl font-semibold mb-4 text-white">Your Support Tickets</h2>
            {Array.isArray(tickets) && tickets.length > 0 ? (
              <div className="space-y-6">
                <AnimatePresence>
                  {tickets.map((ticket, idx) => (
                    <motion.div
                      key={ticket.id}
                      className="bg-gray-700 rounded-lg shadow-md overflow-hidden border border-gray-600"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -30 }}
                      transition={{ delay: 0.05 * idx }}
                    >
                      <div className={`p-4 ${
                        ticket.status === 'open' ? 'bg-gray-600 border-l-4 border-yellow-500' : 
                        'bg-gray-600 border-l-4 border-green-500'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            {editingTickets[ticket.id] ? (
                              <div className="space-y-2">
                                <select
                                  className="w-full p-2 border border-gray-600 bg-gray-600 text-white rounded text-sm"
                                  value={editingTickets[ticket.id].type}
                                  onChange={(e) => handleEditTicketChange(ticket.id, 'type', e.target.value)}
                                >
                                  <option value="general">General Inquiry</option>
                                  <option value="technical">Technical Support</option>
                                  <option value="billing">Billing Question</option>
                                  <option value="feedback">Feature Suggestion</option>
                                  <option value="complaint">Complaint</option>
                                </select>
                                <input
                                  type="text"
                                  className="w-full p-2 border border-gray-600 bg-gray-600 text-white rounded font-semibold text-lg"
                                  value={editingTickets[ticket.id].subject}
                                  onChange={(e) => handleEditTicketChange(ticket.id, 'subject', e.target.value)}
                                />
                              </div>
                            ) : (
                              <>
                                <h3 className="font-semibold text-lg text-white">{ticket.subject}</h3>
                                <p className="text-sm text-gray-400">
                                  Type: {ticket.type} • Submitted on {formatDate(ticket.date)}
                                </p>
                              </>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              ticket.status === 'open' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {ticket.status === 'open' ? 'Open' : 'Closed'}
                            </span>
                            {isTicketOwner(ticket) && ticket.status === 'open' && (
                              <div className="space-x-2">
                                {editingTickets[ticket.id] ? (
                                  <>
                                    <button
                                      onClick={() => handleEditTicketSave(ticket.id)}
                                      className="text-sm text-green-400 hover:underline"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => handleEditTicketCancel(ticket.id)}
                                      className="text-sm text-gray-300 hover:underline"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                  
                                    <button
                                      onClick={() => handleDeleteTicket(ticket.id)}
                                      className="text-sm text-red-400 hover:underline"
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="p-4 border-b border-gray-600">
                        {editingTickets[ticket.id] ? (
                          <textarea
                            className="w-full p-2 border border-gray-600 bg-gray-600 text-white rounded"
                            rows={4}
                            value={editingTickets[ticket.id].message}
                            onChange={(e) => handleEditTicketChange(ticket.id, 'message', e.target.value)}
                          />
                        ) : (
                          <p className="text-gray-300 whitespace-pre-wrap">{ticket.message}</p>
                        )}
                      </div>
                      {ticket.responses && ticket.responses.length > 0 && (
                        <div className="p-4 bg-gray-600">
                          <h4 className="font-medium text-sm mb-3 text-white">Responses:</h4>
                          <div className="space-y-3">
                            {ticket.responses.map((response, index) => (
                              <div key={index} className="bg-gray-700 p-3 rounded border border-gray-500">
                                <div className="flex justify-between mb-1">
                                  <p className="font-medium text-sm text-white">{response.author}</p>
                                  <p className="text-xs text-gray-400">{formatDateTime(response.date)}</p>
                                </div>
                                <p className="text-sm text-gray-300">{response.message}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <motion.div
                className="text-center p-10 bg-gray-700 rounded-lg shadow border border-gray-600"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
              >
                <p className="text-gray-400">You haven't submitted any support tickets yet.</p>
                <button
                  onClick={() => setActiveTab('feedback')}
                  className="mt-4 px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black rounded hover:from-yellow-600 hover:to-yellow-700"
                >
                  Submit a Ticket
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {activeTab === 'faq' && (
          <motion.div
            key="faq"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-xl font-semibold mb-4 text-white">Frequently Asked Questions</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Categories sidebar */}
              <div className="md:col-span-1">
                <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                  <h3 className="font-medium text-white mb-3">Categories</h3>
                  <ul className="space-y-2">
                    {safeFaqCategories.map(category => (
                      <li key={category.id}>
                        <button
                          onClick={() => setActiveCategory(category.id)}
                          className={`w-full text-left px-3 py-2 rounded-md ${
                            activeCategory === category.id
                              ? 'bg-yellow-500 text-black font-medium'
                              : 'hover:bg-gray-600 text-gray-300'
                          }`}
                        >
                          {category.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {/* FAQ content */}
              <div className="md:col-span-3">
                <motion.div
                  className="bg-gray-700 rounded-lg shadow-md p-6 border border-gray-600"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {activeCategory ? (
                    <>
                      <h3 className="font-semibold text-lg mb-4 text-white">
                        {safeFaqCategories.find(c => c.id === activeCategory)?.name} FAQs
                      </h3>
                      {Array.isArray(currentFaqs) && currentFaqs.length > 0 ? (
                        <div className="space-y-4">
                          {currentFaqs.map((faq, index) => (
                            <motion.div
                              key={index}
                              className="border-b border-gray-600 pb-4 last:border-b-0 last:pb-0"
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.05 * index }}
                            >
                              <h4 className="font-medium text-white mb-2">{faq.question}</h4>
                              <p className="text-gray-300">{faq.answer}</p>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-400">No FAQs available for this category.</p>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-400">Please select a category to view FAQs.</p>
                  )}
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'feedback' && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-xl font-semibold mb-4 text-white">Submit Feedback or Support Request</h2>
            
            {/* Daily submission warning */}
            {!canSubmitToday && (
              <motion.div
                className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex">
                  <div className="flex-shrink-0">
                    <i className="bx bx-info-circle text-yellow-400 text-xl"></i>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>Daily Limit Reached:</strong> You can only submit one support ticket per day. 
                      You have already submitted a ticket today. Please try again tomorrow.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
            
            <motion.div
              className="bg-gray-700 rounded-lg shadow-md p-6 border border-gray-600"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <form onSubmit={submitFeedback}>
                <div className="mb-4">
                  <label className="block text-white mb-2">Request Type</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-600 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    value={feedback.type}
                    onChange={(e) => setFeedback({ ...feedback, type: e.target.value })}
                  >
                    <option value="general">General Inquiry</option>
                    <option value="technical">Technical Support</option>
                    <option value="billing">Billing Question</option>
                    <option value="feedback">Feature Suggestion</option>
                    <option value="complaint">Complaint</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-white mb-2">Subject</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-600 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="Brief description of your issue"
                    value={feedback.subject}
                    onChange={(e) => setFeedback({ ...feedback, subject: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-white mb-2">Message</label>
                  <textarea
                    className="w-full px-4 py-2 border border-gray-600 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    rows="5"
                    placeholder="Please provide details about your request"
                    value={feedback.message}
                    onChange={(e) => setFeedback({ ...feedback, message: e.target.value })}
                    required
                  ></textarea>
                </div>
                <div className="text-right">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-colors"
                  >
                    Submit
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </motion.div>
    </>
  );
}

export default MemberSupportPage;
