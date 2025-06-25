import { useEffect, useState } from 'react';
import api from '../../utils/api';
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
    description: ''
  });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const formattedDateTime = `${newTraining.date}T${newTraining.time}:00`;
      
      // Create the payload with the correct field names
      const payload = {
        trainer: parseInt(newTraining.trainer), // Send trainer ID as integer
        type: newTraining.type,
        datetime: formattedDateTime,
        duration: parseInt(newTraining.duration),
        capacity: parseInt(newTraining.capacity),
        description: newTraining.description || ''
      };
      
      console.log('Sending training data:', payload);

      const response = await api.post('trainings/', 
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      console.log('Training response:', response.data);

      setNewTraining({
        type: '',
        trainer: '',
        date: '',
        time: '',
        duration: '',
        capacity: '',
        description: ''
      });
      
      setShowScheduleForm(false);
      fetchTrainingSessions();
      alert('Training session scheduled successfully!');
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

  const deleteTraining = async (trainingId) => {
    if (window.confirm('Are you sure you want to cancel this training session?')) {
      try {
        const token = localStorage.getItem('access_token');
        
        await api.delete(`trainings/${trainingId}/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        setTrainingSessions(trainingSessions.filter(session => session.id !== trainingId));
        alert('Training session cancelled successfully!');
      } catch (error) {
        console.error('Error cancelling training:', error);
        alert('Failed to cancel training session');
      }
    }
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

  return (
    <div className="p-2 md:p-4">
      <h1 className="text-xl md:text-2xl font-bold mb-3 md:mb-6">Training Management</h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          <p className="font-semibold">Error</p>
          <p className="text-sm md:text-base whitespace-pre-line">{error}</p>
        </div>
      )}
      
      {/* Add Training Form */}
      {showScheduleForm && (
        <div className="bg-white p-3 md:p-6 rounded-lg shadow-md mb-4 md:mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg md:text-xl font-semibold">Schedule New Training</h2>
            <button 
              onClick={() => setShowScheduleForm(false)}
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
                <label className="block text-sm font-medium text-gray-700">Training Type</label>
                <select
                  name="type"
                  value={newTraining.type}
                  onChange={handleInputChange}
                  className="mt-1 p-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a type</option>
                  {trainingTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Trainer</label>
                <select
                  name="trainer"
                  value={newTraining.trainer}
                  onChange={handleInputChange}
                  className="mt-1 p-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  name="date"
                  value={newTraining.date}
                  onChange={handleInputChange}
                  className="mt-1 p-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Time</label>
                <input
                  type="time"
                  name="time"
                  value={newTraining.time}
                  onChange={handleInputChange}
                  className="mt-1 p-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
                <input
                  type="number"
                  name="duration"
                  value={newTraining.duration}
                  onChange={handleInputChange}
                  className="mt-1 p-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  min="1"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Capacity (people)</label>
                <input
                  type="number"
                  name="capacity"
                  value={newTraining.capacity}
                  onChange={handleInputChange}
                  className="mt-1 p-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                <textarea
                  name="description"
                  value={newTraining.description}
                  onChange={handleInputChange}
                  className="mt-1 p-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows="2"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowScheduleForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
                disabled={isLoading}
              >
                {isLoading ? 'Scheduling...' : 'Schedule Training'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Training Sessions Display */}
      <div className="bg-white p-3 md:p-6 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
          <h2 className="text-lg md:text-xl font-semibold mb-2 md:mb-0">Upcoming Training Sessions</h2>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
            <button 
              onClick={() => setShowScheduleForm(true)} 
              className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 w-full sm:w-auto"
              disabled={showScheduleForm || trainers.length === 0}
            >
              Schedule New Training
            </button>
            <button 
              onClick={fetchTrainingSessions}
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Training ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trainer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {trainingSessions.length > 0 ? (
                    trainingSessions.map(session => (
                      <tr key={session.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{session.id}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {/* Try to use get_type_display value if available, otherwise fallback to type */}
                          {session.get_type_display || session.type}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {session.trainer_name || `Trainer #${session.trainer}`}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {formatDateTime(session.datetime)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {formatDuration(session.duration)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {session.capacity}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => deleteTraining(session.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-4 py-6 text-center text-gray-500">
                        No training sessions found
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
                    <div key={session.id} className="border rounded-lg p-3">
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-900">
                          {session.get_type_display || session.type}
                        </span>
                        <button
                          onClick={() => deleteTraining(session.id)}
                          className="text-red-600 hover:text-red-900 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                        <span className="text-gray-500">Trainer:</span>
                        <span>{session.trainer_name || `Trainer #${session.trainer}`}</span>
                        
                        <span className="text-gray-500">Date & Time:</span>
                        <span>{formatDateTime(session.datetime)}</span>
                        
                        <span className="text-gray-500">Duration:</span>
                        <span>{formatDuration(session.duration)}</span>
                        
                        <span className="text-gray-500">Capacity:</span>
                        <span>{session.capacity}</span>
                        
                        {session.description && (
                          <>
                            <span className="text-gray-500">Description:</span>
                            <span className="col-span-1">{session.description}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  No training sessions found
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default TrainingsPage;
