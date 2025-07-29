import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

const HelpSupport = () => {
  const { classes } = useTheme();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(false);
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, [location.pathname]);
  
  return (
    <section className={`min-h-screen ${classes.bg.primary} pt-36 ${classes.text.primary} py-16 px-6`}>
      <div className="max-w-4xl mx-auto">
        <div className={`transform transition-all duration-1000 ease-out ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <h2 className={`text-4xl font-bold ${classes.text.accent} mb-6 text-center`}>
            Help & Support
          </h2>
          <p className={`${classes.text.secondary} text-center mb-12`}>
            We're here to help! Find answers to your questions, or reach out to our support team.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* FAQ Section */}
          <div className={`${classes.bg.secondary} p-6 rounded-xl shadow-md transform transition-all duration-1000 ease-out hover:scale-105 hover:shadow-xl ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
          }`} style={{ transitionDelay: '200ms' }}>
            <h3 className={`text-xl font-semibold ${classes.text.accent} mb-4`}>Frequently Asked Questions</h3>
            <ul className={`space-y-4 ${classes.text.secondary}`}>
              <li className={`transform transition-all duration-700 ease-out ${
                isVisible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
              }`} style={{ transitionDelay: '400ms' }}>
                <strong>❓ How do I reset my password?</strong><br />
                You can contact Admin or you can reset your password in your member dashboard 'settings' tab.
              </li>
              <li className={`transform transition-all duration-700 ease-out ${
                isVisible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
              }`} style={{ transitionDelay: '500ms' }}>
                <strong>❓ How can I update my membership?</strong><br />
                Visit the Membership section under your profile or contact our staff at the front desk.
              </li>
              <li className={`transform transition-all duration-700 ease-out ${
                isVisible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
              }`} style={{ transitionDelay: '600ms' }}>
                <strong>❓ What should I bring to the gym?</strong><br />
                Bring a towel, water bottle, clean shoes, and your membership card or app.
              </li>
            </ul>
          </div>

          {/* Contact Support */}
          <div className={`${classes.bg.secondary} p-6 rounded-xl shadow-md transform transition-all duration-1000 ease-out hover:scale-105 hover:shadow-xl ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
          }`} style={{ transitionDelay: '300ms' }}>
            <h3 className={`text-xl font-semibold ${classes.text.accent} mb-4`}>Need More Help?</h3>
            <p className={`${classes.text.secondary} mb-4`}>
              Our support team is available to assist you 7 days a week. Contact us via:
            </p>
            <ul className={`${classes.text.secondary} space-y-2`}>
              <li className={`transform transition-all duration-700 ease-out ${
                isVisible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
              }`} style={{ transitionDelay: '500ms' }}>
                <strong>Email:</strong> <a href="mailto:support@gymfitness.com" className={`${classes.text.accent} hover:opacity-80 transition-opacity duration-200`}>atalan@gymfitness.com</a>
              </li>
              <li className={`transform transition-all duration-700 ease-out ${
                isVisible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
              }`} style={{ transitionDelay: '600ms' }}>
                <strong>Phone:</strong> <span className={classes.text.accent}>+93 700 000 000</span>
              </li>
              <li className={`transform transition-all duration-700 ease-out ${
                isVisible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
              }`} style={{ transitionDelay: '700ms' }}>
                <strong>Live Chat:</strong> Available on the bottom-right corner
              </li>
            </ul>
            <a
              href="https://wa.me/93700000000"
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-6 inline-block ${classes.button.primary} font-semibold px-6 py-2 rounded hover:scale-105 transform transition-all duration-300 ease-out ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
              }`}
              style={{ transitionDelay: '800ms' }}
            >
              Chat with Support
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HelpSupport;
