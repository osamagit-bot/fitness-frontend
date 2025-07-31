import { useEffect, useState } from "react";
import { useTheme } from '../contexts/ThemeContext';
import api from "../utils/api";
import { staticTrainings } from "../utils/staticData";
import AOS from 'aos';
import 'aos/dist/aos.css';

const Training = () => {
  const { classes } = useTheme();
  const [trainings, setTrainings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageErrors, setImageErrors] = useState(new Set());
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

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
    setIsClosing(true);
    setTimeout(() => {
      setSelectedTraining(null);
      setIsModalOpen(false);
      setIsClosing(false);
    }, 300);
  };

  useEffect(() => {
    AOS.init();
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
      <div className={`flex justify-center items-center min-h-[400px] ${classes.bg.secondary}`}>
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-400 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <div id="training" className={`min-h-screen ${classes.bg.primary} flex flex-col justify-center lg:px-32 px-4 md:px-5 pt-16 md:pt-24 lg:pt-16`}>
        <div className="text-center mb-8 md:mb-12">
          <h1 className={`text-2xl md:text-4xl lg:text-5xl font-bold ${classes.text.primary} mb-4`}>
            Our Training Programs
          </h1>
          <div className="w-24 md:w-32 h-1 bg-yellow-400 mx-auto rounded-full mb-4"></div>
          <p className={`text-base md:text-lg ${classes.text.secondary} max-w-2xl mx-auto px-2`}>
            Discover our comprehensive training programs designed to help you achieve your fitness goals with expert guidance.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
          {trainings.map((training, i) => (
            <div
              key={training.id}
              data-aos="fade-up"
              data-aos-delay={i * 200}
              data-aos-duration="800"
              className={`group ${classes.card.primary} rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 ${classes.border.primary}`}
            >
              <div className="relative h-48 md:h-64 overflow-hidden">
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
              <div className={`p-4 md:p-6 ${classes.bg.card}`}>
                <div className="text-center mb-4">
                  <h3 className={`text-lg md:text-2xl font-bold ${classes.text.primary} mb-2 group-hover:text-yellow-600 transition-colors capitalize`}>
                    {training.type}
                  </h3>
                  <p className="text-yellow-600 font-semibold text-base md:text-lg mb-3">
                    {training.trainer_name || 'Expert Trainer'}
                  </p>
                </div>
                <p className={`${classes.text.secondary} text-center mb-4 leading-relaxed text-sm md:text-base`}>
                  {training.description || `Professional ${training.type.toLowerCase()} training program.`}
                </p>
                <div className={`flex items-center justify-between text-xs ${classes.text.tertiary}`}>
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


      </div>

      {/* Enhanced Modal */}
      {isModalOpen && selectedTraining && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 md:p-4 z-50 ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`} style={{paddingTop: '2rem'}}>
          <div className={`${classes.bg.card} rounded-lg md:rounded-xl lg:rounded-2xl shadow-2xl w-full max-w-full sm:max-w-lg lg:max-w-xl max-h-[90vh] md:max-h-[85vh] overflow-y-auto transform transition-all duration-300 ${isClosing ? 'animate-slideDown' : 'animate-slideUp'}`}>
            <div className="relative">

              {/* Modal Header with Image */}
              <div className="relative h-40 md:h-48 lg:h-64 overflow-hidden rounded-t-lg md:rounded-t-xl lg:rounded-t-2xl">
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
                  className="absolute top-3 right-3 md:top-4 md:right-4 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full p-2 transition-all duration-200 hover:scale-110 z-10"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="absolute bottom-2 md:bottom-4 left-3 md:left-6 right-3 md:right-6">
                  <h2 className="text-lg md:text-2xl lg:text-3xl font-bold text-white mb-1 md:mb-2">{selectedTraining.type}</h2>
                  <div className="flex items-center text-yellow-400">
                    <span className="w-2 md:w-3 h-2 md:h-3 bg-yellow-400 rounded-full mr-2"></span>
                    <span className="font-semibold text-sm md:text-base">{selectedTraining.trainer_name || 'Expert Trainer'}</span>
                  </div>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-4 md:p-6 lg:p-8">
                <div className="mb-6">
                  <h3 className={`text-lg font-bold ${classes.text.primary} mb-3`}>Training Description</h3>
                  <p className={`${classes.text.secondary} leading-relaxed`}>
                    {selectedTraining.description || `Professional ${selectedTraining.type.toLowerCase()} training program designed to help you achieve your fitness goals.`}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
                  <div className={`${classes.bg.tertiary} rounded-lg md:rounded-xl p-3 md:p-4 ${classes.border.primary} border`}>
                    <h4 className={`font-bold ${classes.text.primary} mb-3 flex items-center`}>
                      <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                      Trainer Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className={classes.text.secondary}>Name:</span>
                        <span className={`ml-2 font-semibold ${classes.text.primary}`}>{selectedTraining.trainer_name || selectedTraining.trainer?.first_name + ' ' + selectedTraining.trainer?.last_name || 'Expert Trainer'}</span>
                      </div>
                      <div>
                        <span className={classes.text.secondary}>Email:</span>
                        <span className={`ml-2 font-semibold ${classes.text.primary}`}>{selectedTraining.trainer?.email || selectedTraining.trainer_email || 'contact@gym.com'}</span>
                      </div>
                    </div>
                  </div>

                  <div className={`${classes.bg.secondary} rounded-lg md:rounded-xl p-3 md:p-4 ${classes.border.primary} border`}>
                    <h4 className={`font-bold ${classes.text.primary} mb-3 flex items-center`}>
                      <span className={`w-3 h-3 ${classes.text.primary === 'text-white' ? 'bg-white' : 'bg-black'} rounded-full mr-2`}></span>
                      Session Details
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className={classes.text.secondary}>Duration:</span>
                        <span className={`ml-2 font-semibold ${classes.text.primary}`}>{formatDuration(selectedTraining.duration)}</span>
                      </div>
                      <div>
                        <span className={classes.text.secondary}>Capacity:</span>
                        <span className={`ml-2 font-semibold ${classes.text.primary}`}>{selectedTraining.capacity || 'Limited'} participants</span>
                      </div>
                      <div>
                        <span className={classes.text.secondary}>Schedule:</span>
                        <span className={`ml-2 font-semibold ${classes.text.primary}`}>{formatDateTime(selectedTraining.datetime)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                  <button
                    onClick={closeModal}
                    className={`flex-1 ${classes.button.secondary} py-3 md:py-3 px-4 md:px-6 rounded-lg md:rounded-xl transition-all duration-200 font-semibold hover:scale-105 text-sm md:text-base`}
                  >
                    Close
                  </button>
                  <button className="flex-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black py-3 md:py-3 px-4 md:px-6 rounded-lg md:rounded-xl hover:from-yellow-500 hover:to-yellow-600 transition-all duration-200 font-semibold shadow-lg hover:scale-105 text-sm md:text-base">
                    Book Session
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Custom animations */}
      <style jsx="true">{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slideUp {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        
        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
        
        @keyframes slideDown {
          from {
            transform: translateY(0);
            opacity: 1;
          }
          to {
            transform: translateY(30px);
            opacity: 0;
          }
        }
        
        .animate-fadeOut {
          animation: fadeOut 0.3s ease-out;
        }
        
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default Training;
