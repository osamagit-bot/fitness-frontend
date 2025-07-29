import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const FAQ = () => {
  const { classes } = useTheme();
  const [activeIndex, setActiveIndex] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");

  const toggleFAQ = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  const faqs = [
    {
      question: "How do I get started with a membership?",
      answer: "Getting started is easy! You can sign up online through our registration page, or visit us in person. We'll guide you through a quick orientation to help you get familiar with our facilities and create your member profile.",
      category: "Membership"
    },
    {
      question: "What's included in the basic membership?",
      answer: "Our basic membership includes access to the main gym floor, cardio and strength equipment, locker rooms, and one group fitness class per week. For more features like unlimited classes or personal training, check out our premium or elite packages.",
      category: "Membership"
    },
    {
      question: "Are there any contracts or cancellation fees?",
      answer: "We offer month-to-month memberships with no long-term contracts. You can cancel anytime with a 30-day notice period. There are no cancellation fees if you follow the notice process.",
      category: "Membership"
    },
    {
      question: "Do you offer personal training?",
      answer: "Yes! We have a team of certified personal trainers who can work with you one-on-one to achieve your specific fitness goals. Personal training sessions can be purchased individually or in packages for discounted rates.",
      category: "Classes"
    },
    {
      question: "What are your operating hours?",
      answer: "Our club is open Monday through Friday from 5:00 AM to 11:00 PM, and weekends from 7:00 AM to 8:00 PM. Premium and Elite members have 24/7 access with their key fob.",
      category: "Facilities"
    },


  ];

  const categories = [
    { title: "All", icon: "grid" },
    { title: "Membership", icon: "user-card" },
    { title: "Classes", icon: "calendar" },
    { title: "Facilities", icon: "building" },
    { title: "Payments", icon: "credit-card" }
  ];

  const filteredFaqs = selectedCategory === "All"
    ? faqs
    : faqs.filter((faq) => faq.category === selectedCategory);

  // Add keyboard navigation and accessibility
  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleFAQ(index);
    }
  };

  return (
    <section className={`py-8 sm:py-12 lg:py-16 ${classes.bg.primary}`}>
      <div className="container mx-auto px-3 sm:px-4">
        <div className="text-center mb-8 sm:mb-10 lg:mb-12">
          <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${classes.text.primary} mb-3 sm:mb-4`}>Frequently <span className='text-yellow-400'>Asked Questions</span></h2>
          <div className="w-16 sm:w-20 lg:w-24 h-1 bg-yellow-500 mx-auto"></div>
          <p className={`mt-3 sm:mt-4 ${classes.text.secondary} max-w-2xl mx-auto text-sm sm:text-base px-4`}>
            Find answers to common questions about our fitness club
          </p>
        </div>

        {/* FAQ Categories */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 lg:gap-4 mb-8 sm:mb-10 lg:mb-12 px-2">
          {categories.map((category, index) => (
            <button
              key={index}
              onClick={() => setSelectedCategory(category.title)}
              className={`px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-full font-medium transition-colors duration-300 text-xs sm:text-sm lg:text-base ${
                selectedCategory === category.title
                  ? "bg-yellow-500 text-black"
                  : `${classes.bg.tertiary} ${classes.text.primary} hover:bg-yellow-500`
              }`}
            >
              {category.title}
            </button>
          ))}
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto divide-y divide-gray-200">
          {filteredFaqs.map((faq, index) => (
            <div key={index} className="py-3 sm:py-4 lg:py-5">
              <button
                onClick={() => toggleFAQ(index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className={`w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left ${classes.bg.tertiary} ${classes.card.hover} transition-colors focus:outline-none focus:ring-2 rounded-lg`}
                aria-expanded={activeIndex === index}
                aria-controls={`faq-content-${index}`}
              >
                <div className="flex justify-between items-start sm:items-center gap-3">
                  <h3 className={`text-sm sm:text-base lg:text-lg font-semibold ${classes.text.primary} pr-2 leading-tight`}>
                    {faq.question}
                  </h3>
                  <i className={`bx ${activeIndex === index ? 'bx-minus' : 'bx-plus'} ${classes.text.primary} text-lg sm:text-xl transition-transform flex-shrink-0 mt-1 sm:mt-0`} />
                </div>
              </button>
              <div
                id={`faq-content-${index}`}
                className={`overflow-hidden transition-all duration-300 ${
                  activeIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
                role="region"
                aria-labelledby={`faq-button-${index}`}
              >
                <div className={`px-3 sm:px-4 lg:px-6 py-3 sm:py-4 bg-yellow-600 ${classes.text.primary === 'text-white' ? 'text-gray-100' : 'text-white'} text-sm sm:text-base rounded-b-lg`}>
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8 sm:mt-10 lg:mt-12 px-4">
          <p className={`${classes.text.secondary} mb-3 sm:mb-4 text-sm sm:text-base`}>Can't find the answer you're looking for?</p>
          <button className="px-6 sm:px-8 py-2 sm:py-3 bg-yellow-500 text-black font-bold rounded-full hover:bg-yellow-600 transition-colors duration-300 shadow-lg text-sm sm:text-base">
            Contact Us
          </button>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
