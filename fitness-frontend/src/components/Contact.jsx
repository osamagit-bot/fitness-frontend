import { useState } from "react";
import { useTheme } from "../contexts/ThemeContext";

const ContactSection = () => {
  const { classes } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const whatsappMessage = `*New Contact Form Submission*%0A%0A*Name:* ${formData.name}%0A*Email:* ${formData.email}%0A*Message:* ${formData.message}`;
    const whatsappUrl = `https://wa.me/93123456789?text=${whatsappMessage}`;
    window.open(whatsappUrl, '_blank');
  };
  
  return (
    <section
      id="contact"
      className={`${classes.bg.secondary} py-12 md:py-20 px-4 md:px-8`}
    >
      <div
        className={`max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 ${classes.card.primary} shadow-2xl rounded-xl overflow-hidden`}
      >
        {/* Form Side */}
        <div className="p-6 md:p-10">
          <h2
            className={`text-xl md:text-2xl lg:text-3xl font-semibold ${classes.text.accent} mb-2 text-center`}
          >
            <span className="text-white">CONTACT</span> US
          </h2>
          <p className={`${classes.text.secondary} text-center mb-6 text-sm`}>
            Send us a message or chat directly on WhatsApp
          </p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your Name"
              required
              className={`w-full border-b-2 ${classes.border.primary} focus:border-yellow-500 bg-transparent outline-none py-2 ${classes.text.primary} placeholder-gray-400`}
            />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter a valid email address"
              required
              className={`w-full border-b-2 ${classes.border.primary} focus:border-yellow-500 bg-transparent outline-none py-2 ${classes.text.primary} placeholder-gray-400`}
            />
            <textarea
              rows="3"
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              placeholder="Enter your message"
              required
              className={`w-full border-b-2 ${classes.border.primary} focus:border-yellow-500 bg-transparent outline-none py-2 ${classes.text.primary} placeholder-gray-400 resize-none`}
            ></textarea>
            <div className="text-center">
              <p
                className={`${classes.text.secondary} text-sm mb-3 text-center`}
              >
                <i className="bx bxl-whatsapp text-green-500 text-sm align-middle mr-2"></i>
                <span className="text-yellow-500">Note:</span> We will receive
                your message on WhatsApp
              </p>
              <button
                type="submit"
                className={`${classes.button.primary} font-normal py-2 px-6 rounded transition duration-300`}
              >
                Submit
              </button>
            </div>
          </form>
        </div>

        {/* Image Side */}
        <div
          className={`flex justify-center items-center ${classes.bg.tertiary} p-4 md:p-6`}
        >
          <div
            className={`overflow-hidden rounded-xl border-2 p-2 md:p-3 ${classes.border.accent} w-full max-w-xs md:max-w-sm lg:w-80 aspect-square group`}
          >
            <img
              src="/images/riaz.png"
              alt="Fit woman with exercise ball"
              className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
