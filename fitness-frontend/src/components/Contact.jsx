import React from "react";

const ContactSection = () => {
  return (
    <section id="contact" className="bg-gray-500 py-20 px-4 md:px-8">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 bg-gray-800 shadow-2xl rounded-xl overflow-hidden">
        {/* Form Side */}
        <div className="p-10">
          <h2 className="text-2xl md:text-3xl font-semibold text-yellow-400 mb-6 text-center">
            CONTACT US
          </h2>
          <form className="space-y-6">
            <input
              type="text"
              placeholder="Enter your Name"
              className="w-full border-b-2 border-gray-600 focus:border-yellow-400 bg-transparent outline-none py-2 text-white placeholder-gray-400"
            />
            <input
              type="email"
              placeholder="Enter a valid email address"
              className="w-full border-b-2 border-gray-600 focus:border-yellow-400 bg-transparent outline-none py-2 text-white placeholder-gray-400"
            />
            <textarea
              rows="3"
              placeholder="Enter your message"
              className="w-full border-b-2 border-gray-600 focus:border-yellow-400 bg-transparent outline-none py-2 text-white placeholder-gray-400 resize-none"
            ></textarea>
            <button
              type="submit"
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-normal py-2 px-6 rounded transition duration-300"
            >
              Submit
            </button>
          </form>
        </div>

        {/* Image Side */}
        <div className="flex justify-center items-center bg-gray-800 p-4">
          <div className="overflow-hidden rounded-xl border-2 p-3 border-yellow-400 w-80 h-80 group">
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
