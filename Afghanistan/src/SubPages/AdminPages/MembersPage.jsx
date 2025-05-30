import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import LastMemberCredentials from '../../components/LastMemberCredentials';
import { motion, AnimatePresence } from 'framer-motion';

function MembersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }
      const response = await axios.get('http://127.0.0.1:8000/api/members/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      let membersList = [];
      if (Array.isArray(response.data)) {
        membersList = response.data;
      } else if (response.data.results && Array.isArray(response.data.results)) {
        membersList = response.data.results;
      }

      setMembers(membersList);
      setError(null);
    } catch (error) {
      console.error('Error fetching members:', error);
      setError('Failed to load members data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Dummy handlers for Renew and Delete (replace with your logic)
  const handleRenewal = (member) => {
    setSuccess(`Membership for ${member.first_name} ${member.last_name} renewed!`);
    setTimeout(() => setSuccess(null), 2500);
  };

  const handleDelete = (athlete_id) => {
    setSuccess(`Member with ID ${athlete_id} deleted!`);
    setTimeout(() => setSuccess(null), 2500);
  };

  // Filter members based on search term and status
  const filteredMembers = members.filter(member => {
    const matchesSearch =
      member.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.athlete_id.toString().includes(searchTerm);

    if (selectedStatus === 'all') return matchesSearch;
    if (selectedStatus === 'active') {
      const expiryDate = new Date(member.expiry_date);
      return matchesSearch && expiryDate >= new Date();
    }
    if (selectedStatus === 'expired') {
      const expiryDate = new Date(member.expiry_date);
      return matchesSearch && expiryDate < new Date();
    }
    return matchesSearch;
  });

  // Format currency
  const formatAfn = (amount) => {
    return `${parseFloat(amount).toFixed(2)} AFN`;
  };

  return (
    <motion.div
      className="p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Members</h1>
        <button
          onClick={() => navigate('/admin/register')}
          className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-md"
        >
          Register New Member
        </button>
      </div>

      {/* Add Last Member Credentials component */}
      <LastMemberCredentials />

      <AnimatePresence>
        {error && (
          <motion.div
            className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </motion.div>
        )}
        {success && (
          <motion.div
            className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <p className="font-bold">Success</p>
            <p>{success}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name or ID..."
            className="w-full p-2 border rounded"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <select
            className="w-full md:w-auto p-2 border rounded"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">All Members</option>
            <option value="active">Active Members</option>
            <option value="expired">Expired Members</option>
          </select>
        </div>
        <button
          onClick={fetchMembers}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <motion.div
          className="text-center py-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500 mx-auto"></div>
        </motion.div>
      ) : filteredMembers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="py-2 px-4 border">ID</th>
                <th className="py-2 px-4 border">Name</th>
                <th className="py-2 px-4 border">Type</th>
                <th className="py-2 px-4 border">Fee</th>
                <th className="py-2 px-4 border">Expiry</th>
                <th className="py-2 px-4 border">Status</th>
                <th className="py-2 px-4 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filteredMembers.map((member, idx) => {
                  const isExpired = new Date(member.expiry_date) < new Date();
                  return (
                    <motion.tr
                      key={member.athlete_id}
                      className="hover:bg-gray-50"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: 0.03 * idx }}
                    >
                      <td className="py-2 px-4 border">{member.athlete_id}</td>
                      <td className="py-2 px-4 border">{member.first_name} {member.last_name}</td>
                      <td className="py-2 px-4 border capitalize">{member.membership_type}</td>
                      <td className="py-2 px-4 border">{formatAfn(member.monthly_fee)}</td>
                      <td className="py-2 px-4 border">{new Date(member.expiry_date).toLocaleDateString()}</td>
                      <td className="py-2 px-4 border">
                        <span className={`px-2 py-1 rounded-full text-xs ${isExpired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {isExpired ? 'Expired' : 'Active'}
                        </span>
                      </td>
                      <td className="py-2 px-4 border">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleRenewal(member)}
                            className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                          >
                            Renew
                          </button>
                          <button
                            onClick={() => handleDelete(member.athlete_id)}
                            className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      ) : (
        <motion.div
          className="text-center py-4 text-gray-500"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p>No members found. {searchTerm && 'Try a different search term.'}</p>
        </motion.div>
      )}
    </motion.div>
  );
}

export default MembersPage;