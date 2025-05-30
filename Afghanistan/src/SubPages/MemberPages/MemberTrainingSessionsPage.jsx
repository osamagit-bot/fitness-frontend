// src/SubPages/MemberPages/MemberTrainingSessionsPage.jsx

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function MemberTrainingSessionsPage() {
  const [loading, setLoading] = useState(true);
  const [trainingSchedule, setTrainingSchedule] = useState({});
  const [editingDay, setEditingDay] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const memberId = localStorage.getItem('memberId');

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
        className="p-6"
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
      className="p-6"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.h1
        className="text-2xl font-bold mb-2"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        Weekly Training Schedule
      </motion.h1>
      <motion.p
        className="text-gray-600 mb-6"
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
        className="bg-white shadow overflow-hidden rounded-md mb-10"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-500">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-white uppercase tracking-wider">
                Day
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-white uppercase tracking-wider">
                Workout
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-white uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <AnimatePresence>
              {weekdays.map((day, idx) => (
                <motion.tr
                  key={day.key}
                  className={day.key === 'sunday' ? 'bg-gray-50' : ''}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: 0.05 * idx }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{day.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingDay === day.key ? (
                      <select
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        {workoutOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-sm text-gray-900 font-medium">
                        {trainingSchedule[day.key] || 'Rest Day'}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {editingDay === day.key ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSave}
                          className="text-green-600 hover:text-green-900"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancel}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEdit(day.key)}
                        className="text-white p-1 w-18 rounded bg-gray-500 hover:bg-gray-400 transition-all"
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
        className="bg-white shadow overflow-hidden rounded-md p-6 mb-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <h2 className="text-lg font-medium text-gray-900 mb-4">Fitness Tips</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            Aim to follow your workout schedule for at least 4-6 weeks to see results
          </li>
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            Hydrate before, during, and after your workouts
          </li>
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            Get enough protein to support muscle recovery and growth
          </li>
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            Ensure you're getting 7-9 hours of quality sleep each night
          </li>
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            Consider taking progress photos monthly to track your transformation
          </li>
        </ul>
      </motion.div>

      {/* Simple Trainer Section */}
      <motion.div
        className="bg-blue-50 shadow overflow-hidden rounded-md p-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex flex-col sm:flex-row items-start">
          <div className="sm:flex-1">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Need Personalized Guidance?</h2>
            <p className="text-sm text-gray-600 mb-4">
              Our certified personal trainers can help you create a custom workout program
              tailored to your specific goals and needs.
            </p>
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Book a Trainer
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default MemberTrainingSessionsPage;