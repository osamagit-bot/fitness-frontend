import { useEffect, useState } from 'react';
import AppToastContainer from "../../components/ui/ToastContainer";
import api from "../../utils/api";
import { showToast } from "../../utils/toast";
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
    image: null // Add image field
  });
  const [imageErrors, setImageErrors] = useState(new Set());

  const handleImageError = (trainerId) => {
    setImageErrors(prev => new Set([...prev, trainerId]));
  };

  // Add this helper function at the top of your component
  const getImageUrl = (trainer) => {
    if (!trainer.image) return '/images/trainer1.png';
    
    if (trainer.image.startsWith('http')) {
      return trainer.image;
    }
    
    // Fix: Remove /api from base URL for media files
    const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace('/api', '');
    return `${baseUrl}${trainer.image}`;
  };

  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const response = await api.get('trainers/', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 10000
      });

      let trainersData = response.data.results || response.data;
      trainersData = Array.isArray(trainersData) ? trainersData : [];
      
      // Remove username and password processing since we don't need them
      const processedTrainers = trainersData.map(trainer => ({
        ...trainer,
        // Remove username/password fields completely
      }));
      
      setTrainers(processedTrainers);
    } catch (error) {
      console.error('Error fetching trainers:', error);
      
      let errorMessage = 'Failed to load trainers. ';
      
      if (error.response) {
        errorMessage += `Server error: ${error.response.status}`;
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        errorMessage += 'No response from server. Check network connection.';
      } else {
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
  
  // Add image handling
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setNewTrainer(prev => ({ ...prev, image: file }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validate all required fields (remove username)
    const requiredFields = ['trainer_id', 'first_name', 'last_name', 'email', 'phone', 'monthly_salary', 'specialization', 'start_date'];
    const missingFields = requiredFields.filter(field => !newTrainer[field]);
    
    if (missingFields.length > 0) {
      setError(`Missing required fields: ${missingFields.join(', ')}`);
      setIsLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      
      // Create FormData for file upload
      const formData = new FormData();
      Object.keys(newTrainer).forEach(key => {
        if (key === 'image' && newTrainer[key]) {
          formData.append(key, newTrainer[key]);
        } else if (key !== 'image') {
          formData.append(key, newTrainer[key]);
        }
      });
      
      console.log('Submitting trainer data with image');
      
      const response = await api.post('trainers/', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type, let browser set it for FormData
        },
        timeout: 10000
      });
      
      // Reset form including image
      setNewTrainer({
        trainer_id: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        monthly_salary: '',
        specialization: '',
        start_date: '',
        image: null
      });
      
      setShowAddForm(false);
      fetchTrainers();
      showToast.success('Trainer added successfully!');
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
        const token = localStorage.getItem('access_token');
        
        await api.delete(`trainers/${trainerId}/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        setTrainers(trainers.filter(trainer => trainer.id !== trainerId));
        showToast.success('Trainer deleted successfully!');
      } catch (error) {
        console.error('Error deleting trainer:', error);
        showToast.error('Failed to delete trainer. They might be associated with training sessions.');
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
    <>
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-2 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-blue-900 mb-2">
            Trainers Management
          </h1>
          <div className="w-24 h-1 bg-blue-500 mx-auto rounded-full"></div>
          <p className="text-blue-700 mt-4">Manage your fitness trainers and their profiles</p>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">
            <p className="font-semibold">Error</p>
            <p className="text-sm whitespace-pre-line">{error}</p>
          </div>
        )}
        
        {/* Enhanced Add Trainer Form */}
        {showAddForm && (
          <div className="bg-white rounded-2xl shadow-xl border border-blue-200 mb-8 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Add New Trainer</h2>
                <button 
                  onClick={() => setShowAddForm(false)}
                  className="text-white hover:text-blue-200 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-black mb-2">Trainer ID</label>
                    <input
                      type="text"
                      name="trainer_id"
                      value={newTrainer.trainer_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200 transition-all"
                      placeholder="Enter trainer ID"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-black mb-2">Specialization</label>
                    <select
                      name="specialization"
                      value={newTrainer.specialization}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200 transition-all"
                      required
                    >
                      <option value="">Select specialization</option>
                      {specializations.map(spec => (
                        <option key={spec.value} value={spec.value}>{spec.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-black mb-2">First Name</label>
                    <input
                      type="text"
                      name="first_name"
                      value={newTrainer.first_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200 transition-all"
                      placeholder="Enter first name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-black mb-2">Last Name</label>
                    <input
                      type="text"
                      name="last_name"
                      value={newTrainer.last_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200 transition-all"
                      placeholder="Enter last name"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-black mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={newTrainer.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200 transition-all"
                      placeholder="Enter email address"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-black mb-2">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={newTrainer.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200 transition-all"
                      placeholder="Enter phone number"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-black mb-2">Monthly Salary</label>
                    <input
                      type="number"
                      name="monthly_salary"
                      value={newTrainer.monthly_salary}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200 transition-all"
                      placeholder="Enter monthly salary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-black mb-2">Start Date</label>
                    <input
                      type="date"
                      name="start_date"
                      value={newTrainer.start_date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200 transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-black mb-2">Profile Image</label>
                  <input
                    type="file"
                    name="image"
                    onChange={handleImageChange}
                    accept="image/*"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-50 file:text-black hover:file:bg-yellow-100"
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-semibold shadow-lg disabled:opacity-50"
                  >
                    {isLoading ? 'Adding...' : 'Add Trainer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Enhanced Trainers Display */}
        <div className="bg-white rounded-2xl shadow-xl border border-blue-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <h2 className="text-xl font-bold text-white mb-2 md:mb-0">Trainers List</h2>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                <button 
                  onClick={() => setShowAddForm(true)} 
                  className="bg-white text-blue-600 py-2 px-6 rounded-lg hover:bg-blue-50 transition-all font-semibold shadow-lg w-full sm:w-auto"
                  disabled={showAddForm}
                >
                  Add New Trainer
                </button>
                <button 
                  onClick={fetchTrainers}
                  className="bg-blue-700 text-white py-2 px-6 rounded-lg hover:bg-blue-800 transition-all font-semibold shadow-lg w-full sm:w-auto"
                  disabled={isLoading}
                >
                  {isLoading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
              </div>
            ) : (
              <>
                {/* Desktop Grid View */}
                <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {trainers.length > 0 ? (
                    trainers.map(trainer => (
                      <div key={trainer.id} className="bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-lg border border-blue-200 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                        <div className="relative h-48">
                          {imageErrors.has(trainer.id) ? (
                            <div className="h-full w-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                              <span className="text-blue-600 text-4xl">👤</span>
                            </div>
                          ) : (
                            <img 
                              src={getImageUrl(trainer)}
                              alt={`${trainer.first_name} ${trainer.last_name}`}
                              className="h-full w-full object-cover"
                              onError={() => handleImageError(trainer.id)}
                            />
                          )}
                          <div className="absolute top-4 right-4">
                            <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                              ID: {trainer.trainer_id}
                            </span>
                          </div>
                        </div>
                        <div className="p-6">
                          <h3 className="text-xl font-bold text-blue-900 mb-2">
                            {trainer.first_name} {trainer.last_name}
                          </h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center">
                              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                              <span className="text-gray-600">Specialization:</span>
                              <span className="ml-1 font-semibold capitalize">{trainer.specialization}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                              <span className="text-gray-600">Email:</span>
                              <span className="ml-1 font-semibold">{trainer.email}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                              <span className="text-gray-600">Phone:</span>
                              <span className="ml-1 font-semibold">{trainer.phone}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                              <span className="text-gray-600">Salary:</span>
                              <span className="ml-1 font-semibold">${trainer.monthly_salary}</span>
                            </div>
                          </div>
                          <div className="mt-4 pt-4 border-t border-blue-200">
                            <button
                              onClick={() => deleteTrainer(trainer.id)}
                              className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-all font-semibold"
                            >
                              Delete Trainer
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-8">
                      <div className="text-4xl text-blue-400 mb-2">👥</div>
                      <p className="text-gray-500">No trainers found</p>
                    </div>
                  )}
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {trainers.length > 0 ? (
                    trainers.map(trainer => (
                      <div key={trainer.id} className="bg-gradient-to-r from-blue-50 to-white rounded-xl shadow-lg border border-blue-200 overflow-hidden">
                        <div className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="font-bold text-lg text-blue-900">
                              {trainer.first_name} {trainer.last_name}
                            </h3>
                            <button
                              onClick={() => deleteTrainer(trainer.id)}
                              className="text-red-500 hover:text-red-700 font-semibold text-sm"
                            >
                              Delete
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-500">ID:</span>
                              <span className="ml-1 font-semibold">{trainer.trainer_id}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Specialization:</span>
                              <span className="ml-1 font-semibold capitalize">{trainer.specialization}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-500">Email:</span>
                              <span className="ml-1 font-semibold">{trainer.email}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Phone:</span>
                              <span className="ml-1 font-semibold">{trainer.phone}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Salary:</span>
                              <span className="ml-1 font-semibold">${trainer.monthly_salary}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl text-blue-400 mb-2">👥</div>
                      <p className="text-gray-500">No trainers found</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
    <AppToastContainer />
    </>
  );
}

export default TrainersPage;























