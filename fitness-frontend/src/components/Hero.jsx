import { useEffect, useState, useRef } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';

function Hero() {
  const [isVisible, setIsVisible] = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    setIsVisible(true);
    AOS.init();

    const handleScroll = () => {
      if (heroRef.current) {
        const scrollPosition = window.scrollY;
        const parallaxFactor = 0.4;
        heroRef.current.style.backgroundPosition = `center ${scrollPosition * parallaxFactor}px`;
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      ref={heroRef}
      className="relative w-full flex flex-col justify-center items-center bg-cover bg-center bg-fixed bg-[url('/images/body6.jpg')] min-h-screen sm:min-h-[700px] overflow-hidden"
    >
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80 z-0" />

      {/* Floating Particles */}
      <div className="absolute inset-0 z-0 opacity-30">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-yellow-400"
            style={{
              width: `${Math.random() * 8 + 2}px`,
              height: `${Math.random() * 8 + 2}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `float ${Math.random() * 10 + 10}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Hero Content */}
      <div
        className={`z-10 text-center px-4 sm:px-6 lg:px-8 mt-20 sm:mt-28 md:mt-32 lg:mt-40 transition-all duration-1000 ease-out transform ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}
      >
        {/* Heading */}
        {[
          { text: 'REACH YOUR ', span: 'LIMITS', delay: '0.2s' },
          { text: 'AND GET TO THE', span: '', delay: '0.4s' },
          { text: '', span: 'NEXT LEVEL', delay: '0.6s' },
        ].map((line, i) => (
          <div className="overflow-hidden" key={i}>
            <h1
              className="hero-text text-white text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bold tracking-wide leading-tight mb-3 sm:mb-5"
              style={{
                animation: 'slideInUp 0.8s ease-out forwards',
                animationDelay: line.delay,
                opacity: 0,
              }}
            >
              {line.text}
              {line.span && <span className="text-yellow-400">{line.span}</span>}
            </h1>
          </div>
        ))}

        {/* Paragraph */}
        <p
          className="w-full sm:w-[90%] md:w-[80%] lg:w-[70%] mt-6 sm:mt-8 md:mt-10 text-white/80 mx-auto text-sm sm:text-base"
          style={{
            animation: 'fadeIn 1s ease-out forwards',
            animationDelay: '0.8s',
            opacity: 0,
          }}
        >
          Transform your physique, unlock your potential, and embrace a healthier lifestyle with our expert trainers and state-of-the-art facilities.
        </p>

        {/* Buttons */}
        <div
          className="p-4 sm:p-6 md:p-10 flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center"
          style={{
            animation: 'fadeIn 1s ease-out forwards',
            animationDelay: '1s',
            opacity: 0,
          }}
        >
          <button className="relative overflow-hidden group text-yellow-400 hover:text-black border border-yellow-400 px-8 py-3.5 w-full sm:w-44 md:w-52 text-base rounded-md font-medium transition-all duration-300">
            <span className="relative z-10">Learn More</span>
            <span className="absolute left-0 top-0 h-full w-0 bg-yellow-400 transition-all duration-500 ease-in-out group-hover:w-full z-0 rounded-md"></span>
          </button>

          <button className="relative overflow-hidden group text-black hover:text-yellow-400 border border-yellow-400 bg-yellow-400 px-8 py-3.5 w-full sm:w-44 md:w-52 text-base rounded-md font-medium transition-all duration-300">
            <span className="relative z-10">Join Now</span>
            <span className="absolute left-0 top-0 h-0 w-full bg-black transition-all duration-500 ease-in-out group-hover:h-full z-0 rounded-md"></span>
          </button>
        </div>
      </div>

      {/* Feature Cards */}
      <div
        className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 w-full mt-8 sm:mt-16 md:mt-24 z-10"
        style={{ animation: 'fadeInUp 1s ease-out forwards', animationDelay: '1.2s', opacity: 0 }}
      >
        {[
          { icon: 'bx-brain', title: 'BODY & MIND', desc: 'Balance your mental and physical health through mindful training and technique.' },
          { icon: 'bx-heart', title: 'HEALTHY LIFE', desc: 'Develop sustainable habits that promote longevity and overall wellbeing.' },
          { icon: 'bx-target-lock', title: 'STRATEGIES', desc: 'Personalized fitness plans designed to target your specific goals and needs.' },
          { icon: 'bx-dumbbell', title: 'WORKOUT', desc: 'Expert-designed routines that maximize results and minimize injury risk.' },
        ].map((card, i) => (
          <div
            key={i}
            className={`group relative overflow-hidden w-full h-64 md:h-80 ${
              i % 2 === 0 ? 'bg-gray-900 text-yellow-400' : 'bg-yellow-400 text-black'
            } py-8 px-6 flex flex-col items-center justify-center transition-all duration-500 hover:scale-[1.02] hover:shadow-xl`}
            style={{
              animation: 'fadeIn 0.5s ease-out forwards',
              animationDelay: `${1.4 + i * 0.2}s`,
              opacity: 0,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="transform group-hover:-translate-y-2 transition-transform duration-300">
              <i className={`bx ${card.icon} text-4xl sm:text-5xl mb-4`} />
            </div>
            <h1 className="font-bold text-lg sm:text-xl md:text-2xl mb-3 transform group-hover:-translate-y-1 transition-transform duration-300">
              {card.title}
            </h1>
            <p className="text-inherit/80 text-sm sm:text-base text-center max-w-xs transform group-hover:-translate-y-1 transition-transform duration-300">
              {card.desc}
            </p>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          </div>
        ))}
      </div>

      {/* Custom animations */}
      <style jsx="true">{`
        @keyframes slideInUp {
          from {
            transform: translateY(40px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fadeInUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes float {
          0% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-10px) translateX(10px);
          }
          50% {
            transform: translateY(-20px) translateX(0);
          }
          75% {
            transform: translateY(-10px) translateX(-10px);
          }
          100% {
            transform: translateY(0) translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

export default Hero;
