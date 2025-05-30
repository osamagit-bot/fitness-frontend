import React, { useState } from "react";
import CountUp from "react-countup";
import { useInView } from "react-intersection-observer";

function About() {
  const [hasAnimated, setHasAnimated] = useState(false);
  const { ref, inView } = useInView({
    threshold: 0.5, // Adjust this value as needed
    triggerOnce: true, // Only trigger once
  });

  React.useEffect(() => {
    if (inView && !hasAnimated) {
      setHasAnimated(true);
    }
  }, [inView, hasAnimated]);

  return (
    <div
      id="about"
      className="bg-gray-100 flex flex-col lg:flex-row mt-18 items-center justify-center py-16 px-4 sm:px-6 lg:px-10 xl:px-20 w-full"
      ref={ref}
    >
      {/* Image Container */}
      <div className="w-full lg:w-[60%] xl:w-[50%] mb-10 lg:mb-0 flex justify-center lg:justify-end px-4 sm:px-0">
        <div className="relative group overflow-hidden rounded-lg shadow-2xl border-4 border-white transform transition-all duration-500 hover:shadow-xl">
          <img 
            src="/images/gmy.jpeg" 
            className="w-full max-w-[500px] lg:max-w-none mr-36 lg:w-[80%] xl:ml-20 object-cover transition-transform duration-500 group-hover:scale-105"
            alt="About us"
          />
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-all duration-500"></div>
        </div>
      </div>
      
      {/* Content Container */}
      <div className="w-full lg:w-[40%] xl:w-[50%] lg:ml-10 xl:ml-20 mt-10 lg:mt-0 px-4 sm:px-0">
        <h1 className="text-lg font-medium text-gray-700">
          ABOUT US
          <span className="block bg-yellow-400 w-12 h-1 mt-2 mb-4 rounded-full"></span>
        </h1>
        
        <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-gray-800 font-bold tracking-tight mt-3 leading-tight">
          WELCOME TO <span className="text-yellow-400">US</span>
        </h2>
        
        <p className="w-full lg:w-[90%] xl:w-[80%] mt-6 text-justify text-gray-600 text-base sm:text-lg lg:text-md leading-relaxed">
         At [Atalan GYM], we believe fitness is more than just physical strength — it's a mindset, a lifestyle, and a journey of self-improvement. Our mission is to empower individuals of all ages and fitness levels to unlock their full potential. Whether you're here to build muscle, lose weight, gain confidence, or simply feel better in your own skin, we’re here to support you every step of the way. With a motivating environment, passionate trainers, and a strong community, we’re not just a gym — we’re your second home. Start your transformation today, because the strongest project you’ll ever work on is you.
        </p>
        
        <div className="mt-10">
          <button className="relative overflow-hidden group bg-yellow-400 hover:bg-transparent p-3 w-full sm:w-56 rounded-md transition-all duration-300">
            <span className="relative z-10 font-medium text-gray-700 group-hover:text-yellow-400 transition-colors duration-300">
              Start Now
            </span>
            <span className="absolute left-0 top-0 h-full w-0 bg-gray-800 transition-all duration-500 ease-in-out group-hover:w-full z-0"></span>
          </button>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 gap-1 mt-12">
          <div className="text-center p-4">
            <div className="text-3xl font-bold text-gray-800">
              {hasAnimated ? (
                <CountUp end={10} duration={2} delay={0.1} />
              ) : (
                "0"
              )}+
            </div>
            <div className="text-gray-600 mt-2">Years Experience</div>
          </div>
          <div className="text-center p-4">
            <div className="text-3xl font-bold text-gray-800">
              {hasAnimated ? (
                <CountUp end={500} duration={2.5} delay={0.2} />
              ) : (
                "0"
              )}+
            </div>
            <div className="text-gray-600 mt-2">Happy Clients</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default About;