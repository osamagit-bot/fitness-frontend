import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import AppToastContainer from '../../components/ui/ToastContainer';
import api from '../../services/api';
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

  const memberName = localStorage.getItem('name') || 'Member';
  const memberID = localStorage.getItem('memberId');
  const token = localStorage.getItem('access_token');

  useEffect(() => {
    const fetchSupportData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('access_token');
        const memberID = localStorage.getItem('memberId');
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
        setTickets(Array.isArray(ticketsResponse.data) ? ticketsResponse.data : []);
  
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
  

  
    console.log("DEBUG: memberID =", memberID);
  
    if (!feedback.subject.trim() || !feedback.message.trim()) {
      showToast.warn('Please fill in both subject and message');
      return;
    }
  
    if (!memberID) {
      showToast.error('Member ID not found. Please login again.');
      return;
    }
  
    try {
      const response = await api.post('support/tickets/create/', {
        type: feedback.type,
        subject: feedback.subject,
        message: feedback.message,
        memberID: memberID // ✅ correct format
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
  
      setTickets([response.data, ...(Array.isArray(tickets) ? tickets : [])]);
      setFeedback({ type: 'general', subject: '', message: '' });
      showToast.success('Your ticket has been submitted. We will respond as soon as possible.');
    } catch (err) {
      console.error('Error submitting ticket:', err);
      showToast.error('Failed to submit ticket. Please try again.');
    }
  };
  



  // Ensure faqCategories is always an array
  const safeFaqCategories = Array.isArray(faqCategories) ? faqCategories : [];
  // Get FAQs for active category safely
  const currentFaqs = safeFaqCategories.find(category => category.id === activeCategory)?.faqs || [];

  if (loading) {
    return (
      <motion.div
        className="flex items-center justify-center min-h-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="text-center pl-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-red-500 mb-4">{error}</div>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
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
        className="container mx-auto p-4 max-w-6xl"
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
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Support & Feedback</h1>
        <p className="text-gray-600">Get help, find answers to common questions, or leave us feedback.</p>
      </motion.div>

      {/* Tabs */}
      <motion.div
        className="border-b border-gray-200 mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('support')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'support'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Support Tickets
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'faq'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            FAQ
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'feedback'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
            <h2 className="text-xl font-semibold mb-4">Your Support Tickets</h2>
            {Array.isArray(tickets) && tickets.length > 0 ? (
              <div className="space-y-6">
                <AnimatePresence>
                  {tickets.map((ticket, idx) => (
                    <motion.div
                      key={ticket.id}
                      className="bg-white rounded-lg shadow-md overflow-hidden"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -30 }}
                      transition={{ delay: 0.05 * idx }}
                    >
                      <div className={`p-4 ${
                        ticket.status === 'open' ? 'bg-blue-50 border-l-4 border-blue-500' : 
                        'bg-green-50 border-l-4 border-green-500'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                            <p className="text-sm text-gray-500">
                              Submitted on {formatDate(ticket.date)}
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            ticket.status === 'open' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {ticket.status === 'open' ? 'Open' : 'Closed'}
                          </span>
                        </div>
                      </div>
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
                                  <p className="text-xs text-gray-500">{formatDateTime(response.date)}</p>
                                </div>
                                <p className="text-sm text-gray-700">{response.message}</p>
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
                className="text-center p-10 bg-white rounded-lg shadow"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
              >
                <p className="text-gray-500">You haven't submitted any support tickets yet.</p>
                <button
                  onClick={() => setActiveTab('feedback')}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
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
            <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Categories sidebar */}
              <div className="md:col-span-1">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-700 mb-3">Categories</h3>
                  <ul className="space-y-2">
                    {safeFaqCategories.map(category => (
                      <li key={category.id}>
                        <button
                          onClick={() => setActiveCategory(category.id)}
                          className={`w-full text-left px-3 py-2 rounded-md ${
                            activeCategory === category.id
                              ? 'bg-blue-100 text-blue-700 font-medium'
                              : 'hover:bg-gray-100 text-gray-600'
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
                  className="bg-white rounded-lg shadow-md p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {activeCategory ? (
                    <>
                      <h3 className="font-semibold text-lg mb-4">
                        {safeFaqCategories.find(c => c.id === activeCategory)?.name} FAQs
                      </h3>
                      {Array.isArray(currentFaqs) && currentFaqs.length > 0 ? (
                        <div className="space-y-4">
                          {currentFaqs.map((faq, index) => (
                            <motion.div
                              key={index}
                              className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0"
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.05 * index }}
                            >
                              <h4 className="font-medium text-gray-800 mb-2">{faq.question}</h4>
                              <p className="text-gray-600">{faq.answer}</p>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No FAQs available for this category.</p>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500">Please select a category to view FAQs.</p>
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
            <h2 className="text-xl font-semibold mb-4">Submit Feedback or Support Request</h2>
            <motion.div
              className="bg-white rounded-lg shadow-md p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <form onSubmit={submitFeedback}>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Request Type</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <label className="block text-gray-700 mb-2">Subject</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief description of your issue"
                    value={feedback.subject}
                    onChange={(e) => setFeedback({ ...feedback, subject: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Message</label>
                  <textarea
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
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
