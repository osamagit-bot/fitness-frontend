import { useTheme } from "../contexts/ThemeContext";

const ContactSection = () => {
  const { classes } = useTheme();
  
  return (
    <section id="contact" className={`${classes.bg.secondary} py-20 px-4 md:px-8`}>
      <div className={`max-w-5xl mx-auto grid md:grid-cols-2 ${classes.card.primary} shadow-2xl rounded-xl overflow-hidden`}>
        {/* Form Side */}
        <div className="p-10">
          <h2 className={`text-2xl md:text-3xl font-semibold ${classes.text.accent} mb-6 text-center`}>
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
        <div className={`flex justify-center items-center ${classes.bg.tertiary} p-4`}>
          <div className={`overflow-hidden rounded-xl border-2 p-3 ${classes.border.accent} w-80 h-80 group`}>
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
