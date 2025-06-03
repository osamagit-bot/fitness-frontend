import React from 'react';

const BlogPreview = () => {
  const blogPosts = [
    {
      id: 1,
      title: "5 Essential Exercises for Building Core Strength",
      excerpt: "Discover the most effective exercises to strengthen your core and improve overall stability. These movements target all the muscles in your midsection.",
      category: "Workout Tips",
      image: "/path/to/core-strength.jpg", // Replace with actual image path
      date: "Oct 12, 2023"
    },
    {
      id: 2,
      title: "The Ultimate Guide to Post-Workout Nutrition",
      excerpt: "Learn what and when to eat after your workouts to maximize recovery, build muscle, and prepare for your next training session.",
      category: "Nutrition",
      image: "/path/to/post-workout.jpg", // Replace with actual image path
      date: "Sep 28, 2023"
    },
    {
      id: 3,
      title: "How to Break Through Your Fitness Plateau",
      excerpt: "Feeling stuck in your fitness journey? Try these proven strategies to overcome plateaus and continue making progress toward your goals.",
      category: "Training",
      image: "/path/to/plateau.jpg", // Replace with actual image path
      date: "Sep 15, 2023"
    }
  ];

  const categories = [
    "Workout Tips", "Nutrition", "Training", "Recovery", "Success Stories"
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-black mb-4">Fitness Tips & Insights</h2>
          <div className="w-24 h-1 bg-yellow-500 mx-auto"></div>
          <p className="mt-4 text-gray-800 max-w-2xl mx-auto">
            Expert advice to help you on your fitness journey
          </p>
        </div>

        {/* Blog Categories */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {categories.map((category, index) => (
            <span
              key={index}
              className="px-4 py-1 text-sm bg-white border border-gray-200 rounded-full text-gray-700 hover:bg-yellow-100 hover:border-yellow-400 transition-colors duration-300 cursor-pointer"
            >
              {category}
            </span>
          ))}
        </div>

        {/* Blog Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {blogPosts.map((post) => (
            <div 
              key={post.id} 
              className="bg-white rounded-lg overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              <div className="h-48 overflow-hidden">
                <img 
                  src={post.image} 
                  alt={post.title} 
                  className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://via.placeholder.com/600x400?text=Blog+Post";
                  }}
                />
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="bg-yellow-100 text-yellow-800 text-xs font-medium py-1 px-2 rounded">
                    {post.category}
                  </span>
                  <span className="text-gray-500 text-sm">{post.date}</span>
                </div>
                
                <h3 className="text-xl font-bold text-black mb-3">{post.title}</h3>
                
                <p className="text-gray-600 mb-4 line-clamp-3">
                  {post.excerpt}
                </p>
                
                <a 
                  href={`/blog/${post.id}`} 
                  className="inline-flex items-center font-medium text-yellow-600 hover:text-yellow-800"
                >
                  Read More 
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <button className="px-8 py-3 bg-black text-white font-bold rounded-full hover:bg-gray-900 transition-colors duration-300 shadow-lg">
            View All Articles
          </button>
        </div>
      </div>
    </section>
  );
};

export default BlogPreview;
