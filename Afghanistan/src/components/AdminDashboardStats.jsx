import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // Fetch data in parallel
      const [membersRes, trainersRes] = await Promise.all([
        axios.get('http://127.0.0.1:8000/api/members/', {
          headers: {'Authorization': `Bearer ${token}`}
        }),
        axios.get('http://127.0.0.1:8000/api/trainers/', {
          headers: {'Authorization': `Bearer ${token}`}
        })
      ]);
      
      // Process data
      const members = Array.isArray(membersRes.data) ? membersRes.data : (membersRes.data.results || []);
      const trainers = Array.isArray(trainersRes.data) ? trainersRes.data : (trainersRes.data.results || []);
      
      // Calculate revenue
      let revenue = 0;
      members.forEach(member => {
        if (member?.monthly_fee) {
          const fee = parseFloat(member.monthly_fee);
          if (!isNaN(fee)) revenue += fee;
        }
      });
      
      // Update and save stats
      const newStats = {
        totalMembers: members.length,
        activeTrainers: trainers.length,
        monthlyRevenue: revenue,
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
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

      {/* Monthly Revenue Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500">Monthly Revenue</p>
            {stats.isLoading ? (
              <div className="animate-pulse h-8 w-16 bg-gray-200 rounded mt-1"></div>
            ) : (
              <p className="text-2xl font-bold mt-1">{stats.monthlyRevenue.toFixed(2)} AFN</p>
            )}
          </div>
          <div className="p-3 rounded-lg bg-green-100 text-green-600">
            <i className="bx bx-dollar text-xl"></i>
          </div>
        </div>
        <div className="mt-4">
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-300"
              style={{ width: `${Math.min(100, (stats.monthlyRevenue / 10000) * 100)}%` }}
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