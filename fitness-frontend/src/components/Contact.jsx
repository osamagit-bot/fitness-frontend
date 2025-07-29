import { useTheme } from "../contexts/ThemeContext";

const ContactSection = () => {
  const { classes } = useTheme();
  
  return (
    <section id="contact" className={`${classes.bg.secondary} py-12 md:py-20 px-4 md:px-8`}>
      <div className={`max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 ${classes.card.primary} shadow-2xl rounded-xl overflow-hidden`}>
        {/* Form Side */}
        <div className="p-6 md:p-10">
          <h2 className={`text-xl md:text-2xl lg:text-3xl font-semibold ${classes.text.accent} mb-4 md:mb-6 text-center`}>
            CONTACT US
          </h2>
          <form className="space-y-6">
            <input
              type="text"
              placeholder="Enter your Name"
              className={`w-full border-b-2 ${classes.border.primary} focus:${classes.border.accent} bg-transparent outline-none py-2 ${classes.text.primary} ${classes.text.tertiary}`}
            />
            <input
              type="email"
              placeholder="Enter a valid email address"
              className={`w-full border-b-2 ${classes.border.primary} focus:${classes.border.accent} bg-transparent outline-none py-2 ${classes.text.primary} ${classes.text.tertiary}`}
            />
            <textarea
              rows="3"
              placeholder="Enter your message"
              className={`w-full border-b-2 ${classes.border.primary} focus:${classes.border.accent} bg-transparent outline-none py-2 ${classes.text.primary} ${classes.text.tertiary} resize-none`}
            ></textarea>
            <button
              type="submit"
              className={`${classes.button.primary} font-normal py-2 px-6 rounded transition duration-300`}
            >
              Submit
            </button>
          </form>
        </div>

        {/* Image Side */}
        <div className={`flex justify-center items-center ${classes.bg.tertiary} p-4 md:p-6`}>
          <div className={`overflow-hidden rounded-xl border-2 p-2 md:p-3 ${classes.border.accent} w-full max-w-xs md:max-w-sm lg:w-80 aspect-square group`}>
            <img
              src="/images/body7.jpg"
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
