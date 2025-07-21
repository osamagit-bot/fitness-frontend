
const Testimonials = () => {
  const testimonials = [
    {
      id: 1,
      name: "Ahmad Seyar",
      quote: "After 6 months, I've lost 30lbs and gained so much confidence. The trainers here are amazing!",
      image: "./images/man.jpg", 
      transformation: "Lost 30lbs in 6 months"
    },
    {
      id: 2,
      name: "Qais Ahmad",
      quote: "The personalized training program helped me build muscle and improve my overall strength. Best decision ever!",
      image: "./images/man.jpg",
      transformation: "Gained 15lbs of muscle"
    },
    {
      id: 3,
      name: "Tamim Yousufi",
      quote: "I never thought I could enjoy working out until I joined this gym. The community here is so supportive!",
      image: "./images/boost.jpg", 
      transformation: "Improved fitness and energy levels"
    }
  ];

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-black mb-4">Success <span className='text-yellow-400'>Stories</span></h2>
          <div className="w-24 h-1 bg-yellow-500 mx-auto"></div>
          <p className="mt-4 text-gray-800 max-w-2xl mx-auto">
            Our members achieve amazing results with dedication and our expert guidance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div 
              key={testimonial.id} 
              className="bg-gray-100 rounded-lg overflow-hidden shadow-lg transition-transform duration-300 hover:transform hover:scale-105"
            >
              <div className="h-64 bg-yellow-100 relative overflow-hidden">
                <img 
                  src={testimonial.image} 
                  alt={testimonial.name} 
                  className="object-cover h-full w-full"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://via.placeholder.com/400x400?text=Member";
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-yellow-500 py-2 px-4">
                  <p className="font-bold text-black">{testimonial.transformation}</p>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-2 h-10 bg-yellow-500 mr-4"></div>
                  <h3 className="text-xl font-bold text-black">{testimonial.name}</h3>
                </div>
                <p className="text-gray-700 italic">"{testimonial.quote}"</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <button className="px-8 py-3 bg-yellow-500 text-black font-bold rounded-full hover:bg-yellow-600 transition-colors duration-300 shadow-lg">
            Read More Success Stories
          </button>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
