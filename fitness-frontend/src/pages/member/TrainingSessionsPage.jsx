// src/SubPages/MemberPages/MemberTrainingSessionsPage.jsx

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

function MemberTrainingSessionsPage() {
  const [loading, setLoading] = useState(true);
  const [trainingSchedule, setTrainingSchedule] = useState({});
  const [editingDay, setEditingDay] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const memberId = localStorage.getItem('member_id');

  const weekdays = [
    { name: 'Monday', key: 'monday' },
    { name: 'Tuesday', key: 'tuesday' },
    { name: 'Wednesday', key: 'wednesday' },
    { name: 'Thursday', key: 'thursday' },
    { name: 'Friday', key: 'friday' },
    { name: 'Saturday', key: 'saturday' },
    { name: 'Sunday', key: 'sunday' }
  ];

  // Workout options for dropdown
  const workoutOptions = [
    'Rest Day',
    'Chest',
    'Back',
    'Legs',
    'Shoulders',
    'Arms',
    'Biceps',
    'Triceps',
    'Thighs',
    'Abs',
    'Cardio',
    'Full Body',
    'Upper Body',
    'Lower Body',
    'Push',
    'Pull'
  ];

  useEffect(() => {
    // Try to load from localStorage first
    const savedSchedule = localStorage.getItem(`training_schedule_${memberId}`);

    if (savedSchedule) {
      try {
        const parsedSchedule = JSON.parse(savedSchedule);
        setTrainingSchedule(parsedSchedule);
      } catch (e) {
        console.error("Error parsing saved schedule:", e);
        // Fall back to default if parsing fails
        setDefaultSchedule();
      }
    } else {
      // Set default schedule if nothing in localStorage
      setDefaultSchedule();
    }

    setLoading(false);
  }, [memberId]);

  // Helper function to set default schedule
  const setDefaultSchedule = () => {
    const defaultSchedule = {
      monday: 'Chest',
      tuesday: 'Back',
      wednesday: 'Legs',
      thursday: 'Shoulders',
      friday: 'Arms',
      saturday: 'Abs',
      sunday: 'Rest Day'
    };

    setTrainingSchedule(defaultSchedule);
  };

  const handleEdit = (day) => {
    setEditingDay(day);
    setEditValue(trainingSchedule[day] || '');
  };

  const handleSave = () => {
    if (!editingDay) return;

    try {
      // Create a new object with the updated values to ensure state change
      const updatedSchedule = { ...trainingSchedule };
      updatedSchedule[editingDay] = editValue;

      // Update state with the new object
      setTrainingSchedule(updatedSchedule);

      // Save to localStorage with member ID for uniqueness
      localStorage.setItem(`training_schedule_${memberId}`, JSON.stringify(updatedSchedule));

      setSuccess(`Your ${editingDay} workout has been updated to ${editValue}!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error updating training schedule:', error);
      setError('Failed to update workout schedule');
      setTimeout(() => setError(null), 3000);
    }

    // Reset editing state
    setEditingDay(null);
    setEditValue('');
  };

  const handleCancel = () => {
    setEditingDay(null);
    setEditValue('');
  };

  if (loading) {
    return (
      <motion.div
        className="p-6 mt-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h1 className="text-2xl font-bold mb-6">Training Sessions</h1>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded mb-4"></div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="p-6 mt-5 min-h-screen bg-gradient-to-br from-gray-800 via-gray-800 to-black"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.h1
        className="text-2xl font-bold mb-2 text-white"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        Weekly Training Schedule
      </motion.h1>
      <motion.p
        className="text-gray-300 mb-6"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 }}
      >
        Manage your workout routine for the week
      </motion.p>

      <AnimatePresence>
        {error && (
          <motion.div
            className="bg-red-100 border-l-4 border-red-500 p-4 mb-6 text-red-700"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {success && (
          <motion.div
            className="bg-green-100 border-l-4 border-green-500 p-4 mb-6 text-green-700"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Simple Workout Table */}
      <motion.div
        className="bg-gray-700 shadow overflow-hidden rounded-md mb-10 border border-gray-600"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-yellow-500 to-yellow-600">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-black uppercase tracking-wider">
                Day
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-black uppercase tracking-wider">
                Workout
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-black uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-700 divide-y divide-gray-600">
            <AnimatePresence>
              {weekdays.map((day, idx) => (
                <motion.tr
                  key={day.key}
                  className={day.key === 'sunday' ? 'bg-gray-600' : ''}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: 0.05 * idx }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{day.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingDay === day.key ? (
                      <select
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="mt-1 block w-full py-2 px-3 border border-gray-600 bg-gray-600 text-white rounded-md shadow-sm focus:outline-none sm:text-sm"
                      >
                        {workoutOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-sm text-white font-medium">
                        {trainingSchedule[day.key] || 'Rest Day'}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {editingDay === day.key ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSave}
                          className="text-green-400 hover:text-green-300"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancel}
                          className="text-gray-300 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEdit(day.key)}
                        className="text-black p-1 w-18 rounded bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 transition-all"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </motion.div>

      {/* Simple Tips Section */}
      <motion.div
        className="bg-gray-700 shadow overflow-hidden rounded-md p-6 mb-10 border border-gray-600"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <h2 className="text-lg font-medium text-white mb-4">Fitness Tips</h2>
        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex items-start">
            <span className="text-yellow-400 mr-2">•</span>
            Aim to follow your workout schedule for at least 4-6 weeks to see results
          </li>
          <li className="flex items-start">
            <span className="text-yellow-400 mr-2">•</span>
            Hydrate before, during, and after your workouts
          </li>
          <li className="flex items-start">
            <span className="text-yellow-400 mr-2">•</span>
            Get enough protein to support muscle recovery and growth
          </li>
          <li className="flex items-start">
            <span className="text-yellow-400 mr-2">•</span>
            Ensure you're getting 7-9 hours of quality sleep each night
          </li>
          <li className="flex items-start">
            <span className="text-yellow-400 mr-2">•</span>
            Consider taking progress photos monthly to track your transformation
          </li>
        </ul>
      </motion.div>


    </motion.div>
  );
}

export default MemberTrainingSessionsPage;
