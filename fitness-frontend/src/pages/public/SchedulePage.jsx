
const schedule = [
  {
    day: "Saturday",
    muscleGroup: "Chest",
    images: [
      "/images/chest1.jpg",
      "/images/chest2.png",
      "/images/chest3.jpg",

     
    ],
  },
  {
    day: "Sunday",
    muscleGroup: "Back",
    images: [
      
    ],
  },
  {
    day: "Monday",
    muscleGroup: "Biceps",
    images: [

    ],
  },
  {
    day: "Tuesday",
    muscleGroup: "Triceps",
    images: [

    ],
  },
  {
    day: "Wednesday",
    muscleGroup: "Shoulders",
    images: [
     
    ],
  },
  {
    day: "Thursday",
    muscleGroup: "Legs",
    images: [

    ],
  },
  {
    day: "Friday",
    muscleGroup: "Core",
    images: [
 
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
                      src={`${img}?v=${idx}-${i}`} // Avoid caching by appending index as query param
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
