import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

const schedule = [
  {
    day: "Saturday",
    muscleGroup: "Chest",
    images: [
      "/images/chest1.jpg",
      "/images/chest2.png",
      "/images/chest3.jpg",
      "/images/chest4.jpeg"
    ],
  },
  {
    day: "Sunday",
    muscleGroup: "Back",
    images: [
      
    ],
  },
  {
    day: "Monday",
    muscleGroup: "Biceps",
    images: [

    ],
  },
  {
    day: "Tuesday",
    muscleGroup: "Triceps",
    images: [

    ],
  },
  {
    day: "Wednesday",
    muscleGroup: "Shoulders",
    images: [
     
    ],
  },
  {
    day: "Thursday",
    muscleGroup: "Legs",
    images: [

    ],
  },
  {
    day: "Friday",
    muscleGroup: "Core",
    images: [
 
    ],
  },
];

const SchedulePage = () => {
  const { classes } = useTheme();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(false);
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, [location.pathname]);
  
  return (
    <div className={`min-h-screen ${classes.bg.primary} p-6`}>
      <div className="max-w-7xl mx-auto pt-24">
        {/* Header Section */}
        <div className={`text-center mb-16 transform transition-all duration-1000 ease-out ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <h1 className={`text-5xl md:text-6xl font-bold ${classes.text.primary} mb-4`}>
            Weekly <span className={classes.text.accent}>Training</span> Schedule
          </h1>
          <div className="w-32 h-1 bg-yellow-400 mx-auto rounded-full mb-6"></div>
          <p className={`text-lg ${classes.text.secondary} max-w-2xl mx-auto`}>
            Follow our expertly designed weekly muscle group focus to maximize your gains and achieve optimal results.
          </p>
        </div>

        {/* Schedule Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {schedule.map((item, idx) => (
            <div key={idx} className={`group ${classes.card.primary} rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 ${classes.border.primary} border ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
            }`} style={{ transitionDelay: `${idx * 100 + 200}ms` }}>
              {/* Day Header */}
              <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-6 text-center">
                <h2 className="text-2xl font-bold text-black mb-2">
                  {item.day}
                </h2>
                <div className="w-16 h-1 bg-black mx-auto rounded-full"></div>
              </div>
              
              {/* Muscle Group */}
              <div className={`p-6 ${classes.bg.card}`}>
                <div className="text-center mb-6">
                  <h3 className={`text-3xl font-bold ${classes.text.primary} mb-3 group-hover:text-yellow-600 transition-colors`}>
                    {item.muscleGroup}
                  </h3>
                  <div className="flex items-center justify-center">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                    <span className={`text-sm ${classes.text.secondary} font-medium`}>Focus Area</span>
                  </div>
                </div>
                
                {/* Images Grid - Always show 4 slots */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="relative overflow-hidden rounded-xl group/img">
                      {item.images[i] ? (
                        <>
                          <img
                            src={`${item.images[i]}?v=${idx}-${i}`}
                            alt={`${item.muscleGroup} workout ${i + 1}`}
                            className="w-full h-24 object-cover transition-transform duration-300 group-hover/img:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-300"></div>
                        </>
                      ) : (
                        <div className={`${classes.bg.secondary} w-full h-24 flex items-center justify-center rounded-xl`}>
                          <span className={`${classes.text.tertiary} text-2xl`}>+</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Action Button */}
                <button className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-black py-3 px-4 rounded-xl hover:from-yellow-500 hover:to-yellow-600 transition-all duration-300 font-semibold shadow-lg group-hover:shadow-xl">
                  View Exercises
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {/* Bottom CTA */}
        <div className={`text-center mt-16 transform transition-all duration-1000 ease-out ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`} style={{ transitionDelay: '1000ms' }}>
          <div className={`${classes.bg.secondary} rounded-2xl p-8 ${classes.border.primary} border`}>
            <h3 className={`text-2xl font-bold ${classes.text.primary} mb-4`}>Ready to Start Your Journey?</h3>
            <p className={`${classes.text.secondary} mb-6`}>Join our gym today and follow this proven training schedule for maximum results.</p>
            <button className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black py-3 px-8 rounded-xl hover:from-yellow-500 hover:to-yellow-600 transition-all duration-300 font-semibold shadow-lg">
              Get Started Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchedulePage;
