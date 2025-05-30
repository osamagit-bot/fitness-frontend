import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function MembersPage() {
  const [athletes, setAthletes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Simplified fetch function
  const fetchAthletes = async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      
      // Basic request without extra headers
      const response = await axios.get('http://127.0.0.1:8000/api/members/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Raw response data:', response.data);
      
      // Handle both direct arrays and paginated results
      const athletesData = response.data.results || response.data;
      setAthletes(Array.isArray(athletesData) ? athletesData : []);
    } catch (error) {
      console.error('Error fetching athletes:', error);
      
      if (error.response) {
        console.error('Response error:', error.response.data);
        setError(`Error ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error('Request error:', error.request);
        setError('Network error: Could not connect to the server');
      } else {
        setError(`Error: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to fetch data on mount and check for renewal flag
  useEffect(() => {
    fetchAthletes();
    
    // Check for renewal flag 
    if (localStorage.getItem('membershipRenewed') === 'true') {
      localStorage.removeItem('membershipRenewed');
      setTimeout(fetchAthletes, 500); // Try to fetch again after a short delay
    }
  }, []);

  const deleteAthlete = async (athleteId) => {
    if (window.confirm('Are you sure you want to delete this athlete?')) {
      try {
        const token = localStorage.getItem('token');
        
        await axios.delete(`http://127.0.0.1:8000/api/members/${athleteId}/`, {
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
    // Create URL search params with member data
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
    
    // Navigate to register page with params
    navigate(`/admin/register?${params.toString()}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Format time slot to display nicely
  const formatTimeSlot = (timeSlot) => {
    if (!timeSlot) return 'Not specified';
    
    return timeSlot.charAt(0).toUpperCase() + timeSlot.slice(1);
  };

  // Simple date comparison functions
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
    
    // If already expired, it's not "expiring soon"
    if (expiry < today) return false;
    
    // Calculate days until expiry
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
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
          <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-0">Members List</h2>
          
          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
              <span className="text-xs md:text-sm">Expired</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></div>
              <span className="text-xs md:text-sm">Expiring Soon</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
              <span className="text-xs md:text-sm">Active</span>
            </div>
            <button 
              onClick={fetchAthletes} 
              className="px-3 py-1 md:px-4 md:py-2 bg-yellow-400 text-black rounded hover:bg-yellow-600 ml-auto"
            >
              <i className="bx bx-refresh mr-1"></i> Refresh
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Large Screen Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Box</th>
                    <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee</th>
                    <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                    <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
                    <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {athletes.map(athlete => {
                    const isExpired = isMembershipExpired(athlete.expiry_date);
                    const isExpiringSoon = isMembershipExpiringSoon(athlete.expiry_date);
                    const daysRemaining = getDaysRemaining(athlete.expiry_date);
                    
                    return (
                      <tr 
                        key={athlete.athlete_id}
                        className={`
                          ${isExpired ? 'bg-red-50' : ''}
                          ${isExpiringSoon ? 'bg-yellow-50' : ''}
                          ${isExpired && 'hover:bg-red-100'}
                          ${isExpiringSoon && 'hover:bg-yellow-100'}
                          ${!isExpired && !isExpiringSoon && 'hover:bg-gray-50'}
                        `}
                      >
                        <td className="px-3 md:px-6 py-2 md:py-4 whitespace-nowrap">{athlete.athlete_id}</td>
                        <td className="px-3 md:px-6 py-2 md:py-4 whitespace-nowrap">
                          <div className={`${isExpired ? 'text-red-700 font-semibold' : ''}`}>
                            {`${athlete.first_name} ${athlete.last_name}`}
                          </div>
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
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              Expired {Math.abs(daysRemaining)} days ago
                            </span>
                          ) : isExpiringSoon ? (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Expires in {daysRemaining} days
                            </span>
                          ) : (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-3 md:px-6 py-2 md:py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            {isExpired && (
                              <button 
                                onClick={() => handleRenew(athlete)}
                                className="text-blue-600 hover:text-blue-900 mr-2"
                              >
                                Renew
                              </button>
                            )}
                            <button
                              onClick={() => deleteAthlete(athlete.athlete_id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {athletes.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan="10" className="px-3 md:px-6 py-2 md:py-4 text-center text-gray-500">
                        No athletes found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View - Cards */}
            <div className="md:hidden">
              {athletes.length === 0 && !isLoading ? (
                <div className="text-center py-4 text-gray-500">No athletes found</div>
              ) : (
                <div className="space-y-4">
                  {athletes.map(athlete => {
                    const isExpired = isMembershipExpired(athlete.expiry_date);
                    const isExpiringSoon = isMembershipExpiringSoon(athlete.expiry_date);
                    const daysRemaining = getDaysRemaining(athlete.expiry_date);
                    
                    return (
                      <div 
                        key={athlete.athlete_id}
                        className={`
                          border rounded-lg p-4 shadow-sm
                          ${isExpired ? 'bg-red-50 border-red-200' : ''}
                          ${isExpiringSoon ? 'bg-yellow-50 border-yellow-200' : ''}
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
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                Expired
                              </span>
                            ) : isExpiringSoon ? (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                Expiring Soon
                              </span>
                            ) : (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
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
                            <p className="text-gray-500">Started:</p>
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
                              Renew Membership
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
          </>
        )}
      </div>
    </div>
  );
}

export default MembersPage;