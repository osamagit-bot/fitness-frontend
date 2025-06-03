// src/SubPages/TrainerPages/TrainerDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function TrainerDashboard() {
  const [trainer, setTrainer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const userType = localStorage.getItem('userType');
      
      if (!token || userType !== 'trainer') {
        navigate('/login');
        return;
      }
      
      try {
        setLoading(true);
        const response = await axios.get('http://127.0.0.1:8000/api/trainer-profile/', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('Trainer profile data:', response.data);
        setTrainer(response.data);
        setError(null);
      } catch (error) {
        console.error('Error fetching trainer profile:', error);
        setError('Failed to load trainer profile');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('username');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="mt-4 px-4 py-2 bg-yellow-500 text-black rounded hover:bg-yellow-600"
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-black shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-yellow-400">Trainer Dashboard</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-yellow-500 text-black rounded hover:bg-yellow-600"
          >
            Logout
          </button>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Trainer Profile</h2>
          {trainer && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">Name</p>
                <p className="font-medium">{trainer.first_name} {trainer.last_name}</p>
              </div>
              
              <div>
                <p className="text-gray-600">ID</p>
                <p className="font-medium">{trainer.trainer_id}</p>
              </div>
              
              <div>
                <p className="text-gray-600">Email</p>
                <p className="font-medium">{trainer.email}</p>
              </div>
              
              <div>
                <p className="text-gray-600">Phone</p>
                <p className="font-medium">{trainer.phone || 'N/A'}</p>
              </div>
              
              <div>
                <p className="text-gray-600">Specialization</p>
                <p className="font-medium">{trainer.specialization}</p>
              </div>
              
              <div>
                <p className="text-gray-600">Schedule</p>
                <p className="font-medium capitalize">{trainer.schedule}</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Your Sessions</h2>
          <p className="text-gray-600">Your training sessions will appear here.</p>
          {/* This would display trainer's assigned sessions */}
          <div className="mt-4 text-center">
            <p className="text-gray-500">No sessions available yet.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default TrainerDashboard;
