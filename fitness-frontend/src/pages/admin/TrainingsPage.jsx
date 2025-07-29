import { useEffect, useState } from 'react';
import AppToastContainer from "../../components/ui/ToastContainer";
import ConfirmModal from "../../components/ui/ConfirmModal";
import api from "../../utils/api";
import { showToast } from "../../utils/toast";
function TrainingsPage() {
  const [trainingSessions, setTrainingSessions] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [newTraining, setNewTraining] = useState({
    type: '',
    trainer: '',
    date: '',
    time: '',
    duration: '',
    capacity: '',
    description: '',
    image: null
  });
  const [imageErrors, setImageErrors] = useState(new Set());
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null, id: null, title: '', message: '' });

  const handleImageError = (trainingId) => {
    setImageErrors(prev => new Set([...prev, trainingId]));
  };

  const getImageUrl = (training) => {
    if (!training.image) return '/images/default-training.png';
    
    if (training.image.startsWith('http')) {
      return training.image;
    }
    
    const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace('/api', '');
    return `${baseUrl}${training.image}`;
  };

  useEffect(() => {
    fetchTrainingSessions();
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await api.get('trainers/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const trainersData = response.data.results || response.data;
      if (Array.isArray(trainersData) && trainersData.length > 0) {
        setTrainers(trainersData);
      } else {
        console.warn('No trainers found in the response');
        setError('No trainers available. Please add trainers first.');
      }
    } catch (error) {
      console.error('Error fetching trainers:', error);
      if (error.response && error.response.status === 405) {
        setError('Trainers API not available. Please navigate to Trainers page to add trainers first.');
      } else {
        setError('Failed to load trainers. Please try again later.');
      }
    }
  };

  const fetchTrainingSessions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const response = await api.get('trainings/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const trainingData = response.data.results || response.data;
      setTrainingSessions(Array.isArray(trainingData) ? trainingData : []);
    } catch (error) {
      console.error('Error fetching training sessions:', error);
      setError('Failed to load training sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTraining({ ...newTraining, [name]: value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setNewTraining(prev => ({ ...prev, image: file }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('trainer', parseInt(newTraining.trainer));
      formData.append('type', newTraining.type);
      const localDate = new Date(`${newTraining.date}T${newTraining.time}:00`);
      formData.append('datetime', localDate.toISOString());
      formData.append('duration', parseInt(newTraining.duration));
      formData.append('capacity', parseInt(newTraining.capacity));
      formData.append('description', newTraining.description || '');
      
      // Add image if selected
      if (newTraining.image) {
        formData.append('image', newTraining.image);
      }
      
      console.log('Submitting training data with image');

      const response = await api.post('trainings/', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          
        },
        timeout: 10000
      });
      
      // Reset form including image
      setNewTraining({
        type: '',
        trainer: '',
        date: '',
        time: '',
        duration: '',
        capacity: '',
        description: '',
        image: null
      });
      
      setShowScheduleForm(false);
      fetchTrainingSessions();
      showToast.success('Training scheduled successfully!');
    } catch (error) {
      console.error('Error scheduling training:', error);
      if (error.response) {
        console.error('Error response data:', error.response.data);
        
        // Format the error message for display
        if (error.response.data && typeof error.response.data === 'object') {
          const errorMessages = Object.entries(error.response.data)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n');
          setError(`Failed to schedule training session:\n${errorMessages}`);
        } else {
          setError('Failed to schedule training session: ' + (error.response.data || error.message));
        }
      } else {
        setError('Failed to schedule training session: ' + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTraining = (trainingId) => {
    setConfirmModal({
      isOpen: true,
      action: 'deleteTraining',
      id: trainingId,
      title: 'Cancel Training Session',
      message: 'Are you sure you want to cancel this training session? This action cannot be undone.'
    });
  };

  const executeDeleteTraining = async (trainingId) => {
    try {
      const token = localStorage.getItem('access_token');
      
      await api.delete(`trainings/${trainingId}/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setTrainingSessions(trainingSessions.filter(session => session.id !== trainingId));
      showToast.success('Training session cancelled successfully!');
    } catch (error) {
      console.error('Error cancelling training:', error);
      showToast.error('Failed to cancel training session');
    }
  };

  const handleConfirmAction = async () => {
    const { action, id } = confirmModal;
    setConfirmModal({ isOpen: false, action: null, id: null, title: '', message: '' });
    
    if (action === 'deleteTraining') {
      await executeDeleteTraining(id);
    }
  };

  const handleCancelAction = () => {
    setConfirmModal({ isOpen: false, action: null, id: null, title: '', message: '' });
  };

  // Format date and time for display
  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return '—';
    const date = new Date(dateTimeString);
    return date.toLocaleString();
  };

  // Format duration for display
  const formatDuration = (minutes) => {
    if (!minutes) return '—';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins} min`;
  };

  // Updated to match the backend's expected values
  const trainingTypes = [
    { value: 'fitness', label: 'Fitness' },
    { value: 'yoga', label: 'Yoga' },
    { value: 'cardio', label: 'Cardio' },
    { value: 'strength', label: 'Strength Training' },
    { value: 'nutrition', label: 'Nutrition' }
  ];

  // Reset form when closing
  const handleCloseForm = () => {
    setShowScheduleForm(false);
    setNewTraining({
      type: '',
      trainer: '',
      date: '',
      time: '',
      duration: '',
      capacity: '',
      description: '',
      image: null  // Reset image
    });
  };

  return (
    <>
      <AppToastContainer />
      <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-800 to-black p-2 md:p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Training Management</h1>
            <div className="w-24 h-1 bg-yellow-500 mx-auto rounded-full"></div>
            <p className="text-gray-300 mt-4">Schedule and manage training sessions</p>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 text-red-300 rounded-xl border border-red-500/50">
              <p className="font-semibold">Error</p>
              <p className="text-sm md:text-base whitespace-pre-line">{error}</p>
            </div>
          )}
          
          {/* Schedule Training Form */}
          {showScheduleForm && (
            <div className="bg-gray-700 rounded-2xl shadow-xl border border-gray-600 mb-8 overflow-hidden">
              <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-black">Schedule New Training</h2>
                  <button 
                    onClick={handleCloseForm}
                    className="text-black hover:text-gray-700 transition-colors"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white">Training Type</label>
                      <select
                        name="type"
                        value={newTraining.type}
                        onChange={handleInputChange}
                        className="mt-1 p-2 block w-full rounded-md border border-gray-600 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 bg-gray-800 text-white"
                        required
                      >
                        <option value="">Select a type</option>
                        {trainingTypes.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-white">Trainer</label>
                      <select
                        name="trainer"
                        value={newTraining.trainer}
                        onChange={handleInputChange}
                        className="mt-1 p-2 block w-full rounded-md border border-gray-600 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 bg-gray-800 text-white"
                        required
                      >
                        <option value="">Select a trainer</option>
                        {trainers.map(trainer => (
                          <option key={trainer.id} value={trainer.id}>
                            {trainer.first_name} {trainer.last_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white">Date</label>
                      <input
                        type="date"
                        name="date"
                        value={newTraining.date}
                        onChange={handleInputChange}
                        className="mt-1 p-2 block w-full rounded-md border border-gray-600 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 bg-gray-800 text-white"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-white">Time</label>
                      <input
                        type="time"
                        name="time"
                        value={newTraining.time}
                        onChange={handleInputChange}
                        className="mt-1 p-2 block w-full rounded-md border border-gray-600 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 bg-gray-800 text-white"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-white">Duration (minutes)</label>
                      <input
                        type="number"
                        name="duration"
                        value={newTraining.duration}
                        onChange={handleInputChange}
                        className="mt-1 p-2 block w-full rounded-md border border-gray-600 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 bg-gray-800 text-white"
                        required
                        min="1"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white">Capacity (people)</label>
                      <input
                        type="number"
                        name="capacity"
                        value={newTraining.capacity}
                        onChange={handleInputChange}
                        className="mt-1 p-2 block w-full rounded-md border border-gray-600 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 bg-gray-800 text-white"
                        required
                        min="1"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-white">Description (Optional)</label>
                      <textarea
                        name="description"
                        value={newTraining.description}
                        onChange={handleInputChange}
                        className="mt-1 p-2 block w-full rounded-md border border-gray-600 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 bg-gray-800 text-white placeholder-gray-400"
                        rows="2"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-white">Training Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="mt-1 p-2 block w-full rounded-md border border-gray-600 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 bg-gray-800 text-white"
                    />
                    {newTraining.image && (
                      <p className="mt-1 text-sm text-gray-300">
                        Selected: {newTraining.image.name}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex justify-end space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseForm}
                      className="px-6 py-3 border-2 border-gray-600 text-white rounded-lg hover:bg-gray-600 transition-all font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all font-semibold shadow-lg disabled:opacity-50"
                    >
                      {isLoading ? 'Scheduling...' : 'Schedule Training'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          
          {/* Training Sessions Display */}
          <div className="bg-gray-700 rounded-2xl shadow-xl border border-gray-600 overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <h2 className="text-xl font-bold text-black mb-2 md:mb-0">Upcoming Training Sessions</h2>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                  <button 
                    onClick={() => setShowScheduleForm(true)} 
                    className="bg-black text-yellow-500 py-2 px-4 rounded-lg hover:bg-gray-800 transition-all font-semibold w-full sm:w-auto"
                    disabled={showScheduleForm || trainers.length === 0}
                  >
                    Schedule New Training
                  </button>
                  <button 
                    onClick={fetchTrainingSessions}
                    className="bg-gray-800 text-white py-2 px-4 rounded-lg hover:bg-gray-900 transition-all font-semibold w-full sm:w-auto"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-yellow-500 border-t-transparent"></div>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-600">
                      <thead className="bg-gray-600">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Image</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Training ID</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Trainer</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Date & Time</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Duration</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Capacity</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-gray-700 divide-y divide-gray-600">
                        {trainingSessions.length > 0 ? (
                          trainingSessions.map(session => (
                            <tr key={session.id} className="hover:bg-gray-600 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap">
                                {imageErrors.has(session.id) ? (
                                  <div className="h-12 w-12 bg-gray-600 rounded flex items-center justify-center">
                                    <span className="text-xs text-yellow-400">🏋️</span>
                                  </div>
                                ) : (
                                  <img 
                                    src={getImageUrl(session)}
                                    alt={session.type}
                                    className="h-12 w-12 object-cover rounded"
                                    onError={() => handleImageError(session.id)}
                                  />
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">
                                #{session.id}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="px-2 py-1 text-xs font-semibold bg-yellow-500 text-black rounded-full capitalize">
                                  {session.type}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                {session.trainer_name || 'TBA'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                {formatDateTime(session.datetime)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                {formatDuration(session.duration)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                {session.capacity || '—'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => deleteTraining(session.id)}
                                  className="text-red-400 hover:text-red-300 font-semibold"
                                >
                                  Cancel
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="8" className="px-4 py-8 text-center text-gray-300">
                              <div className="text-4xl text-yellow-400 mb-2">📅</div>
                              No training sessions scheduled
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Mobile Card View */}
                  <div className="md:hidden">
                    {trainingSessions.length > 0 ? (
                      <div className="space-y-4">
                        {trainingSessions.map(session => (
                          <div key={session.id} className="bg-gradient-to-r from-gray-700 to-gray-600 border border-gray-500 rounded-xl p-3 shadow-lg">
                            {/* Add image display */}
                            {session.image && !imageErrors.has(session.id) ? (
                              <div className="mb-2">
                                <img 
                                  src={getImageUrl(session)}
                                  alt={session.type}
                                  className="w-full h-32 object-cover rounded"
                                  onError={() => handleImageError(session.id)}
                                />
                              </div>
                            ) : imageErrors.has(session.id) ? (
                              <div className="mb-2 w-full h-32 bg-gray-600 rounded flex items-center justify-center">
                                <span className="text-yellow-400 text-2xl">🏋️</span>
                              </div>
                            ) : null}
                            <div className="flex justify-between">
                              <span className="font-semibold text-white">
                                #{session.id} - {session.type}
                              </span>
                              <button
                                onClick={() => deleteTraining(session.id)}
                                className="text-red-400 hover:text-red-300 font-semibold text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                            <div className="mt-2 space-y-1 text-sm">
                              <div><span className="text-gray-400">Trainer:</span> <span className="font-medium text-white">{session.trainer_name || 'TBA'}</span></div>
                              <div><span className="text-gray-400">Date:</span> <span className="font-medium text-white">{formatDateTime(session.datetime)}</span></div>
                              <div><span className="text-gray-400">Duration:</span> <span className="font-medium text-white">{formatDuration(session.duration)}</span></div>
                              <div><span className="text-gray-400">Capacity:</span> <span className="font-medium text-white">{session.capacity || '—'}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-4xl text-yellow-400 mb-2">📅</div>
                        <p className="text-gray-300">No training sessions scheduled</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={handleCancelAction}
        onConfirm={handleConfirmAction}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </>
  );
}

export default TrainingsPage;










