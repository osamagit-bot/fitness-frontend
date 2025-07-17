import { useEffect, useState } from 'react';
import api from '../../utils/api';
const AdminDashboardStats = () => {
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeTrainers: 0,
    monthlyRevenue: 0,
    pendingTasks: 5,
    isLoading: true,
  });

  useEffect(() => {
    // Load stats from localStorage first
    const savedStats = localStorage.getItem('adminDashboardStats');
    if (savedStats) {
      setStats({...JSON.parse(savedStats), isLoading: true});
    }
    
    // Then fetch fresh data
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      
      // Fetch data in parallel
      const [membersRes, trainersRes, purchasesRes] = await Promise.all([
        api.get('members/', {
          headers: {'Authorization': `Bearer ${token}`}
        }),
        api.get('trainers/', {
          headers: {'Authorization': `Bearer ${token}`}
        }),
        api.get('purchases/', {
          headers: {'Authorization': `Bearer ${token}`}
        })
      ]);
      
      // Process data
      const members = Array.isArray(membersRes.data) ? membersRes.data : (membersRes.data.results || []);
      const trainers = Array.isArray(trainersRes.data) ? trainersRes.data : (trainersRes.data.results || []);
      const purchases = Array.isArray(purchasesRes.data) ? purchasesRes.data : (purchasesRes.data.results || []);
      
      // Calculate revenue
      let revenue = 0;
      members.forEach(member => {
        if (member?.monthly_fee) {
          const fee = parseFloat(member.monthly_fee);
          if (!isNaN(fee)) revenue += fee;
        }
      });
      let purchaseRevenue = 0;
      purchases.forEach(purchase => {
        const price = parseFloat(purchase.total_price);
        if (!isNaN(price)) purchaseRevenue += price;
      });
      
      // Update and save stats
      const newStats = {
        totalMembers: members.length,
        activeTrainers: trainers.length,
        monthlyRevenue: revenue + purchaseRevenue,
        pendingTasks: 5,
        isLoading: false
      };
      
      setStats(newStats);
      localStorage.setItem('adminDashboardStats', JSON.stringify(newStats));
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats(prev => ({...prev, isLoading: false}));
    }
  };

  return (
    <div className="grid ju grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
      {/* Total Members Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500">Total Members</p>
            {stats.isLoading ? (
              <div className="animate-pulse h-8 w-16 bg-gray-200 rounded mt-1"></div>
            ) : (
              <p className="text-2xl font-bold mt-1">{stats.totalMembers}</p>
            )}
          </div>
          <div className="p-3 rounded-lg bg-indigo-100 text-indigo-600">
            <i className="bx bx-user text-xl"></i>
          </div>
        </div>
        <div className="mt-4">
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-300"
              style={{ width: `${Math.min(100, (stats.totalMembers / 300) * 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Active Trainers Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500">Active Trainers</p>
            {stats.isLoading ? (
              <div className="animate-pulse h-8 w-16 bg-gray-200 rounded mt-1"></div>
            ) : (
              <p className="text-2xl font-bold mt-1">{stats.activeTrainers}</p>
            )}
          </div>
          <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
            <i className="bx bx-user-voice text-xl"></i>
          </div>
        </div>
        <div className="mt-4">
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-300"
              style={{ width: `${Math.min(100, (stats.activeTrainers / 20) * 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Pending Tasks Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500">Pending Tasks</p>
            {stats.isLoading ? (
              <div className="animate-pulse h-8 w-16 bg-gray-200 rounded mt-1"></div>
            ) : (
              <p className="text-2xl font-bold mt-1">{stats.pendingTasks}</p>
            )}
          </div>
          <div className="p-3 rounded-lg bg-amber-100 text-amber-600">
            <i className="bx bx-task text-xl"></i>
          </div>
        </div>
        <div className="mt-4">
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-300"
              style={{ width: `${Math.min(100, (stats.pendingTasks / 10) * 100)}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardStats;
