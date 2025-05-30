import React, { useState } from 'react';

const FAQ = () => {
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
    {
      question: "Is there free parking available?",
      answer: "Yes, we offer complimentary parking for all members in our dedicated lot. During peak hours, we also have overflow parking available.",
      category: "Facilities"
    },
    {
      question: "Can I put my membership on hold?",
      answer: "Yes, you can freeze your membership for up to 3 months per year for qualifying reasons like medical issues, travel, or temporary relocation. A small maintenance fee may apply during the freeze period.",
      category: "Membership"
    },
    {
      question: "Do you offer any discounts for students or seniors?",
      answer: "We offer special rates for students with valid ID, seniors (age 65+), military personnel, and first responders. Please inquire at the front desk for current discount programs.",
      category: "Payments"
    }
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

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-black mb-4">Frequently <span className='text-yellow-400'>Asked Questions</span></h2>
          <div className="w-24 h-1 bg-yellow-500 mx-auto"></div>
          <p className="mt-4 text-gray-800 max-w-2xl mx-auto">
            Find answers to common questions about our fitness club
          </p>
        </div>

        {/* FAQ Categories */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {categories.map((category, index) => (
            <button
              key={index}
              onClick={() => setSelectedCategory(category.title)}
              className={`px-6 py-3 rounded-full font-medium transition-colors duration-300 ${
                selectedCategory === category.title
                  ? "bg-yellow-500 text-black"
                  : "bg-gray-100 text-black hover:bg-yellow-500"
              }`}
            >
              {category.title}
            </button>
          ))}
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto divide-y divide-gray-200">
          {filteredFaqs.map((faq, index) => (
            <div key={index} className="py-5">
              <button
                onClick={() => toggleFAQ(index)}
                className="flex justify-between items-center w-full text-left focus:outline-none"
              >
                <h3 className="text-lg font-semibold text-black">{faq.question}</h3>
                <span
                  className={`ml-6 flex-shrink-0 text-yellow-500 transition-transform duration-300 ${
                    activeIndex === index ? "transform rotate-180" : ""
                  }`}
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>
              <div
                className={`mt-2 transition-all duration-300 overflow-hidden ${
                  activeIndex === index ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <p className="text-gray-600 pb-4">{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-700 mb-4">Can't find the answer you're looking for?</p>
          <button className="px-8 py-3 bg-yellow-500 text-black font-bold rounded-full hover:bg-yellow-600 transition-colors duration-300 shadow-lg">
            Contact Us
          </button>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
