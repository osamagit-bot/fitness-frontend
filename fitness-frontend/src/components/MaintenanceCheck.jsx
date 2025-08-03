import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const MaintenanceCheck = ({ children }) => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        // Only check maintenance mode for admin users
        const isAdmin = localStorage.getItem('admin_access_token');
        const isMember = localStorage.getItem('member_access_token');
        
        // Skip maintenance check for members - they don't need to check this
        if (isMember && !isAdmin) {
          setMaintenanceMode(false);
          setLoading(false);
          return;
        }
        
        // Only admins should check maintenance mode
        if (isAdmin) {
          const response = await api.get('/admin-dashboard/maintenance-mode/');
          const isMaintenanceActive = response.data.enabled || false;
          
          if (isMaintenanceActive) {
            // Clear member session and redirect to login
            localStorage.removeItem('member_access_token');
            localStorage.removeItem('member_refresh_token');
            localStorage.removeItem('member_user_id');
            localStorage.removeItem('member_username');
            localStorage.removeItem('member_name');
            localStorage.removeItem('member_id');
            localStorage.removeItem('member_isAuthenticated');
            
            navigate('/login');
            return;
          }
        }
        
        setMaintenanceMode(false);
      } catch (error) {
        // Handle all errors gracefully
        console.log('Maintenance check skipped or failed:', error.message);
        setMaintenanceMode(false);
      } finally {
        setLoading(false);
      }
    };

    checkMaintenance();
    
    // Check maintenance mode every 30 seconds
    const interval = setInterval(checkMaintenance, 30000);
    
    return () => clearInterval(interval);
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return children;
};

export default MaintenanceCheck;