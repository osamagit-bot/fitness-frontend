import AOS from "aos";
import "aos/dist/aos.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";

function Hero() {
  const [isVisible, setIsVisible] = useState(false);
  const [visibleWords, setVisibleWords] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const heroRef = useRef(null);
  const { isDarkMode, classes } = useTheme();

  const words = [
    "REACH",
    "YOUR",
    "LIMITS",
    "AND",
    "GET",
    "TO",
    "THE",
    "NEXT",
    "LEVEL",
  ];
  const highlightWords = [
    "LIMITS",
    "NEXT",
    "LEVEL",
    "BODY",
    "MIND",
    "POTENTIAL",
  ]; // Added words to highlight

  // Typewriter text array
  const texts = [
    "REACH YOUR LIMITS AND GET TO THE NEXT LEVEL",
    "TRANSFORM YOUR BODY AND MIND",
    "UNLOCK YOUR POTENTIAL TODAY",
    "EMBRACE THE CHALLENGE AHEAD",
  ];

  // Mouse tracking for interactive effects
  const handleMouseMove = useCallback((e) => {
    setMousePosition({
      x: (e.clientX / window.innerWidth) * 100,
      y: (e.clientY / window.innerHeight) * 100,
    });
  }, []);

  // Enhanced typewriter effect with smoother animations
  useEffect(() => {
    const typeSpeed = 80;
    const deleteSpeed = 40;
    const pauseTime = 3000;
    const characterPauseVariation = Math.random() * 30 + 10; // Natural typing variation

    const typeWriter = () => {
      const currentTextFull = texts[currentIndex];

      if (!isDeleting) {
        // Typing with natural variation
        if (currentText.length < currentTextFull.length) {
          setCurrentText(currentTextFull.substring(0, currentText.length + 1));
        } else {
          // Longer pause at end before deleting
          setTimeout(() => setIsDeleting(true), pauseTime);
        }
      } else {
        // Faster, smoother deleting
        if (currentText.length > 0) {
          setCurrentText(currentTextFull.substring(0, currentText.length - 1));
        } else {
          setIsDeleting(false);
          setCurrentIndex((prev) => (prev + 1) % texts.length);
        }
      }
    };

    const timer = setTimeout(
      typeWriter, 
      isDeleting ? deleteSpeed : typeSpeed + characterPauseVariation
    );
    return () => clearTimeout(timer);
  }, [currentText, currentIndex, isDeleting, texts]);

  // Enhanced cursor blinking with smooth transitions
  useEffect(() => {
    let cursorTimer;
    if (!isDeleting && currentText.length === texts[currentIndex].length) {
      cursorTimer = setInterval(() => {
        setShowCursor((prev) => !prev);
      }, 600);
    } else {
      setShowCursor(true);
    }
    return () => clearInterval(cursorTimer);
  }, [isDeleting, currentText, currentIndex, texts]);

  useEffect(() => {
    setIsVisible(true);
    AOS.init();

    const handleScroll = () => {
      if (heroRef.current) {
        const scrollPosition = window.scrollY;
        const parallaxFactor = 0.4;
        heroRef.current.style.backgroundPosition = `center ${
          scrollPosition * parallaxFactor
        }px`;
      }
    };

    // Word by word animation
    const interval = setInterval(() => {
      setVisibleWords((prev) => {
        if (prev >= words.length) {
          return 0; // Reset to start
        }
        return prev + 1;
      });
    }, 500);

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
      clearInterval(interval);
    };
  }, [words.length]);

  return (
    <>
      {/* Hero Section - Full Viewport */}
      <div
        ref={heroRef}
        className="relative w-full flex flex-col justify-center items-center bg-cover bg-center bg-fixed bg-[url('/images/login2.jpeg')] h-screen overflow-hidden"
        style={{
          backgroundPosition: `${50 + mousePosition.x * 0.02}% ${
            50 + mousePosition.y * 0.02
          }%`,
        }}
      >
        {/* Gradient Overlay */}
        <div
          className="absolute inset-0 z-0 transition-all duration-1000"
          style={{
            background: `
              radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, 
                rgba(251, 191, 36, 0.15) 0%, 
                transparent 50%),
              linear-gradient(135deg, 
                rgba(0, 0, 0, 0.8) 0%, 
                rgba(0, 0, 0, 0.6) 50%, 
                rgba(0, 0, 0, 0.9) 100%)
            `,
          }}
        />

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
          className={`z-10 text-center px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out transform ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          {/* Enhanced Typewriter Heading */}
          <div className="overflow-hidden">
            <h1 className="hero-text text-white text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bold tracking-wide leading-tight mb-3 sm:mb-5">
              {texts[currentIndex].split("").map((char, index) => {
                const isVisible = index < currentText.length;
                const word = texts[currentIndex].split(" ").find(w => 
                  texts[currentIndex].indexOf(w) <= index && 
                  texts[currentIndex].indexOf(w) + w.length > index
                );
                const isHighlighted = word && highlightWords.includes(word.toUpperCase());
                
                return (
                  <span key={`${currentIndex}-${index}`} className="relative">
                    <span
                      className={`inline-block transition-all duration-500 ease-out ${
                        isVisible 
                          ? "opacity-100 transform translate-y-0 scale-100" 
                          : "opacity-0 transform translate-y-4 scale-95"
                      } ${
                        isHighlighted 
                          ? "text-yellow-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]" 
                          : "text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                      }`}
                      style={{
                        transitionDelay: isVisible ? `${index * 25}ms` : '0ms',
                        filter: isHighlighted ? 'brightness(1.1)' : 'brightness(1)',
                      }}
                    >
                      {char === " " ? "\u00A0" : char}
                    </span>
                    {index === currentText.length - 1 && (
                      <span
                        className={`absolute text-yellow-400 text-4xl sm:text-5xl md:text-6xl lg:text-7xl ${
                          showCursor ? "opacity-100 scale-100" : "opacity-0 scale-110"
                        } transition-all duration-300 ease-in-out drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]`}
                        style={{ 
                          left: '100%',
                          animation: showCursor ? 'pulse-glow 1.5s ease-in-out infinite' : 'none'
                        }}
                      >
                        |
                      </span>
                    )}
                  </span>
                );
              })}
            </h1>
          </div>

          {/* Paragraph */}
          <p
            className="w-full sm:w-[90%] md:w-[80%] lg:w-[70%] mt-6 sm:mt-8 md:mt-10 text-white/80 mx-auto text-sm sm:text-base"
            style={{
              animation: "fadeIn 1s ease-out forwards",
              animationDelay: "0.8s",
              opacity: 0,
            }}
          >
            Transform your physique, unlock your potential, and embrace a
            healthier lifestyle with our expert trainers and state-of-the-art
            facilities.
          </p>

          {/* Buttons */}
          <div
            className="p-4 sm:p-6 md:p-10 flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center"
            style={{
              animation: "fadeIn 1s ease-out forwards",
              animationDelay: "1s",
              opacity: 0,
            }}
          >
            <button className="relative overflow-hidden group border border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black px-8 py-3.5 w-full sm:w-44 md:w-52 text-base rounded-md font-medium transition-all duration-300">
              <span className="relative z-10">Learn More</span>
              <span className="absolute left-0 top-0 h-full w-0 bg-yellow-400 transition-all duration-500 ease-in-out group-hover:w-full z-0 rounded-md"></span>
            </button>

            <button className="relative overflow-hidden group bg-yellow-500 hover:bg-transparent hover:text-yellow-500 border border-yellow-500 px-8 py-3.5 w-full sm:w-44 md:w-52 text-base rounded-md font-medium transition-all duration-300">
              <span className="relative z-10">Join Now</span>
              <span className="absolute left-0 top-0 h-0 w-full transition-all duration-500 ease-in-out group-hover:h-full z-0 rounded-md"></span>
            </button>
          </div>
        </div>
      </div>

      {/* Feature Cards - Below Viewport */}
      <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 w-full z-10">
        {[
          {
            icon: "bx-brain",
            title: "BODY & MIND",
            desc: "Balance your mental and physical health through mindful training and technique.",
          },
          {
            icon: "bx-heart",
            title: "HEALTHY LIFE",
            desc: "Develop sustainable habits that promote longevity and overall wellbeing.",
          },
          {
            icon: "bx-target-lock",
            title: "STRATEGIES",
            desc: "Personalized fitness plans designed to target your specific goals and needs.",
          },
          {
            icon: "bx-dumbbell",
            title: "WORKOUT",
            desc: "Expert-designed routines that maximize results and minimize injury risk.",
          },
        ].map((card, i) => (
          <div
            key={i}
            data-aos="fade-up"
            data-aos-delay={i * 200}
            data-aos-duration="800"
            className={`group relative overflow-hidden w-full h-64 md:h-80 ${
              i % 2 === 0
                ? isDarkMode
                  ? "bg-gray-900 text-yellow-400"
                  : "bg-white text-gray-900"
                : "bg-yellow-400 text-black"
            } py-8 px-6 flex flex-col items-center justify-center transition-all duration-500 hover:scale-[1.02] hover:shadow-xl`}
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

      {/* Enhanced Custom Animations */}
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

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            opacity: 1;
            filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.6));
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            filter: drop-shadow(0 0 16px rgba(251, 191, 36, 0.8));
            transform: scale(1.05);
          }
        }

        @keyframes text-glow {
          0%, 100% {
            text-shadow: 0 0 5px rgba(251, 191, 36, 0.3);
          }
          50% {
            text-shadow: 0 0 20px rgba(251, 191, 36, 0.6), 0 0 30px rgba(251, 191, 36, 0.4);
          }
        }

        @keyframes character-appear {
          0% {
            opacity: 0;
            transform: translateY(30px) translateX(-10px) scale(0.8) rotateX(90deg);
            filter: blur(4px);
          }
          60% {
            opacity: 0.8;
            transform: translateY(-5px) translateX(2px) scale(1.1) rotateX(0deg);
            filter: blur(1px);
          }
          100% {
            opacity: 1;
            transform: translateY(0) translateX(0) scale(1) rotateX(0deg);
            filter: blur(0px);
          }
        }

        .hero-text {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .text-appear {
          animation: character-appear 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>
    </>
  );
}

export default Hero;
