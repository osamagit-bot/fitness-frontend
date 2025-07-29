import 'boxicons/css/boxicons.min.css';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

function Navbar() {
  const [showCategoriesDropdown, setShowCategoriesDropdown] = useState(false);

  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [scrolled, setScrolled] = useState(false);
  
  const categoriesRef = useRef(null);

  const mobileMenuRef = useRef(null);
  const timeoutRef = useRef(null);
  
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme, classes } = useTheme();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setShowMobileMenu(false);
      }
    };

    const handleScroll = () => {
      const isScrolled = window.scrollY > 100;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    const handleClickOutside = (event) => {
      if (!isMobile) {
        if (categoriesRef.current && !categoriesRef.current.contains(event.target)) {
          setShowCategoriesDropdown(false);
        }

      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isMobile, scrolled]);

  const toggleCategoriesDropdown = () => {
    setShowCategoriesDropdown(!showCategoriesDropdown);
  };

  const handleCategoriesMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setShowCategoriesDropdown(true);
  };

  const handleDropdownMouseLeave = (dropdownType) => {
    timeoutRef.current = setTimeout(() => {
      if (dropdownType === 'categories') {
        setShowCategoriesDropdown(false);
      }
    }, 150);
  };

  const handleDropdownContentMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const goToHome = () => {
    navigate('/');
    setShowMobileMenu(false);
  };

  const goToProducts = () => {
    navigate('/products');
    setShowMobileMenu(false);
  };

  const goToSchedule = () => {
    navigate('/schedule');
    setShowMobileMenu(false);
  };

  const goToTrainings = () => {
    const trainingSection = document.getElementById('training');
    if (trainingSection) {
      trainingSection.scrollIntoView({ behavior: 'smooth' });
    }
    setShowMobileMenu(false);
  };

     const goToHelpandSupport = () => {
    navigate('/helpandsupportpage');
    setShowMobileMenu(false);
  };

  const closeMobileMenu = () => {
    setShowMobileMenu(false);
  };

  return (
    <div 
      className={`fixed top-0 left-0 w-full z-[1000] shadow-lg border-b transition-all duration-300 ease-in-out ${
        scrolled 
          ? `${classes.bg.navbar} ${classes.border.accent}/30 py-1` 
          : `${classes.bg.navbar} ${classes.border.accent}/20 py-2`
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className={`flex justify-between items-center transition-all duration-300 ease-in-out ${
          scrolled ? 'py-2' : 'py-4'
        }`}>
          <h1
            onClick={goToHome}
            className={`font-bold ${classes.text.accent} cursor-pointer hover:text-yellow-300 transition duration-200 flex items-center ${
              scrolled ? 'text-xl' : 'text-2xl'
            }`}
          >
            <i className={`bx bx-dumbbell mr-2 ${scrolled ? 'text-2xl' : 'text-3xl'}`}></i>
            Atalan GYM
          </h1>

          <div className="lg:hidden flex items-center space-x-3">
            {/* Theme Toggle for Mobile */}
            <button
              onClick={toggleTheme}
              className={`${classes.text.accent} hover:text-yellow-300 focus:outline-none transition-colors duration-200`}
              aria-label="Toggle theme"
            >
              <i className={`bx ${isDarkMode ? 'bx-sun' : 'bx-moon'} ${scrolled ? 'text-xl' : 'text-2xl'}`}></i>
            </button>
            
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className={`${classes.text.accent} hover:text-yellow-300 focus:outline-none`}
              aria-label="Toggle menu"
            >
              <i className={`bx ${showMobileMenu ? 'bx-x' : 'bx-menu'} ${scrolled ? 'text-2xl' : 'text-3xl'}`}></i>
            </button>
          </div>

          <nav className="hidden lg:flex items-center space-x-8">
            <ul className={`flex space-x-8 items-center text-base font-medium ${classes.text.accent}`}>
              <li>
                <button onClick={goToHome} className={`${isDarkMode ? 'hover:text-yellow-300' : 'hover:text-gray-600'} transition duration-150 ease-in-out focus:outline-none`}>
                  HOME
                </button>
              </li>

              <li 
                ref={categoriesRef} 
                className="relative"
                onMouseLeave={() => !isMobile && handleDropdownMouseLeave('categories')}
              >
                <button
                  className={`flex items-center ${isDarkMode ? 'hover:text-yellow-300' : 'hover:text-gray-600'} transition duration-150 ease-in-out focus:outline-none`}
                  onClick={toggleCategoriesDropdown}
                  onMouseEnter={() => !isMobile && handleCategoriesMouseEnter()}
                >
                  SHOP BY CATEGORIES
                  <i className={`bx bx-chevron-down ml-1 transition-transform ${showCategoriesDropdown ? 'rotate-180' : ''}`}></i>
                </button>
                <div 
                  className={`absolute left-0 mt-2 w-64 rounded-md shadow-lg ${classes.dropdown.primary} ring-1 ring-black ring-opacity-5 transition-all duration-200 ease-in-out z-20 ${
                    showCategoriesDropdown 
                      ? 'transform opacity-100 scale-100' 
                      : 'transform opacity-0 scale-95 pointer-events-none'
                  }`}
                  onMouseEnter={handleDropdownContentMouseEnter}
                >
                  <div className={`py-1 rounded-md ${classes.dropdown.primary} shadow-xs ${classes.border.accent}/20`}>
                    {[
                      'Supplements', 'Equipment'
                    ].map((item) => (
                      <button
                        key={item}
                        onClick={() => {
                          navigate(`/category/${item.toLowerCase().replace(/\s+/g, '-')}`);
                          setShowCategoriesDropdown(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm ${classes.dropdown.item} transition-colors duration-150`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </li>

              <li>
                <a href="#training" className={`${isDarkMode ? 'hover:text-yellow-300' : 'hover:text-gray-600'} transition duration-150 ease-in-out focus:outline-none`} style={{scrollBehavior: 'smooth'}}>
                  TRAININGS
                </a>
              </li>
              
              <li>
                <a href="#products" className={`${isDarkMode ? 'hover:text-yellow-300' : 'hover:text-gray-600'} transition duration-150 ease-in-out focus:outline-none`} style={{scrollBehavior: 'smooth'}}>
                  PRODUCTS
                </a>
              </li>

              <li>
                <button onClick={goToSchedule} className={`${isDarkMode ? 'hover:text-yellow-300' : 'hover:text-gray-600'} transition duration-150 ease-in-out focus:outline-none`}>
                  SCHEDULE
                </button>
              </li>

           <li>
  <a href="#about" className={`${isDarkMode ? 'hover:text-yellow-300' : 'hover:text-gray-600'} transition duration-150 ease-in-out focus:outline-none`} style={{scrollBehavior: 'smooth'}}>
    ABOUT US
  </a>
</li>

              <li>
                <button onClick={goToHelpandSupport} className={`${isDarkMode ? 'hover:text-yellow-300' : 'hover:text-gray-600'} transition duration-150 ease-in-out focus:outline-none`}>
                  HELP & SUPPORT
                </button>
              </li>
            </ul>

            {/* Theme Toggle for Desktop */}
            <button
              onClick={toggleTheme}
              className={`${classes.text.accent} hover:text-yellow-300 focus:outline-none transition-colors duration-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800`}
              aria-label="Toggle theme"
            >
              <i className={`bx ${isDarkMode ? 'bx-sun' : 'bx-moon'} text-xl`}></i>
            </button>

            <Link to="/login" className="ml-4">
              <button className={`inline-flex items-center justify-center border ${classes.button.outline} text-base font-medium rounded-md bg-transparent transition-colors duration-150 ease-in-out focus:outline-none ${
                scrolled ? 'text-sm px-5 py-1.5' : 'text-base px-6 py-2'
              }`}>
                <i className='bx bx-log-in mr-2'></i>
                Login
              </button>
            </Link>
          </nav>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        ref={mobileMenuRef}
        className={`lg:hidden fixed inset-0 z-50 transform transition-all duration-300 ease-in-out ${
          showMobileMenu 
            ? 'opacity-100 pointer-events-auto' 
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-black/20 bg-opacity-50" onClick={closeMobileMenu}></div>
        <div className={`absolute top-0 left-0 w-72 h-full ${classes.bg.secondary} shadow-xl transform transition-transform duration-300 ease-in-out overflow-y-auto`}
             style={{ transform: showMobileMenu ? 'translateX(0)' : 'translateX(-100%)' }}>
          <div className={`flex items-center justify-between p-4 border-b ${classes.border.accent}/20`}>
            <h2 className={`text-md font-bold ${classes.text.accent}`}>Ground Of Champions</h2>
            <button
              onClick={closeMobileMenu}
              className={`${classes.text.accent} hover:text-yellow-300 focus:outline-none`}
            >
              <i className="bx bx-x text-2xl"></i>
            </button>
          </div>

          <nav className="px-2 pt-2 pb-4">
            <button
              onClick={goToHome}
              className={`block w-full text-left px-3 py-2 rounded-md ${classes.text.accent} font-medium hover:bg-yellow-500 hover:text-black transition-colors duration-150`}
            >
              HOME
            </button>

            <div className="mt-1">
              <button
                onClick={toggleCategoriesDropdown}
                className={`flex items-center justify-between w-full px-3 py-2 ${classes.text.accent} font-medium rounded-md hover:bg-yellow-500 hover:text-black transition-colors duration-150`}
              >
                <span>SHOP BY CATEGORIES</span>
                <i className={`bx bx-chevron-down transition-transform ${showCategoriesDropdown ? 'rotate-180' : ''}`}></i>
              </button>
              
              <div 
                className={`mt-1 transition-all duration-300 ease-in-out overflow-hidden ${
                  showCategoriesDropdown ? 'max-h-[500px]' : 'max-h-0'
                }`}
              >
                {[
                  'Supplements', 'Equipment'
                ].map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      navigate(`/category/${item.toLowerCase().replace(/\s+/g, '-')}`);
                      setShowMobileMenu(false);
                      setShowCategoriesDropdown(false);
                    }}
                    className={`block w-full text-left px-3 py-2 ml-4 text-sm ${classes.text.secondary} rounded-md hover:bg-yellow-500 hover:text-black transition-colors duration-150`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={goToTrainings}
              className={`mt-1 block w-full text-left px-3 py-2 rounded-md ${classes.text.accent} font-medium hover:bg-yellow-500 hover:text-black transition-colors duration-150`}
            >
              TRAININGS
            </button>

            <button 
              onClick={goToProducts}
              className={`mt-1 block w-full text-left px-3 py-2 rounded-md ${classes.text.accent} font-medium hover:bg-yellow-500 hover:text-black transition-colors duration-150`}
            >
              PRODUCTS
            </button>

            <button 
              onClick={goToSchedule}
              className={`mt-1 block w-full text-left px-3 py-2 rounded-md ${classes.text.accent} font-medium hover:bg-yellow-500 hover:text-black transition-colors duration-150`}
            >
              SCHEDULE
            </button>
            
            <a href='#about' className={`mt-1 block w-full text-left px-3 py-2 rounded-md ${classes.text.accent} font-medium hover:bg-yellow-500 hover:text-black transition-colors duration-150`}>
              ABOUT US
            </a>
            
            <button onClick={goToHelpandSupport} className={`mt-1 block w-full text-left px-3 py-2 rounded-md ${classes.text.accent} font-medium hover:bg-yellow-500 hover:text-black transition-colors duration-150`}>
              HELP & SUPPORT
            </button>
            
            <Link to="/login" className="block mt-4">
              <button className={`w-full flex items-center justify-center px-4 py-2 border ${classes.button.outline} text-base font-medium rounded-md bg-transparent transition-colors duration-150 ease-in-out focus:outline-none`}>
                <i className='bx bx-log-in mr-2'></i>
                Login
              </button>
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}

export default Navbar;
