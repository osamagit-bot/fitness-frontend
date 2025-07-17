import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../../utils/api';


function DashboardPage() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeMembers: 0,
    activeTrainers: 0, // Added active trainers
    upcomingTrainings: 0,
    presentMembers: 0,
    totalAttendance: 0,
    revenueGrowth: 5.2,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentMembers, setRecentMembers] = useState([]);
  const [membershipStats, setMembershipStats] = useState([]);
  const [genderDistribution, setGenderDistribution] = useState([]);
  const [attendanceTrend, setAttendanceTrend] = useState([]);
  const [memberFrequency, setMemberFrequency] = useState([]);
  const [topActiveMembers, setTopActiveMembers] = useState([]);
  const [shopRevenue, setShopRevenue] = useState(0);

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  useEffect(() => {
    fetchStats();
    fetchRecentMembers();
    generateMemberInsights();
  }, []);

  const generateMemberInsights = async () => {
    try {
      const membersResponse = await api.get("members/");
      let membersList = [];
      if (Array.isArray(membersResponse.data)) {
        membersList = membersResponse.data;
      } else if (
        membersResponse.data.results &&
        Array.isArray(membersResponse.data.results)
      ) {
        membersList = membersResponse.data.results;
      }

      // Membership type distribution
      const membershipTypes = {};
      membersList.forEach((member) => {
        const type = member.membership_type || "Unknown";
        membershipTypes[type] = (membershipTypes[type] || 0) + 1;
      });
      setMembershipStats(
        Object.keys(membershipTypes).map((type) => ({
          name: type,
          value: membershipTypes[type],
        }))
      );

      // Gender distribution
      const genderCount = { Male: 0, Female: 0, Other: 0 };
      membersList.forEach((member) => {
        const gender = member.gender || "Other";
        if (gender in genderCount) genderCount[gender]++;
        else genderCount.Other++;
      });
      setGenderDistribution(
        Object.keys(genderCount).map((gender) => ({
          name: gender,
          value: genderCount[gender],
        }))
      );

      // Attendance records & insights
      try {
        const attendanceResponse = await api.get(
          "attendance/history/?today_only=true"
        );
        const memberAttendanceCounts = {};

        if (Array.isArray(attendanceResponse.data)) {
          // Mock attendance trend data for 7 days
          const last7Days = Array(7)
            .fill(0)
            .map((_, i) => {
              const date = new Date();
              date.setDate(date.getDate() - (6 - i));
              return {
                day: date.toLocaleDateString("en-US", { weekday: "short" }),
                count: Math.floor(Math.random() * 25) + 5,
              };
            });
          setAttendanceTrend(last7Days);

          attendanceResponse.data.forEach((record) => {
            const memberId = record.member_id || record.athlete_id;
            if (!memberId) return;
            memberAttendanceCounts[memberId] =
              (memberAttendanceCounts[memberId] || 0) + 1;
          });

          // Top active members
          const memberAttendanceArray = Object.entries(memberAttendanceCounts)
            .map(([id, count]) => {
              const member = membersList.find(
                (m) =>
                  m.id === id ||
                  m.athlete_id === id ||
                  String(m.id) === id ||
                  String(m.athlete_id) === id
              );
              return {
                id,
                name: member
                  ? `${member.first_name} ${member.last_name}`
                  : `Member #${id}`,
                count,
              };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
          setTopActiveMembers(memberAttendanceArray);

          // Frequency distribution
          const frequencyGroups = {
            "Frequent (10+)": 0,
            "Regular (5-9)": 0,
            "Occasional (2-4)": 0,
            "Rare (1)": 0,
            "Inactive (0)": 0,
          };
          Object.values(memberAttendanceCounts).forEach((count) => {
            if (count >= 10) frequencyGroups["Frequent (10+)"]++;
            else if (count >= 5) frequencyGroups["Regular (5-9)"]++;
            else if (count >= 2) frequencyGroups["Occasional (2-4)"]++;
            else if (count === 1) frequencyGroups["Rare (1)"]++;
          });
          frequencyGroups["Inactive (0)"] =
            membersList.length - Object.keys(memberAttendanceCounts).length;
          setMemberFrequency(
            Object.keys(frequencyGroups).map((key) => ({
              name: key,
              value: frequencyGroups[key],
            }))
          );
        }
      } catch (err) {
        console.error("Error fetching attendance for insights:", err);
      }
    } catch (err) {
      console.error("Error generating member insights:", err);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch members (for count)
      const membersResponse = await api.get("members/");
      // Fetch purchases (shop revenue)
      const purchasesResponse = await api.get("purchases/");
      // Fetch membership payments sum from backend (dynamic revenue)
      const paymentsResponse = await api.get("members/payments_summary/");

      // Fetch trainers data
      const trainersResponse = await api.get("trainers/");

      // Calculate shop revenue
      let shopRevenueTotal = 0;
      let purchasesList = [];
      if (Array.isArray(purchasesResponse.data)) {
        purchasesList = purchasesResponse.data;
      } else if (
        purchasesResponse.data.results &&
        Array.isArray(purchasesResponse.data.results)
      ) {
        purchasesList = purchasesResponse.data.results;
      }
      purchasesList.forEach((purchase) => {
        if (purchase && purchase.total_price) {
          const price = parseFloat(purchase.total_price);
          if (!isNaN(price)) shopRevenueTotal += price;
        }
      });
      setShopRevenue(shopRevenueTotal);

      // Calculate members count - handle array and paginated response
      let membersList = [];
      if (Array.isArray(membersResponse.data)) {
        membersList = membersResponse.data;
      } else if (
        membersResponse.data.results &&
        Array.isArray(membersResponse.data.results)
      ) {
        membersList = membersResponse.data.results;
      }

      // Only count active members (is_active !== false)
      const activeMembersList = membersList.filter(
        (m) => m.is_active !== false
      );
      const membersCount = activeMembersList.length;

      // Calculate trainers count - handle array and paginated response
      let trainersList = [];
      if (Array.isArray(trainersResponse.data)) {
        trainersList = trainersResponse.data;
      } else if (
        trainersResponse.data.results &&
        Array.isArray(trainersResponse.data.results)
      ) {
        trainersList = trainersResponse.data.results;
      }
      const trainersCount = trainersList.length;

      // Total revenue from membership payments (dynamic)
      const totalRevenue = paymentsResponse.data.monthly_payments || 0;

      // Attendance data for present count & total attendance
      let presentCount = 0;
      let totalAttendance = 0;
      try {
        const attendanceResponse = await api.get(
          `attendance/history/?today_only=true`
        );
        if (Array.isArray(attendanceResponse.data)) {
          presentCount = attendanceResponse.data.filter(
            (r) => r.check_in_time && !r.check_out_time
          ).length;
          totalAttendance = attendanceResponse.data.length;
        }
      } catch (attendanceError) {
        console.error("Error fetching attendance:", attendanceError);
      }

      setStats({
        totalRevenue: totalRevenue,
        activeMembers: membersCount,
        activeTrainers: trainersCount, // Added trainers count
        upcomingTrainings: 0,
        presentMembers: presentCount,
        totalAttendance: totalAttendance,
        revenueGrowth: 5.2,
      });

      setError(null);
    } catch (error) {
      console.error("Error fetching stats:", error);
      if (error.response) {
        setError(
          `Failed to load statistics: Server responded with ${error.response.status}`
        );
      } else if (error.request) {
        setError("Failed to load statistics: No response from server.");
      } else {
        setError(`Failed to load statistics: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentMembers = async () => {
    try {
      const response = await api.get("members/");
      let memberList = [];
      if (Array.isArray(response.data)) {
        memberList = response.data.slice(0, 5);
      } else if (
        response.data.results &&
        Array.isArray(response.data.results)
      ) {
        memberList = response.data.results.slice(0, 5);
      }
      setRecentMembers(memberList);
    } catch (error) {
      console.error("Error fetching recent members:", error);
    }
  };

  const formatAfn = (amount) => `${parseFloat(amount).toFixed(2)} AFN`;

  const getMembershipStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800";
      case "expired":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="p-6 bg-gray-200 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 mr-2 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            Dashboard
          </h1>
          <p className="text-gray-600">
            Welcome to your fitness club management dashboard
          </p>
        </div>
        <button
          onClick={() => {
            fetchStats();
            fetchRecentMembers();
            generateMemberInsights();
          }}
          className="mt-4 md:mt-0 flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg shadow-md hover:bg-gray-400 transition-colors duration-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {loading ? "Refreshing..." : "Refresh Dashboard"}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow-sm">
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="font-medium">{error}</p>
          </div>
          <p className="mt-2 text-sm">
            The dashboard will continue to function with available data.
          </p>
        </div>
      )}

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
        {/* Total Revenue Card */}
        <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow transform hover:-translate-y-1 duration-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">
                Member Revenue
              </p>
              {loading ? (
                <div className="animate-pulse h-8 bg-gray-200 rounded w-32 mb-1"></div>
              ) : (
                <p className="text-2xl font-bold text-gray-900">
                  {formatAfn(stats.totalRevenue)}
                </p>
              )}
              <div className="flex items-center mt-2">
                <span className="text-green-500 flex items-center text-sm font-medium">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                  {stats.revenueGrowth}%
                </span>
                <span className="text-gray-400 text-sm ml-1">
                  vs last month
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Shop Revenue Card */}
        <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow transform hover:-translate-y-1 duration-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">
                Shop Revenue
              </p>
              {loading ? (
                <div className="animate-pulse h-8 bg-gray-200 rounded w-32 mb-1"></div>
              ) : (
                <p className="text-2xl font-bold text-gray-900">
                  {formatAfn(shopRevenue)}
                </p>
              )}
              <div className="flex items-center mt-2">
                <span className="text-green-500 flex items-center text-sm font-medium">
                  {/* You can add a growth % here if you want */}
                </span>
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Active Members Card */}
        <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow transform hover:-translate-y-1 duration-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">
                Active Members
              </p>
              {loading ? (
                <div className="animate-pulse h-8 bg-gray-200 rounded w-16 mb-1"></div>
              ) : (
                <p className="text-2xl font-bold text-gray-900">
                  {stats.activeMembers}
                </p>
              )}
              <p className="text-gray-500 text-sm mt-2">
                Total registered athletes
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Active Trainers Card - Integrated from AdminDashboardStats */}
        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow transform hover:-translate-y-1 duration-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">
                Active Trainers
              </p>
              {loading ? (
                <div className="animate-pulse h-8 w-16 bg-gray-200 rounded mt-1"></div>
              ) : (
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.activeTrainers}
                </p>
              )}
              <p className="text-gray-500 text-sm mt-2">Available trainers</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50">
              <i className="bx bx-user-voice text-2xl text-blue-500"></i>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-300"
                style={{
                  width: `${Math.min(100, (stats.activeTrainers / 20) * 100)}%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Present Members Card */}
        <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow transform hover:-translate-y-1 duration-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">
                Present Members
              </p>
              {loading ? (
                <div className="animate-pulse h-8 bg-gray-200 rounded w-16 mb-1"></div>
              ) : (
                <p className="text-2xl font-bold text-gray-900">
                  {stats.presentMembers}
                </p>
              )}
              <p className="text-gray-500 text-sm mt-2">Currently in the gym</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-purple-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Attendance Card */}
        <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow transform hover:-translate-y-1 duration-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">
                Total Check-ins
              </p>
              {loading ? (
                <div className="animate-pulse h-8 bg-gray-200 rounded w-16 mb-1"></div>
              ) : (
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalAttendance}
                </p>
              )}
              <p className="text-gray-500 text-sm mt-2">
                Today's total attendance
              </p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-yellow-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Member Analytics Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Member Analytics
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Membership Distribution Chart */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Membership Distribution
            </h3>
            {membershipStats.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={membershipStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {membershipStats.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value} members`, "Count"]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex justify-center items-center h-72 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No membership data available</p>
              </div>
            )}
          </div>
          {/* Member Attendance Trend */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Weekly Attendance Trend
            </h3>
            {attendanceTrend.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={attendanceTrend}>
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#8884d8"
                      activeDot={{ r: 8 }}
                      name="Check-ins"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex justify-center items-center h-72 bg-gray-50 rounded-lg">
                <p className="text-gray-500">
                  No attendance trend data available
                </p>
              </div>
            )}
          </div>
          {/* Member Attendance Frequency */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Member Attendance Frequency
            </h3>
            {memberFrequency.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={memberFrequency}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" name="Members" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex justify-center items-center h-72 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No frequency data available</p>
              </div>
            )}
          </div>
          {/* Gender Distribution Chart */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Gender Distribution
            </h3>
            {genderDistribution.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {genderDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value} members`, "Count"]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex justify-center items-center h-72 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No gender data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Active Members */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            Top Active Members
          </h2>
          <Link
            to="/admin/members"
            className="text-blue-500 hover:text-blue-700 flex items-center"
          >
            <span>View All</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 ml-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
        </div>
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center py-3">
                <div className="rounded-full bg-gray-200 h-10 w-10 mr-4"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {topActiveMembers.length > 0 ? (
              topActiveMembers.map((member, index) => (
                <div key={index} className="flex items-center py-3">
                  <div className="bg-gray-200 rounded-full h-10 w-10 flex items-center justify-center mr-4 font-bold text-gray-600">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{member.name}</h3>
                    <p className="text-sm text-gray-500">Member #{member.id}</p>
                  </div>
                  <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {member.count} Check-ins
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-4 text-gray-500">
                No attendance data available
              </p>
            )}
          </div>
        )}
      </div>

      {/* Recent Members */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Recent Members</h2>
          <Link
            to="/admin/members"
            className="text-blue-500 hover:text-blue-700 flex items-center"
          >
            <span>View All</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 ml-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Membership
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
                        <div className="ml-4">
                          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-3 w-16 bg-gray-200 rounded mt-1 animate-pulse"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 w-10 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                  </tr>
                ))
              ) : recentMembers.length > 0 ? (
                recentMembers.map((member, index) => (
                  <tr key={member.id || member.athlete_id || index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold">
                          {member.first_name?.[0]}
                          {member.last_name?.[0]}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {member.first_name} {member.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {member.email || "No email"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.athlete_id || member.id || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.membership_type || "Standard"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getMembershipStatusStyle(
                          member.status
                        )}`}
                      >
                        {member.status || "Active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(member.registration_date) || "N/A"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    No members found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/admin/register"
            className="flex items-center justify-center p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors duration-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 mr-2 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
            <span>Register Member</span>
          </Link>
          <Link
            to="/admin/attendance"
            className="flex items-center justify-center p-4 rounded-lg bg-green-50 hover:bg-green-100 transition-colors duration-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 mr-2 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <span>Attendance Check</span>
          </Link>
          <Link
            to="/admin/trainings"
            className="flex items-center justify-center p-4 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors duration-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 mr-2 text-purple-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>Schedule Training</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
