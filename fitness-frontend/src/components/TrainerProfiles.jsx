import { useEffect, useState } from "react";
import api from "../services/api";

const TrainerProfiles = () => {
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [trainers, setTrainers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageErrors, setImageErrors] = useState(new Set());

  const getImageUrl = (trainer) => {
    console.log('Trainer image data:', trainer.image);
    
    if (!trainer.image) return "/images/trainer1.png";
    
    if (trainer.image.startsWith('http')) {
      return trainer.image;
    }
    
    // Fix: Remove /api from base URL for media files
    const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace('/api', '');
    const fullUrl = `${baseUrl}${trainer.image}`;
    console.log('Constructed URL:', fullUrl);
    return fullUrl;
  };

  const handleImageError = (trainerId) => {
    setImageErrors(prev => new Set([...prev, trainerId]));
  };

  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('trainers/');
      const trainersData = response.data.results || response.data;
      setTrainers(Array.isArray(trainersData) ? trainersData : []);
    } catch (error) {
      console.error('Error fetching trainers:', error);
      setError('Failed to load trainers');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <section className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold text-black mb-6">
              Meet Our <span className="text-yellow-500">Expert</span> Trainers
            </h1>
            <div className="w-32 h-1 bg-gradient-to-r from-yellow-400 to-yellow-600 mx-auto rounded-full mb-6"></div>
            <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Our certified fitness professionals are here to guide you on your journey to achieving your health and fitness goals with personalized training programs.
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center items-center py-20">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-400 border-t-transparent"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-yellow-600 text-2xl">💪</span>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-r-xl shadow-lg mb-8">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-red-800">Unable to Load Trainers</h3>
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Trainers Grid */}
          {!isLoading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {trainers.map((trainer) => (
                <div
                  key={trainer.id}
                  className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 border border-yellow-200"
                >
                  {/* Trainer Image */}
                  <div className="relative h-80 overflow-hidden bg-gradient-to-br from-yellow-100 to-yellow-200">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"></div>
                    
                    {imageErrors.has(trainer.id) ? (
                      <div className="h-full w-full flex items-center justify-center">
                        <div className="text-center">
                          <span className="text-yellow-600 text-6xl mb-4 block">👤</span>
                          <p className="text-yellow-700 font-semibold">Photo Coming Soon</p>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={getImageUrl(trainer)}
                        alt={`${trainer.first_name} ${trainer.last_name}`}
                        className="object-cover h-full w-full transform transition-transform duration-700 group-hover:scale-110"
                        onError={() => handleImageError(trainer.id)}
                      />
                    )}

                    {/* Overlay Content */}
                    <div className="absolute bottom-4 left-4 right-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 opacity-0 group-hover:opacity-100 z-20">
                      <button
                        onClick={() => {
                          setSelectedTrainer(trainer);
                          setIsModalOpen(true);
                        }}
                        className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-black py-3 px-4 rounded-xl font-bold hover:from-yellow-500 hover:to-yellow-600 transition-all shadow-lg"
                      >
                        View Full Profile
                      </button>
                    </div>

                    {/* Specialization Badge */}
                    <div className="absolute top-4 right-4 z-20">
                      <span className="bg-black text-yellow-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                        {trainer.specialization || "Fitness"}
                      </span>
                    </div>
                  </div>
                  
                  {/* Trainer Info */}
                  <div className="p-6 bg-gradient-to-br from-white to-yellow-50">
                    <div className="text-center mb-4">
                      <h3 className="text-2xl font-bold text-black mb-2 group-hover:text-yellow-600 transition-colors">
                        {trainer.first_name} {trainer.last_name}
                      </h3>
                      <p className="text-yellow-600 font-semibold text-lg mb-3">
                        {trainer.specialization || "Fitness Trainer"}
                      </p>
                    </div>

                    {/* Quick Stats */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-center text-sm text-gray-600">
                        <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                        <span>Certified Professional</span>
                      </div>
                      <div className="flex items-center justify-center text-sm text-gray-600">
                        <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                        <span>Personalized Training</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setSelectedTrainer(trainer);
                        setIsModalOpen(true);
                      }}
                      className="w-full bg-gradient-to-r from-black to-gray-800 text-yellow-400 py-3 px-4 rounded-xl hover:from-gray-800 hover:to-black transition-all duration-300 font-semibold shadow-lg"
                    >
                      Learn More
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && trainers.length === 0 && (
            <div className="text-center py-20">
              <div className="text-8xl text-yellow-400 mb-6">👥</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">No Trainers Available</h3>
              <p className="text-gray-600 text-lg">Our amazing trainers will be here soon!</p>
            </div>
          )}
        </div>

        {/* Enhanced Modal */}
        {isModalOpen && selectedTrainer && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="relative">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 p-6 rounded-t-3xl">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="absolute top-4 right-4 bg-black bg-opacity-20 hover:bg-opacity-40 text-white rounded-full p-2 transition-all"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  
                  <div className="text-center">
                    <h2 className="text-3xl font-bold text-black mb-2">
                      {selectedTrainer.first_name} {selectedTrainer.last_name}
                    </h2>
                    <p className="text-black text-lg font-semibold">
                      {selectedTrainer.specialization || "Fitness Trainer"}
                    </p>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="p-8">
                  <div className="flex flex-col lg:flex-row gap-8">
                    {/* Trainer Image */}
                    <div className="lg:w-1/3">
                      <div className="relative">
                        {imageErrors.has(selectedTrainer.id) ? (
                          <div className="w-full h-80 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-2xl flex items-center justify-center">
                            <div className="text-center">
                              <span className="text-yellow-600 text-8xl mb-4 block">👤</span>
                              <p className="text-yellow-700 font-semibold">Photo Coming Soon</p>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={getImageUrl(selectedTrainer)}
                            alt={`${selectedTrainer.first_name} ${selectedTrainer.last_name}`}
                            className="w-full h-80 rounded-2xl object-cover shadow-lg"
                            onError={(e) => {
                              e.target.onerror = null;
                              handleImageError(selectedTrainer.id);
                            }}
                          />
                        )}
                        
                        {/* Specialization Badge */}
                        <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
                          <span className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black px-6 py-2 rounded-full font-bold shadow-lg">
                            {selectedTrainer.specialization || "General Fitness"}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Trainer Details */}
                    <div className="lg:w-2/3 mt-6 lg:mt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Contact Information */}
                        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl p-6 border border-yellow-200">
                          <h4 className="font-bold text-black mb-4 flex items-center text-lg">
                            <span className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></span>
                            Contact Information
                          </h4>
                          <div className="space-y-3">
                            <div className="flex items-center">
                              <svg className="h-5 w-5 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span className="text-gray-700 font-medium">{selectedTrainer.email}</span>
                            </div>
                            <div className="flex items-center">
                              <svg className="h-5 w-5 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <span className="text-gray-700 font-medium">{selectedTrainer.phone}</span>
                            </div>
                          </div>
                        </div>

                        {/* Professional Details */}
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
                          <h4 className="font-bold text-black mb-4 flex items-center text-lg">
                            <span className="w-3 h-3 bg-black rounded-full mr-3"></span>
                            Professional Details
                          </h4>
                          <div className="space-y-3">
                            <div className="flex items-center">
                              <svg className="h-5 w-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 6v6m-4-6h8m-8 0V9a2 2 0 012-2h4a2 2 0 012 2v4" />
                              </svg>
                              <span className="text-gray-700 font-medium">Started: {new Date(selectedTrainer.start_date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center">
                              <svg className="h-5 w-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                              </svg>
                              <span className="text-gray-700 font-medium">Certified Professional</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="mt-6 bg-white rounded-2xl p-6 border-2 border-yellow-200">
                        <h4 className="font-bold text-black mb-4 text-lg">About {selectedTrainer.first_name}</h4>
                        <p className="text-gray-700 leading-relaxed">
                          {selectedTrainer.first_name} is a certified fitness professional specializing in {selectedTrainer.specialization || "general fitness training"}. 
                          With years of experience and dedication to helping clients achieve their fitness goals, {selectedTrainer.first_name} provides 
                          personalized training programs tailored to individual needs and fitness levels.
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-8 flex flex-col sm:flex-row gap-4">
                        <button
                          onClick={() => setIsModalOpen(false)}
                          className="flex-1 bg-gray-200 text-black py-4 px-6 rounded-xl hover:bg-gray-300 transition-all font-semibold"
                        >
                          Close Profile
                        </button>
                        <button className="flex-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black py-4 px-6 rounded-xl hover:from-yellow-500 hover:to-yellow-600 transition-all font-semibold shadow-lg">
                          Book Training Session
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
};

export default TrainerProfiles;
