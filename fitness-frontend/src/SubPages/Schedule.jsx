import React from "react";

const schedule = [
  {
    day: "Saturday",
    muscleGroup: "Chest",
    images: [
      "/images/chest1.jpg",
     
    ],
  },
  {
    day: "Sunday",
    muscleGroup: "Back",
    images: [
      "https://source.unsplash.com/featured/?lat-pulldown",
      "https://source.unsplash.com/featured/?deadlift",
      "https://source.unsplash.com/featured/?pull-up",
      "https://source.unsplash.com/featured/?barbell-row",
      "https://source.unsplash.com/featured/?seated-row",
      "https://source.unsplash.com/featured/?t-bar-row",
    ],
  },
  {
    day: "Monday",
    muscleGroup: "Biceps",
    images: [
      "https://source.unsplash.com/featured/?bicep-curl",
      "https://source.unsplash.com/featured/?hammer-curl",
      "https://source.unsplash.com/featured/?preacher-curl",
      "https://source.unsplash.com/featured/?concentration-curl",
      "https://source.unsplash.com/featured/?dumbbell-bicep-curl",
      "https://source.unsplash.com/featured/?barbell-curl",
    ],
  },
  {
    day: "Tuesday",
    muscleGroup: "Triceps",
    images: [
      "https://source.unsplash.com/featured/?tricep-pushdown",
      "https://source.unsplash.com/featured/?skull-crusher",
      "https://source.unsplash.com/featured/?dips",
      "https://source.unsplash.com/featured/?overhead-tricep-extension",
      "https://source.unsplash.com/featured/?close-grip-bench",
      "https://source.unsplash.com/featured/?cable-triceps",
    ],
  },
  {
    day: "Wednesday",
    muscleGroup: "Shoulders",
    images: [
      "https://source.unsplash.com/featured/?shoulder-press",
      "https://source.unsplash.com/featured/?lateral-raise",
      "https://source.unsplash.com/featured/?rear-delt-fly",
      "https://source.unsplash.com/featured/?military-press",
      "https://source.unsplash.com/featured/?dumbbell-shoulder",
      "https://source.unsplash.com/featured/?front-raise",
    ],
  },
  {
    day: "Thursday",
    muscleGroup: "Legs",
    images: [
      "https://source.unsplash.com/featured/?squat",
      "https://source.unsplash.com/featured/?deadlift",
      "https://source.unsplash.com/featured/?leg-press",
      "https://source.unsplash.com/featured/?lunges",
      "https://source.unsplash.com/featured/?hamstring-curl",
      "https://source.unsplash.com/featured/?leg-extension",
    ],
  },
  {
    day: "Friday",
    muscleGroup: "Core",
    images: [
      "https://source.unsplash.com/featured/?abs",
      "https://source.unsplash.com/featured/?plank",
      "https://source.unsplash.com/featured/?situp",
      "https://source.unsplash.com/featured/?crunch",
      "https://source.unsplash.com/featured/?leg-raise",
      "https://source.unsplash.com/featured/?core-workout",
    ],
  },
];

const SchedulePage = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-yellow-400 p-6">
      <div className="max-w-6xl mx-auto mt-30">
        <h1 className="text-4xl font-bold mb-8 border-b border-yellow-400 pb-2">
          🗓️ Weekly Muscle Group Focus
        </h1>
        <div className="space-y-12">
          {schedule.map((item, idx) => (
            <div key={idx}>
              <h2 className="text-3xl font-semibold mb-4 text-yellow-300">
                {item.day}: <span className="text-white">{item.muscleGroup}</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {item.images.map((img, i) => (
                  <div key={i} className="overflow-hidden rounded-2xl shadow-md hover:scale-105 transition-transform">
                    <img
                      src={`${img}&${idx}-${i}`} // Avoid caching by appending index
                      alt={`${item.muscleGroup} workout ${i + 1}`}
                      className="w-full h-48 object-cover rounded-2xl"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SchedulePage;
