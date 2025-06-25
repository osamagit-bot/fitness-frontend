import { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

function MembersPage() {
  const [athletes, setAthletes] = useState([]);
  const [filteredAthletes, setFilteredAthletes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: '',
    filterType: 'all'
  });

  const [statusFilter, setStatusFilter] = useState('all');

  const fetchAthletes = async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('access_token');
      const response = await api.get('members/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const athletesData = response.data.results || response.data;
      setAthletes(Array.isArray(athletesData) ? athletesData : []);
      setFilteredAthletes(Array.isArray(athletesData) ? athletesData : []);
    } catch (error) {
      console.error('Error fetching athletes:', error);
      setError(error.response?.data?.message || 'Failed to fetch athletes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAthletes();
    if (localStorage.getItem('membershipRenewed') === 'true') {
      localStorage.removeItem('membershipRenewed');
      setTimeout(fetchAthletes, 500);
    }
  }, []);

  useEffect(() => {
    applyFilters();
  }, [athletes, dateFilter, statusFilter]);

  const applyFilters = () => {
    let filtered = [...athletes];

    if (dateFilter.filterType === 'today') {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(athlete =>
        athlete.start_date && athlete.start_date.startsWith(today)
      );
    } else if (dateFilter.filterType === 'thisMonth') {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      filtered = filtered.filter(athlete => {
        if (!athlete.start_date) return false;
        const [year, month] = athlete.start_date.split('-');
        return parseInt(month) === currentMonth && parseInt(year) === currentYear;
      });
    } else if (dateFilter.filterType === 'custom' && dateFilter.startDate && dateFilter.endDate) {
      filtered = filtered.filter(athlete => {
        if (!athlete.start_date) return false;
        return athlete.start_date >= dateFilter.startDate &&
               athlete.start_date <= dateFilter.endDate;
      });
    }

    if (statusFilter === 'expired') {
      filtered = filtered.filter(athlete => isMembershipExpired(athlete.expiry_date));
    } else if (statusFilter === 'expiringSoon') {
      filtered = filtered.filter(athlete => isMembershipExpiringSoon(athlete.expiry_date));
    } else if (statusFilter === 'active') {
      filtered = filtered.filter(athlete =>
        !isMembershipExpired(athlete.expiry_date) &&
        !isMembershipExpiringSoon(athlete.expiry_date)
      );
    }

    setFilteredAthletes(filtered);
  };

  const resetDateFilters = () => {
    setDateFilter({
      startDate: '',
      endDate: '',
      filterType: 'all'
    });
    setStatusFilter('all');
    setFilteredAthletes(athletes);
  };

  const handleStatusFilter = (type) => {
    setStatusFilter(type);
  };

  const deleteAthlete = async (athleteId) => {
    if (window.confirm('Are you sure you want to delete this athlete?')) {
      try {
        const token = localStorage.getItem('access_token');
        await api.delete(`members/${athleteId}/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        fetchAthletes();
        alert('Athlete deleted successfully!');
      } catch (error) {
        console.error('Error deleting athlete:', error);
        alert('Failed to delete athlete. Please try again.');
      }
    }
  };

  const handleRenew = (athlete) => {
    const params = new URLSearchParams({
      renewMode: 'true',
      athleteId: athlete.athlete_id,
      firstName: athlete.first_name,
      lastName: athlete.last_name,
      membershipType: athlete.membership_type,
      monthlyFee: athlete.monthly_fee,
      boxNumber: athlete.box_number || '',
      timeSlot: athlete.time_slot || 'morning'
    });
    navigate(`/admin/register?${params.toString()}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTimeSlot = (timeSlot) => {
    if (!timeSlot) return 'Not specified';
    return timeSlot.charAt(0).toUpperCase() + timeSlot.slice(1);
  };

  const isMembershipExpired = (expiryDate) => {
    if (!expiryDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    return expiry < today;
  };

  const isMembershipExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    if (expiry < today) return false;
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7;
  };

  const getDaysRemaining = (expiryDate) => {
    if (!expiryDate) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="p-2 md:p-0">
      <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Athletes/Members Management</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
          <button 
            onClick={fetchAthletes}
            className="mt-2 px-3 py-1 bg-red-200 rounded hover:bg-red-300"
          >
            Try Again
          </button>
        </div>
      )}

      <div className="bg-white p-3 md:p-6 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-4">
          <h2 className="text-lg md:text-xl font-semibold">Members List</h2>

          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            <div className="flex items-center cursor-pointer" onClick={() => handleStatusFilter('expired')}>
              <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
              <span className="text-xs md:text-sm">Expired</span>
            </div>
            <div className="flex items-center cursor-pointer" onClick={() => handleStatusFilter('expiringSoon')}>
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></div>
              <span className="text-xs md:text-sm">Expiring Soon</span>
            </div>
            <div className="flex items-center cursor-pointer" onClick={() => handleStatusFilter('active')}>
              <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
              <span className="text-xs md:text-sm">Active</span>
            </div>

            <button 
              onClick={() => {
                resetDateFilters();
                setStatusFilter('all');
              }}
              className="px-3 py-1 md:px-4 md:py-2 bg-yellow-400 text-black rounded hover:bg-yellow-600"
            >
              Refresh
            </button>
          </div>
        </div>

        {(dateFilter.filterType !== 'all' || statusFilter !== 'all') && (
          <div className="mb-4 p-2 bg-gray-50 rounded-md text-sm flex items-center justify-between">
            <div>
              Showing {statusFilter !== 'all' && `${statusFilter} `}members (
              {filteredAthletes.length} members)
            </div>
            <button 
              onClick={resetDateFilters}
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
            >
              <FiX className="mr-1" /> Clear filters
            </button>
          </div>
        )}
{/* Large Screen Table */}
<div className="hidden md:block">
  <table className="min-w-full divide-y divide-gray-200">
    <thead className="bg-gray-50">
      <tr>
        <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
        <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
        <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
        <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Box</th>
        <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
        <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee</th>
        <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registered On</th>
        <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
        <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
        <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-gray-200">
      {filteredAthletes.length === 0 ? (
        <tr>
          <td colSpan="10" className="px-3 md:px-6 py-4 text-center text-gray-500">
            No athletes found.
          </td>
        </tr>
      ) : (
        filteredAthletes.map(athlete => {
          const isExpired = isMembershipExpired(athlete.expiry_date);
          const isExpiringSoon = isMembershipExpiringSoon(athlete.expiry_date);
          const daysRemaining = getDaysRemaining(athlete.expiry_date);

          return (
            <tr 
              key={athlete.athlete_id}
              className={`
                ${isExpired ? 'bg-red-50 hover:bg-red-100 text-sm' : ''}
                ${isExpiringSoon && !isExpired ? 'bg-yellow-50 text-sm hover:bg-yellow-100' : ''}
                ${!isExpired && !isExpiringSoon ? 'hover:bg-gray-50 text-sm' : ''}
              `}
            >
              <td className="px-3 md:px-6 py-2 md:py-4 whitespace-nowrap">{athlete.athlete_id}</td>
              <td className={`px-3 md:px-6 py-2 md:py-4 whitespace-nowrap ${isExpired ? 'text-red-700 font-semibold' : ''}`}>
                {athlete.first_name} {athlete.last_name}
              </td>
              <td className="px-3 md:px-6 py-2 md:py-4 whitespace-nowrap capitalize">{athlete.membership_type}</td>
              <td className="px-3 md:px-6 py-2 md:py-4 whitespace-nowrap">{athlete.box_number || '-'}</td>
              <td className="px-3 md:px-6 py-2 md:py-4 whitespace-nowrap capitalize">{formatTimeSlot(athlete.time_slot)}</td>
              <td className="px-3 md:px-6 py-2 md:py-4 whitespace-nowrap">{parseFloat(athlete.monthly_fee).toFixed(2)} AFN</td>
              <td className="px-3 md:px-6 py-2 md:py-4 whitespace-nowrap">{formatDate(athlete.start_date)}</td>
              <td className={`px-3 md:px-6 py-2 md:py-4 whitespace-nowrap ${isExpired ? 'text-red-600 font-semibold' : ''}`}>
                {formatDate(athlete.expiry_date)}
              </td>
              <td className="px-3 md:px-6 py-2 md:py-4 whitespace-nowrap">
                {isExpired ? (
                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-700">
                    Expired {Math.abs(daysRemaining)} days ago
                  </span>
                ) : isExpiringSoon ? (
                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-700">
                    Expires in {daysRemaining} days
                  </span>
                ) : (
                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-700">
                    Active
                  </span>
                )}
              </td>
              <td className="px-3 md:px-6 py-2 md:py-4 whitespace-nowrap">
                <div className="flex space-x-2">
                  {isExpired && (
                    <button 
                      onClick={() => handleRenew(athlete)}
                      className="text-white p-2 rounded-md bg-blue-500 hover:text-blue-300 mr-2"
                    >
                      Renew
                    </button>
                  )}
                  <button
                    onClick={() => deleteAthlete(athlete.athlete_id)}
                    className="text-black p-2 rounded-md bg-red-400 hover:text-red-900"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          );
        })
      )}
    </tbody>
  </table>
</div>

{/* Mobile View - Cards */}
<div className="md:hidden">
  {filteredAthletes.length === 0 ? (
    <div className="text-center py-4 text-gray-500">
      No athletes found.
    </div>
  ) : (
    <div className="space-y-4">
      {filteredAthletes.map(athlete => {
        const isExpired = isMembershipExpired(athlete.expiry_date);
        const isExpiringSoon = isMembershipExpiringSoon(athlete.expiry_date);
        const daysRemaining = getDaysRemaining(athlete.expiry_date);

        return (
          <div 
            key={athlete.athlete_id}
            className={`
              border rounded-lg p-4 shadow-sm
              ${isExpired ? 'bg-red-50 border-red-200' : ''}
              ${isExpiringSoon && !isExpired ? 'bg-yellow-50 border-yellow-200' : ''}
              ${!isExpired && !isExpiringSoon ? 'bg-white border-gray-200' : ''}
            `}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className={`font-bold text-lg ${isExpired ? 'text-red-700' : 'text-gray-800'}`}>
                  {athlete.first_name} {athlete.last_name}
                </h3>
                <p className="text-gray-600 text-sm">ID: {athlete.athlete_id}</p>
              </div>
              <div>
                {isExpired ? (
                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-700">
                    Expired
                  </span>
                ) : isExpiringSoon ? (
                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-700">
                    Expiring Soon
                  </span>
                ) : (
                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-700">
                    Active
                  </span>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
              <div>
                <p className="text-gray-500">Membership:</p>
                <p className="capitalize">{athlete.membership_type}</p>
              </div>
              <div>
                <p className="text-gray-500">Monthly Fee:</p>
                <p>{parseFloat(athlete.monthly_fee).toFixed(2)} AFN</p>
              </div>
              <div>
                <p className="text-gray-500">Box:</p>
                <p>{athlete.box_number || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Time Slot:</p>
                <p className="capitalize">{formatTimeSlot(athlete.time_slot)}</p>
              </div>
              <div>
                <p className="text-gray-500">Registered:</p>
                <p>{formatDate(athlete.start_date)}</p>
              </div>
              <div>
                <p className="text-gray-500">Expires:</p>
                <p className={isExpired ? 'text-red-600 font-semibold' : ''}>
                  {formatDate(athlete.expiry_date)}
                </p>
              </div>
            </div>
            
            {isExpired ? (
              <p className="text-red-700 text-sm mb-3">
                Expired {Math.abs(daysRemaining)} days ago
              </p>
            ) : isExpiringSoon ? (
              <p className="text-yellow-700 text-sm mb-3">
                Expires in {daysRemaining} days
              </p>
            ) : (
              <p className="text-green-700 text-sm mb-3">
                Valid for {daysRemaining} days
              </p>
            )}
            
            <div className="flex justify-end space-x-3 pt-2 border-t">
              {isExpired && (
                <button 
                  onClick={() => handleRenew(athlete)}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm"
                >
                  Renew
                </button>
              )}
              <button
                onClick={() => deleteAthlete(athlete.athlete_id)}
                className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>

      </div>
    </div>
  );
}

export default MembersPage;
