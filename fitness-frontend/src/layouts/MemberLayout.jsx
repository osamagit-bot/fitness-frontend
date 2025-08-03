import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import MaintenanceCheck from '../components/MaintenanceCheck';
import MemberSidebar from '../components/shared/MemberSidebar';
import MemberHeader from '../components/shared/MemberHeader';
import useMultiAuth from '../hooks/useMultiAuth';
import api from '../utils/api';

const MemberDashboard = () => {
  const { authState } = useMultiAuth();
  const [userData, setUserData] = useState(null);
  const [memberData, setMemberData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authState.member.isAuthenticated) {
      setUserData(authState.member.user);
      fetchMemberData();
      fetchNotifications();
      // Setup WebSocket for real-time notifications (optional)
      const cleanup = setupWebSocket();
      return cleanup;
    }
  }, [authState.member.isAuthenticated]);

  const fetchMemberData = async () => {
    const memberId = localStorage.getItem("member_id");
    if (!memberId) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get(`members/${memberId}/`);
      setMemberData(response.data);
    } catch (err) {
      console.error("Error fetching member data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get("notifications/");
      console.log('Notifications response:', res.data);
      setNotifications(res.data.results || res.data || []);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setNotifications([]);
    }
  };

  const setupWebSocket = () => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const backendHost = import.meta.env.VITE_BACKEND_WS_HOST || "localhost:8001";
    const token = localStorage.getItem("member_access_token");

    if (!token) return;

    const wsUrl = `${protocol}://${backendHost}/ws/notifications/?token=${token}`;
    let socket;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 3;
    let heartbeatInterval;

    const connectWebSocket = () => {
      try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          console.log('WebSocket connected successfully');
          reconnectAttempts = 0;
          heartbeatInterval = setInterval(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
            }
          }, 30000);
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.notification) {
              setNotifications((prevNotifs) => {
                const all = [data.notification, ...prevNotifs];
                return Array.from(new Map(all.map((n) => [n.id, n])).values());
              });
            }
          } catch (err) {
            console.error("Error parsing WebSocket message:", err);
          }
        };

        socket.onerror = (error) => {
          console.warn('WebSocket error (real-time notifications disabled):', error);
        };

        socket.onclose = (event) => {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }
          if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
            console.log(`WebSocket reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1})`);
            setTimeout(() => {
              reconnectAttempts++;
              connectWebSocket();
            }, delay);
          } else if (reconnectAttempts >= maxReconnectAttempts) {
            console.warn('WebSocket connection failed after max attempts. Real-time notifications disabled.');
          }
        };
      } catch (error) {
        console.warn("WebSocket not available (real-time notifications disabled):", error);
      }
    };

    connectWebSocket();

    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (socket) socket.close(1000, "Component unmounting");
    };
  };

  return (
    <MaintenanceCheck>
      <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
        {/* Sidebar */}
        <MemberSidebar userData={userData} />
        
        {/* Main Content */}
        <div className="flex-1 lg:ml-64 bg-gradient-to-br from-gray-800 via-gray-800 to-black">
          {/* Header */}
          <MemberHeader 
            memberData={memberData}
            notifications={notifications}
            setNotifications={setNotifications}
            loading={loading}
          />
          
          {/* Page Content */}
          <div className="p-4 overflow-auto">
            <Outlet />
          </div>
        </div>
      </div>
    </MaintenanceCheck>
  );
};

export default MemberDashboard;
