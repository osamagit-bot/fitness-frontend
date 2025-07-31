import { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import AOS from 'aos';
import 'aos/dist/aos.css';

const Testimonials = () => {
  const { classes } = useTheme();

  useEffect(() => {
    AOS.init();
  }, []);
  const testimonials = [
    {
      id: 1,
      name: "Ahmad Seyar",
      quote: "After 6 months, I've lost 30lbs and gained so much confidence. The trainers here are amazing!",
      image: "./images/man.jpg", 
      transformation: "Lost 30lbs in 6 months"
    },
    {
      id: 2,
      name: "Qais Ahmad",
      quote: "The personalized training program helped me build muscle and improve my overall strength. Best decision ever!",
      image: "./images/man.jpg",
      transformation: "Gained 15lbs of muscle"
    },
    {
      id: 3,
      name: "Tamim Yousufi",
      quote: "I never thought I could enjoy working out until I joined this gym. The community here is so supportive!",
      image: "./images/boost.jpg", 
      transformation: "Improved fitness and energy levels"
    }
  ];

  return (
    <section className={`py-8 md:py-16 ${classes.bg.primary}`}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 md:mb-12">
          <h2 className={`text-2xl md:text-3xl lg:text-4xl font-bold ${classes.text.primary} mb-4`}>Success <span className='text-yellow-400'>Stories</span></h2>
          <div className="w-16 md:w-24 h-1 bg-yellow-500 mx-auto"></div>
          <p className={`mt-4 text-sm md:text-base ${classes.text.secondary} max-w-2xl mx-auto px-2`}>
            Our members achieve amazing results with dedication and our expert guidance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
          {testimonials.map((testimonial, i) => (
            <div 
              key={testimonial.id}
              data-aos="fade-up"
              data-aos-delay={i * 200}
              data-aos-duration="800"
              className={`${classes.card.primary} rounded-lg overflow-hidden shadow-lg transition-transform duration-300 hover:transform hover:scale-105`}
            >
              <div className="h-48 md:h-64 bg-yellow-100 relative overflow-hidden">
                <img 
                  src={testimonial.image} 
                  alt={testimonial.name} 
                  className="object-cover h-full w-full"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://via.placeholder.com/400x400?text=Member";
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-yellow-500 py-2 px-3 md:px-4">
                  <p className="font-bold text-black text-xs md:text-sm">{testimonial.transformation}</p>
                </div>
              </div>
              <div className="p-4 md:p-6">
                <div className="flex items-center mb-3 md:mb-4">
                  <div className="w-2 h-8 md:h-10 bg-yellow-500 mr-3 md:mr-4"></div>
                  <h3 className={`text-lg md:text-xl font-bold ${classes.text.primary}`}>{testimonial.name}</h3>
                </div>
                <p className={`${classes.text.secondary} italic text-sm md:text-base leading-relaxed`}>"{testimonial.quote}"</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8 md:mt-12">
          <button className="px-6 md:px-8 py-2.5 md:py-3 bg-yellow-500 text-black font-bold rounded-full hover:bg-yellow-600 transition-colors duration-300 shadow-lg text-sm md:text-base">
            Read More Success Stories
          </button>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
