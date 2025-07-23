import { useEffect, useState } from "react";
import api from "../utils/api";
import { staticTrainings } from "../utils/staticData";

const Training = () => {
  const [trainings, setTrainings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageErrors, setImageErrors] = useState(new Set());
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleImageError = (trainingId) => {
    setImageErrors(prev => new Set([...prev, trainingId]));
  };

  const getImageUrl = (training) => {
    if (!training.image) return '/images/chest.jpeg';
    
    // If it's already a local path, return as is
    if (training.image.startsWith('/images/')) {
      return training.image;
    }
    
    if (training.image.startsWith('http')) {
      return training.image;
    }
    
    const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace('/api', '');
    return `${baseUrl}${training.image}`;
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'Not scheduled';
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'Not specified';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins} minutes`;
  };

  const openModal = (training) => {
    setSelectedTraining(training);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedTraining(null);
    setIsModalOpen(false);
  };

  useEffect(() => {
    fetchTrainings();
  }, []);

  const fetchTrainings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('trainings/');
      const trainingData = response.data.results || response.data;
      setTrainings(Array.isArray(trainingData) ? trainingData.slice(0, 4) : []);
    } catch (error) {
      console.error('Error fetching trainings:', error);
      setError('Failed to load trainings');
      // Fallback to static data if API fails
      setTrainings(staticTrainings);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px] bg-gradient-to-br from-yellow-50 to-white">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-400 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-white flex flex-col justify-center lg:px-32 px-5 pt-24 lg:pt-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">
            Our Training Programs
          </h1>
          <div className="w-32 h-1 bg-yellow-400 mx-auto rounded-full mb-4"></div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover our comprehensive training programs designed to help you achieve your fitness goals with expert guidance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {trainings.map((training) => (
            <div
              key={training.id}
              className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-yellow-200"
            >
              <div className="relative h-64 overflow-hidden">
                {imageErrors.has(training.id) ? (
                  <div className="h-full w-full bg-gradient-to-br from-yellow-100 to-yellow-200 flex items-center justify-center">
                    <span className="text-yellow-600 text-5xl">🏋️</span>
                  </div>
                ) : (
                  <img
                    className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                    src={getImageUrl(training)}
                    alt={training.type}
                    onError={() => handleImageError(training.id)}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute bottom-4 left-4 right-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 opacity-0 group-hover:opacity-100">
                  <button 
                    onClick={() => openModal(training)}
                    className="w-full bg-yellow-400 text-black py-2 px-4 rounded-lg font-semibold hover:bg-yellow-500 transition-colors"
                  >
                    View Details
                  </button>
                </div>
                {/* Training Type Badge */}
                <div className="absolute top-4 left-4 z-20">
                  <span className="bg-black text-yellow-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                    {training.type}
                  </span>
                </div>
              </div>
              <div className="p-6 bg-gradient-to-br from-white to-yellow-50">
                <div className="text-center mb-4">
                  <h3 className="text-2xl font-bold text-black mb-2 group-hover:text-yellow-600 transition-colors capitalize">
                    {training.type}
                  </h3>
                  <p className="text-yellow-600 font-semibold text-lg mb-3">
                    {training.trainer_name || 'Expert Trainer'}
                  </p>
                </div>
                <p className="text-gray-700 text-center mb-4 leading-relaxed">
                  {training.description || `Professional ${training.type.toLowerCase()} training program.`}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                    {training.trainer_name || 'Expert Trainer'}
                  </span>
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-semibold">
                    {training.capacity || 'Limited'} spots
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-8 p-4 bg-yellow-100 border-l-4 border-yellow-400 text-yellow-800 rounded-r-lg text-center">
            <p className="font-semibold">Notice</p>
            <p className="text-sm">Using sample training data due to: {error}</p>
          </div>
        )}
      </div>

      {/* Enhanced Modal */}
      {isModalOpen && selectedTraining && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="relative">
              {/* Modal Header with Image */}
              <div className="relative h-64 overflow-hidden rounded-t-2xl">
                {imageErrors.has(selectedTraining.id) ? (
                  <div className="h-full w-full bg-gradient-to-br from-yellow-100 to-yellow-200 flex items-center justify-center">
                    <span className="text-yellow-600 text-6xl">🏋️</span>
                  </div>
                ) : (
                  <img
                    src={getImageUrl(selectedTraining)}
                    alt={selectedTraining.type}
                    className="h-full w-full object-cover"
                    onError={() => handleImageError(selectedTraining.id)}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <button
                  onClick={closeModal}
                  className="absolute top-4 right-4 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full p-2 transition-all"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="absolute bottom-4 left-6 right-6">
                  <h2 className="text-3xl font-bold text-white mb-2">{selectedTraining.type}</h2>
                  <div className="flex items-center text-yellow-400">
                    <span className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></span>
                    <span className="font-semibold">{selectedTraining.trainer_name || 'Expert Trainer'}</span>
                  </div>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-8">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-black mb-3">Training Description</h3>
                  <p className="text-gray-600 leading-relaxed">
                    {selectedTraining.description || `Professional ${selectedTraining.type.toLowerCase()} training program designed to help you achieve your fitness goals.`}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                    <h4 className="font-bold text-black mb-3 flex items-center">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                      Trainer Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Name:</span>
                        <span className="ml-2 font-semibold text-black">{selectedTraining.trainer_name || selectedTraining.trainer?.first_name + ' ' + selectedTraining.trainer?.last_name || 'Expert Trainer'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Email:</span>
                        <span className="ml-2 font-semibold text-black">{selectedTraining.trainer?.email || selectedTraining.trainer_email || 'contact@gym.com'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h4 className="font-bold text-black mb-3 flex items-center">
                      <span className="w-3 h-3 bg-black rounded-full mr-2"></span>
                      Session Details
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Duration:</span>
                        <span className="ml-2 font-semibold text-black">{formatDuration(selectedTraining.duration)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Capacity:</span>
                        <span className="ml-2 font-semibold text-black">{selectedTraining.capacity || 'Limited'} participants</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Schedule:</span>
                        <span className="ml-2 font-semibold text-black">{formatDateTime(selectedTraining.datetime)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={closeModal}
                    className="flex-1 bg-gray-200 text-black py-3 px-6 rounded-xl hover:bg-gray-300 transition-all font-semibold"
                  >
                    Close
                  </button>
                  <button className="flex-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black py-3 px-6 rounded-xl hover:from-yellow-500 hover:to-yellow-600 transition-all font-semibold shadow-lg">
                    Book Session
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Training;
