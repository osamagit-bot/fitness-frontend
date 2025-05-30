import React from 'react';

const TrainerProfiles = () => {
  const trainers = [
    {
      id: 1,
      name: "Michael Scott",
      title: "Head Trainer",
      specialties: ["Strength Training", "HIIT", "Weight Loss"],
      bio: "Michael has been transforming lives with his expertise in strength training for over 10 years. His innovative training methods have helped hundreds of clients achieve their fitness goals.",
      image: "./images/trainer1.jpg", // Replace with actual image path
      certifications: ["NASM CPT", "NSCA CSCS", "CrossFit L3"]
    },
    {
      id: 2,
      name: "Jennifer Wong",
      title: "Nutrition Specialist",
      specialties: ["Nutrition Coaching", "Weight Management", "Contest Prep"],
      bio: "Jennifer combines her knowledge of nutrition science with practical coaching to help clients build sustainable eating habits that support their fitness goals.",
      image: "./images/trainer2.jpg",// Replace with actual image path
      certifications: ["Precision Nutrition L2", "ISSA Nutritionist", "ACE CPT"]
    },
    {
      id: 3,
      name: "Marcus Johnson",
      title: "Mobility Coach",
      specialties: ["Flexibility", "Injury Prevention", "Yoga"],
      bio: "Marcus specializes in helping clients improve their mobility and prevent injuries. His background in physical therapy informs his approach to functional movement.",
      image: "./images/trainer3.jpg", // Replace with actual image path
      certifications: ["NASM CES", "FRC Mobility Specialist", "200hr YTT"]
    },
    {
      id: 4,
      name: "Aisha Patel",
      title: "Group Fitness Instructor",
      specialties: ["HIIT Classes", "Spin", "Dance Fitness"],
      bio: "Aisha's high-energy classes combine fun with results-driven exercises. Her background in competitive dance brings a unique perspective to fitness.",
      image: "./images/trainer4.jpg",// Replace with actual image path
      certifications: ["ACE GFI", "Schwinn Cycling", "Zumba"]
    }
  ];

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-black mb-4">Meet Our <span className='text-yellow-400'>Expert</span> Trainers</h2>
          <div className="w-24 h-1 bg-yellow-500 mx-auto"></div>
          <p className="mt-4 text-gray-800 max-w-2xl mx-auto">
            Our certified fitness professionals are dedicated to helping you achieve your goals
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {trainers.map((trainer) => (
            <div 
              key={trainer.id} 
              className="group bg-white rounded-lg overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl"
            >
              <div className="h-72 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-60 transition-opacity duration-300 z-10"></div>
                <img 
                  src={trainer.image} 
                  alt={trainer.name} 
                  className="object-cover h-full w-full transform transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://via.placeholder.com/400x500?text=Trainer";
                  }}
                />
              </div>
              
              <div className="p-6 border-t-4 border-yellow-500">
                <h3 className="text-xl font-bold text-black">{trainer.name}</h3>
                <p className="text-yellow-600 font-semibold">{trainer.title}</p>
                
                <div className="my-4">
                  <p className="text-gray-700 mb-3 text-sm">Specializes in:</p>
                  <div className="flex flex-wrap gap-2">
                    {trainer.specialties.map((specialty, index) => (
                      <span 
                        key={index} 
                        className="bg-gray-100 text-gray-800 text-xs font-medium py-1 px-2 rounded"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm mt-4 line-clamp-3">{trainer.bio}</p>
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-gray-700 text-xs mb-2">Certifications:</p>
                  <div className="flex flex-wrap gap-1">
                    {trainer.certifications.map((cert, index) => (
                      <span 
                        key={index} 
                        className="bg-black text-white text-xs py-1 px-2 rounded"
                      >
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="px-6 pb-6">
                <button className="w-full py-2 bg-yellow-500 text-black rounded font-medium hover:bg-yellow-600 transition-colors duration-300">
                  View Full Profile
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <button className="px-8 py-3 bg-black text-white font-bold rounded-full hover:bg-gray-900 transition-colors duration-300 shadow-lg">
            Book a Session With a Trainer
          </button>
        </div>
      </div>
    </section>
  );
};

export default TrainerProfiles;