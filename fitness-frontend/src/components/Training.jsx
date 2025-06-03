import React from "react";

const trainings = [
  {
    image: "/images/chest.jpeg",
    title: "Chest Workout",
    desc: "Embrace the essence of strength as we delve into its physical, mental, and emotional dimensions.",
  },
  {
    image: "/images/shoulder.jpg",
    title: "Shoulder Workout",
    desc: "Improve health, strength, flexibility, and overall well-being through dynamic activities.",
  },
  {
    image: "/images/fat.jpg",
    title: "Fat Loss",
    desc: "With routines and guidance, we’ll help you burn fat and reach your goals effectively.",
  },
  {
    image: "/images/weight.jpg",
    title: "Weight Gain",
    desc: "Our program provides a structured approach to gaining weight in a sustainable manner.",
  },
];

const TrainingSection = () => {
  return (
    <section className="bg-transparent text-yellow-500 py-16 px-4 md:px-12">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl text-gray-700 font-bold mb-6 inline-block relative">
          START <span className="text-yellow-400">TRAINING</span>
          <span className="block w-20 h-1 bg-yellow-400 mx-auto mt-2 rounded-full"></span>
        </h2>
        <div className="grid gap-6 md:grid-cols-4 mt-10">
          {trainings.map((item, index) => (
            <div
              key={index}
              className="bg-black/80 text-yellow-500 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 flex flex-col"
            >
              <div className="overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-48 object-cover transform hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-sm mb-4">{item.desc}</p>
                </div>
                <a
                  href="#"
                  className="text-sm font-semibold hover:underline text-yellow-400 mt-auto"
                >
                  Join Now →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrainingSection;
