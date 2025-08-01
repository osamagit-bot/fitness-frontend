import { useEffect, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";

const Footer = () => {
  // State to control button visibility based on scroll position
  const [showScrollButton, setShowScrollButton] = useState(false);
  const { classes } = useTheme();

  // Function to scroll to top
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Function to check scroll position and show/hide button
  useEffect(() => {
    const checkScrollPosition = () => {
      // Show button when user scrolls down 300px from the top
      if (window.scrollY > 300) {
        setShowScrollButton(true);
      } else {
        setShowScrollButton(false);
      }
    };

    // Add scroll event listener
    window.addEventListener('scroll', checkScrollPosition);
    
    // Initial check in case page is already scrolled
    checkScrollPosition();

    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener('scroll', checkScrollPosition);
    };
  }, []);

  return (
    <>
      {/* Fixed Back to Top Button - Always available */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-6 right-6 ${classes.button.primary} w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 z-50 ${
          showScrollButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
        }`}
        aria-label="Back to top"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-6 w-6" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M5 10l7-7m0 0l7 7m-7-7v18" 
          />
        </svg>
      </button>

      <footer className={`${classes.bg.tertiary} ${classes.text.secondary} pt-16 pb-8 px-4 md:px-12 relative`}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-10">
          {/* Brand & Tagline */}
          <div>
            <h1 className={`text-2xl font-bold ${classes.text.accent} mb-4`}>Atalan Gym</h1>
            <p className={`text-sm ${classes.text.tertiary}`}>
              Transform your body and mind. Join the ultimate fitness experience today.
            </p>
          </div>

          {/* Navigation Links */}
          <div>
            <h3 className={`text-lg font-semibold ${classes.text.accent} mb-3`}>Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className={`${classes.text.secondary} hover:${classes.text.accent.replace('text-', 'text-')}`}>Home</a></li>
              <li><a href="#" className={`${classes.text.secondary} hover:${classes.text.accent.replace('text-', 'text-')}`}>About Us</a></li>
              <li><a href="#" className={`${classes.text.secondary} hover:${classes.text.accent.replace('text-', 'text-')}`}>Classes</a></li>
              <li><a href="#" className={`${classes.text.secondary} hover:${classes.text.accent.replace('text-', 'text-')}`}>Trainers</a></li>
              <li><a href="#" className={`${classes.text.secondary} hover:${classes.text.accent.replace('text-', 'text-')}`}>Contact</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className={`text-lg font-semibold ${classes.text.accent} mb-3`}>Contact</h3>
            <ul className="text-sm space-y-2">
              <li>
                <i className={`bx bx-map ${classes.text.accent} mr-2`}></i>
               .................
              </li>
              <li>
                <i className={`bx bx-phone-call ${classes.text.accent} mr-2`}></i>
                +1 (800) 000-0000
              </li>
              <li>
                <i className={`bx bx-envelope ${classes.text.accent} mr-2`}></i>
                atalan@gmail.com
              </li>
            </ul>
          </div>

          {/* Social Icons */}
          <div>
            <h3 className={`text-lg font-semibold ${classes.text.accent} mb-3`}>Follow Us</h3>
            <div className="flex space-x-4 text-2xl">
              <a href="#" className={`${classes.text.accent} hover:${classes.text.primary} transition`}><i className="bx bxl-facebook-circle"></i></a>
              <a href="#" className={`${classes.text.accent} hover:${classes.text.primary} transition`}><i className="bx bxl-instagram-alt"></i></a>
              <a href="#" className={`${classes.text.accent} hover:${classes.text.primary} transition`}><i className="bx bxl-twitter"></i></a>
              <a href="#" className={`${classes.text.accent} hover:${classes.text.primary} transition`}><i className="bx bxl-youtube"></i></a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="text-center mt-10 pt-6 border-t border-gray-700 text-sm text-gray-500">
          © {new Date().getFullYear()} Atalan Gym. All rights reserved. Developed By: Osama Noorani
        </div>
      </footer>
    </>
  );
};

export default Footer;
