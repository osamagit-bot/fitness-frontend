import { useState, useEffect } from 'react';
import axios from 'axios';

function TrainersPage() {
  const [trainers, setTrainers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTrainer, setNewTrainer] = useState({
    trainer_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    monthly_salary: '',
    specialization: '',
    start_date: '',
    username: '',
    password: ''
  });

  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('api.newdomain.com/api/trainers/', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 10000  // 10 seconds timeout
      });
  
      let trainersData = response.data.results || response.data;
      trainersData = Array.isArray(trainersData) ? trainersData : [];
      
      // Ensure username and password fields exist
      const processedTrainers = trainersData.map(trainer => ({
        ...trainer,
        username: trainer.username || 'N/A',
        password: trainer.password || '••••••••'
      }));
      
      // Store passwords locally too
      const trainersPasswords = JSON.parse(localStorage.getItem('trainersPasswords') || '{}');
      processedTrainers.forEach(trainer => {
        if (trainer.id && trainer.password && trainer.password !== '••••••••') {
          trainersPasswords[trainer.id] = trainer.password;
        }
      });
      localStorage.setItem('trainersPasswords', JSON.stringify(trainersPasswords));
      
      setTrainers(processedTrainers);
    } catch (error) {
      console.error('Error fetching trainers:', error);
      
      // More detailed error message
      let errorMessage = 'Failed to load trainers. ';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        errorMessage += `Server error: ${error.response.status}`;
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage += 'No response from server. Check network connection.';
      } else {
        // Something happened in setting up the request
        errorMessage += error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTrainer(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
  
    // Validate all required fields
    const requiredFields = ['trainer_id', 'username', 'password', 'first_name', 'last_name', 'email', 'phone', 'monthly_salary', 'specialization', 'start_date'];
    const missingFields = requiredFields.filter(field => !newTrainer[field]);
    
    if (missingFields.length > 0) {
      setError(`Missing required fields: ${missingFields.join(', ')}`);
      setIsLoading(false);
      return;
    }
  
    try {
      const token = localStorage.getItem('token');
      
      console.log('Submitting trainer data:', newTrainer);
      
      const response = await axios.post(
        'api.newdomain.com/api/trainers/', 
        {
          ...newTrainer,
          monthly_salary: parseFloat(newTrainer.monthly_salary)
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000  // 10 seconds timeout
        }
      );
      
      console.log('Trainer added:', response.data);
  
      // Store the password in local storage for admin reference
      const trainersPasswords = JSON.parse(localStorage.getItem('trainersPasswords') || '{}');
      if (response.data.id) {
        trainersPasswords[response.data.id] = newTrainer.password;
        localStorage.setItem('trainersPasswords', JSON.stringify(trainersPasswords));
      }
  
      setNewTrainer({
        trainer_id: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        monthly_salary: '',
        specialization: '',
        start_date: '',
        username: '',
        password: ''
      });
      
      setShowAddForm(false);
      fetchTrainers();
      alert('Trainer added successfully!');
    } catch (error) {
      console.error('Error adding trainer:', error);
      
      // Detailed error message
      let errorMessage = 'Failed to add trainer: ';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (error.response.data && typeof error.response.data === 'object') {
          // Format object errors
          const errorMessages = Object.entries(error.response.data)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n');
          errorMessage += errorMessages;
        } else if (typeof error.response.data === 'string') {
          // String error message
          errorMessage += error.response.data;
        } else {
          // Unknown error format
          errorMessage += `Server error: ${error.response.status}`;
        }
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage += 'No response from server. Check network connection.';
      } else {
        // Something happened in setting up the request
        errorMessage += error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTrainer = async (trainerId) => {
    if (window.confirm('Are you sure you want to delete this trainer?')) {
      try {
        const token = localStorage.getItem('token');
        
        await axios.delete(`api.newdomain.com/api/trainers/${trainerId}/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        setTrainers(trainers.filter(trainer => trainer.id !== trainerId));
        alert('Trainer deleted successfully!');
      } catch (error) {
        console.error('Error deleting trainer:', error);
        alert('Failed to delete trainer. They might be associated with training sessions.');
      }
    }
  };

  // Match the model's specialization choices
  const specializations = [
    { value: 'fitness', label: 'Fitness' },
    { value: 'yoga', label: 'Yoga' },
    { value: 'cardio', label: 'Cardio' },
    { value: 'strength', label: 'Strength Training' },
    { value: 'nutrition', label: 'Nutrition' }
  ];

  return (
    <div className="p-2 md:p-4">
      <h1 className="text-xl md:text-2xl font-bold mb-3 md:mb-6">Trainers Management</h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          <p className="font-semibold">Error</p>
          <p className="text-sm md:text-base whitespace-pre-line">{error}</p>
        </div>
      )}
      
      {/* Add Trainer Form */}
      {showAddForm && (
        <div className="bg-white p-3 md:p-6 rounded-lg shadow-md mb-4 md:mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg md:text-xl font-semibold">Add New Trainer</h2>
            <button 
              onClick={() => setShowAddForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Trainer ID</label>
                <input
                  type="text"
                  name="trainer_id"
                  value={newTrainer.trainer_id}
                  onChange={handleInputChange}
                  className="mt-1 p-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  name="username"
                  value={newTrainer.username}
                  onChange={handleInputChange}
                  className="mt-1 p-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={newTrainer.first_name}
                  onChange={handleInputChange}
                  className="mt-1 p-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={newTrainer.last_name}
                  onChange={handleInputChange}
                  className="mt-1 p-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  name="email"
                  value={newTrainer.email}
                  onChange={handleInputChange}
                  className="mt-1 p-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={newTrainer.phone}
                  onChange={handleInputChange}
                  className="mt-1 p-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Specialization</label>
                <select
                  name="specialization"
                  value={newTrainer.specialization}
                  onChange={handleInputChange}
                  className="mt-1 p-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a specialization</option>
                  {specializations.map(spec => (
                    <option key={spec.value} value={spec.value}>{spec.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Monthly Salary</label>
                <input
                  type="number"
                  name="monthly_salary"
                  value={newTrainer.monthly_salary}
                  onChange={handleInputChange}
                  className="mt-1 p-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  name="start_date"
                  value={newTrainer.start_date}
                  onChange={handleInputChange}
                  className="mt-1 p-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  name="password"
                  value={newTrainer.password}
                  onChange={handleInputChange}
                  className="mt-1 p-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
                disabled={isLoading}
              >
                {isLoading ? 'Adding...' : 'Add Trainer'}
              </button>
            </div>
          </form>
        </div>
      )}
      
     {/* Trainers Table */}
<div className="bg-white p-3 md:p-6 rounded-lg shadow-md">
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
    <h2 className="text-lg md:text-xl font-semibold mb-2 md:mb-0">Trainers List</h2>
    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
      <button 
        onClick={() => setShowAddForm(true)} 
        className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 w-full sm:w-auto"
        disabled={showAddForm}
      >
        Add New Trainer
      </button>
      <button 
        onClick={fetchTrainers}
        className="bg-gray-200 text-gray-700 py-2 px-4 rounded hover:bg-gray-300 w-full sm:w-auto"
        disabled={isLoading}
      >
        {isLoading ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  </div>

  {isLoading ? (
    <div className="flex justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  ) : (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trainer ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Password</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialization</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {trainers.length > 0 ? (
              trainers.map(trainer => (
                <tr key={trainer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{trainer.id}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{trainer.trainer_id}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {trainer.first_name} {trainer.last_name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {trainer.username || 'N/A'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {trainer.password || '••••••••'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {trainer.specialization}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {trainer.email}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {trainer.phone}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    ${trainer.monthly_salary}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => deleteTrainer(trainer.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" className="px-4 py-6 text-center text-gray-500">
                  No trainers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Mobile Card View */}
      <div className="md:hidden">
        {trainers.length > 0 ? (
          <div className="space-y-4">
            {trainers.map(trainer => (
              <div key={trainer.id} className="border rounded-lg p-3">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">
                    {trainer.first_name} {trainer.last_name}
                  </span>
                  <button
                    onClick={() => deleteTrainer(trainer.id)}
                    className="text-red-600 hover:text-red-900 text-sm"
                  >
                    Delete
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                  <span className="text-gray-500">ID:</span>
                  <span>{trainer.id}</span>
                  
                  <span className="text-gray-500">Trainer ID:</span>
                  <span>{trainer.trainer_id}</span>
                  
                  <span className="text-gray-500">Username:</span>
                  <span>{trainer.username || 'N/A'}</span>
                  
                  <span className="text-gray-500">Password:</span>
                  <span>{trainer.password || '••••••••'}</span>
                  
                  <span className="text-gray-500">Specialization:</span>
                  <span>{trainer.specialization}</span>
                  
                  <span className="text-gray-500">Email:</span>
                  <span>{trainer.email}</span>
                  
                  <span className="text-gray-500">Phone:</span>
                  <span>{trainer.phone}</span>
                  
                  <span className="text-gray-500">Salary:</span>
                  <span>${trainer.monthly_salary}</span>
                  
                  <span className="text-gray-500">Start Date:</span>
                  <span>{trainer.start_date}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            No trainers found
          </div>
        )}
      </div>
    </>
  )}
</div>
    </div>
  );
}

export default TrainersPage;
