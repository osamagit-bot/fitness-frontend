import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  FiActivity,
  FiAward,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiEye,
  FiPlus,
  FiRefreshCw,
  FiSettings,
  FiShoppingCart,
  FiTarget,
  FiTrendingUp,
  FiUserCheck,
  FiUsers,
  FiZap
} from "react-icons/fi";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Line,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import api from "../../utils/api";
import { formatDate, formatDateTime } from "../../utils/dateUtils";

function EnhancedDashboardPage() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeMembers: 0,
    activeTrainers: 0,
    upcomingTrainings: 0,
    presentMembers: 0,
    totalAttendance: 0,
    revenueGrowth: 5.2,
    memberGrowth: 8.5,
    shopRevenue: 0,
    monthlyTarget: 50000,
    completionRate: 75,
    averageSessionTime: 85,
    memberRetention: 92,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [recentMembers, setRecentMembers] = useState([]);
  const [membershipStats, setMembershipStats] = useState([]);
  const [genderDistribution, setGenderDistribution] = useState([]);
  const [attendanceTrend, setAttendanceTrend] = useState([]);
  const [memberFrequency, setMemberFrequency] = useState([]);
  const [topActiveMembers, setTopActiveMembers] = useState([]);
  const [revenueData, setRevenueData] = useState([]);


  // Enhanced color schemes
  const CHART_COLORS = {
    primary: ["#667eea", "#764ba2", "#f093fb", "#f5576c", "#4facfe", "#00f2fe"],
    gradient: ["#ff9a9e", "#fecfef", "#fecfef", "#667eea", "#764ba2"],
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#3b82f6",
  };

  const GRADIENT_COLORS = [
    "from-purple-400 via-pink-500 to-red-500",
    "from-green-400 to-blue-500",
    "from-blue-400 to-purple-600",
    "from-yellow-400 to-red-500",
    "from-pink-400 to-purple-600",
    "from-indigo-400 to-purple-600",
  ];

  useEffect(() => {
    fetchStats();
    fetchRecentMembers();
    generateMemberInsights();
    generateRevenueData();

    // Set up auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchStats();
      setLastUpdate(new Date());
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const generateRevenueData = () => {
    // Generate last 6 months revenue data
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const data = months.map((month, index) => ({
      month,
      revenue: Math.floor(Math.random() * 30000) + 20000,
      target: 45000,
      growth: Math.floor(Math.random() * 20) + 5,
    }));
    setRevenueData(data);
  };



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
        const type = member.membership_type || "Standard";
        membershipTypes[type] = (membershipTypes[type] || 0) + 1;
      });
      setMembershipStats(
        Object.keys(membershipTypes).map((type, index) => ({
          name: type,
          value: membershipTypes[type],
          fill: CHART_COLORS.primary[index % CHART_COLORS.primary.length],
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
        Object.keys(genderCount).map((gender, index) => ({
          name: gender,
          value: genderCount[gender],
          fill: CHART_COLORS.gradient[index % CHART_COLORS.gradient.length],
        }))
      );

      // Enhanced attendance trend (last 7 days)
      const last7Days = Array(7)
        .fill(0)
        .map((_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return {
            day: date.toLocaleDateString("en-US", { weekday: "short" }),
            date: date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            attendance: Math.floor(Math.random() * 40) + 15,
            capacity: 60,
            percentage: Math.floor(Math.random() * 30) + 60,
          };
        });
      setAttendanceTrend(last7Days);

      // Attendance-based insights
      try {
        const attendanceResponse = await api.get(
          "attendance/history/?today_only=true"
        );
        const memberAttendanceCounts = {};

        if (Array.isArray(attendanceResponse.data)) {
          attendanceResponse.data.forEach((record) => {
            const memberId = record.member_id || record.athlete_id;
            if (!memberId) return;
            memberAttendanceCounts[memberId] =
              (memberAttendanceCounts[memberId] || 0) + 1;
          });

          // Top active members with enhanced data
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
                trend: Math.random() > 0.5 ? "up" : "down",
                membershipType: member?.membership_type || "Standard",
                avatar: member?.first_name?.[0] + member?.last_name?.[0] || "M",
              };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
          setTopActiveMembers(memberAttendanceArray);
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
      // Fetch all required data
      const [
        membersResponse,
        purchasesResponse,
        paymentsResponse,
        trainersResponse,
      ] = await Promise.all([
        api.get("members/"),
        api.get("purchases/"),
        api.get("members/payments_summary/"),
        api.get("trainers/"),
      ]);

      // Process shop revenue
      let shopRevenueTotal = 0;
      let purchasesList = Array.isArray(purchasesResponse.data)
        ? purchasesResponse.data
        : purchasesResponse.data.results || [];

      purchasesList.forEach((purchase) => {
        if (purchase?.total_price) {
          const price = parseFloat(purchase.total_price);
          if (!isNaN(price)) shopRevenueTotal += price;
        }
      });

      // Process members
      let membersList = Array.isArray(membersResponse.data)
        ? membersResponse.data
        : membersResponse.data.results || [];
      const activeMembersList = membersList.filter(
        (m) => m.is_active !== false
      );
      const membersCount = activeMembersList.length;

      // Process trainers
      let trainersList = Array.isArray(trainersResponse.data)
        ? trainersResponse.data
        : trainersResponse.data.results || [];
      const trainersCount = trainersList.length;

      // Process revenue
      const totalRevenue = paymentsResponse.data.monthly_payments || 0;

      // Enhanced stats with calculated metrics
      setStats((prev) => ({
        ...prev,
        totalRevenue,
        activeMembers: membersCount,
        activeTrainers: trainersCount,
        shopRevenue: shopRevenueTotal,
        memberGrowth: Math.random() * 10 + 5, // Mock growth rate
        completionRate: Math.floor((totalRevenue / prev.monthlyTarget) * 100),
        memberRetention: Math.floor(Math.random() * 10) + 90,
        averageSessionTime: Math.floor(Math.random() * 30) + 70,
      }));

      setError(null);
    } catch (error) {
      console.error("Error fetching stats:", error);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentMembers = async () => {
    try {
      const response = await api.get("members/");
      let memberList = Array.isArray(response.data)
        ? response.data.slice(0, 5)
        : response.data.results?.slice(0, 5) || [];
      setRecentMembers(memberList);
    } catch (error) {
      console.error("Error fetching recent members:", error);
    }
  };

  const formatCurrency = (amount) => `${parseFloat(amount).toFixed(0)} AFN`;

  const StatCard = ({
    title,
    value,
    icon: Icon,
    trend,
    trendValue,
    color = "blue",
    isLoading,
    subtitle,
    gradient,
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`relative overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${
        gradient ? `bg-gradient-to-br ${gradient}` : "bg-white"
      }`}
    >
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className={`${gradient ? "text-white" : "text-gray-900"}`}>
            <p
              className={`text-sm font-medium ${
                gradient ? "text-white/80" : "text-gray-500"
              } uppercase tracking-wide mb-1`}
            >
              {title}
            </p>
            {isLoading ? (
              <div className="animate-pulse">
                <div
                  className={`h-8 ${
                    gradient ? "bg-white/20" : "bg-gray-200"
                  } rounded w-24 mb-2`}
                ></div>
                <div
                  className={`h-4 ${
                    gradient ? "bg-white/20" : "bg-gray-200"
                  } rounded w-16`}
                ></div>
              </div>
            ) : (
              <>
                <p className="text-2xl sm:text-3xl font-bold mb-1">{value}</p>
                {subtitle && (
                  <p
                    className={`text-sm ${
                      gradient ? "text-white/70" : "text-gray-500"
                    }`}
                  >
                    {subtitle}
                  </p>
                )}
                {trend && (
                  <div className="flex items-center mt-2">
                    <span
                      className={`text-sm font-medium flex items-center ${
                        trend === "up"
                          ? "text-green-400"
                          : trend === "down"
                          ? "text-red-400"
                          : "text-blue-400"
                      }`}
                    >
                      {trend === "up" ? (
                        <FiTrendingUp className="w-4 h-4 mr-1" />
                      ) : trend === "down" ? (
                        <FiTrendingUp className="w-4 h-4 mr-1 rotate-180" />
                      ) : (
                        <FiActivity className="w-4 h-4 mr-1" />
                      )}
                      {trendValue}
                    </span>
                    <span
                      className={`text-sm ml-1 ${
                        gradient ? "text-white/70" : "text-gray-400"
                      }`}
                    >
                      vs last month
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
          <div
            className={`p-2 sm:p-3 rounded-xl ${
              gradient ? "bg-white/20" : `bg-${color}-50`
            }`}
          >
            <Icon
              className={`h-6 w-6 sm:h-8 sm:w-8 ${
                gradient ? "text-white" : `text-${color}-500`
              }`}
            />
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full"></div>
      <div className="absolute -right-2 -bottom-2 w-8 h-8 bg-white/10 rounded-full"></div>
    </motion.div>
  );

  const ProgressRing = ({
    percentage,
    size = 120,
    strokeWidth = 8,
    color = "#3b82f6",
  }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">
            {percentage}%
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 -m-6 min-h-screen">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
              >
                ⚡ Elite Fitness Dashboard
              </motion.h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">
                Real-time insights and analytics • Last updated:{" "}
                {formatDateTime(lastUpdate)}
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Refresh Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  fetchStats();
                  fetchRecentMembers();
                  generateMemberInsights();
                  setLastUpdate(new Date());
                }}
                disabled={loading}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 text-sm sm:text-base"
              >
                <FiRefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                {loading ? "Refreshing..." : "Refresh"}
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl"
            >
              <div className="flex items-center">
                <div className="h-5 w-5 text-red-500 mr-2">⚠️</div>
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            icon={FiDollarSign}
            trend="up"
            trendValue={`${stats.revenueGrowth}%`}
            isLoading={loading}
            gradient={GRADIENT_COLORS[0]}
          />

          <StatCard
            title="Shop Revenue"
            value={formatCurrency(stats.shopRevenue)}
            icon={FiShoppingCart}
            trend="up"
            trendValue="12.3%"
            isLoading={loading}
            gradient={GRADIENT_COLORS[1]}
          />

          <StatCard
            title="Active Members"
            value={stats.activeMembers}
            icon={FiUsers}
            trend="up"
            trendValue={`${stats.memberGrowth.toFixed(1)}%`}
            isLoading={loading}
            color="green"
            subtitle="Total registered"
          />

          <StatCard
            title="Active Trainers"
            value={stats.activeTrainers}
            icon={FiUserCheck}
            trend="stable"
            trendValue="0%"
            isLoading={loading}
            color="blue"
            subtitle="Available staff"
          />

          <StatCard
            title="Present Now"
            value={stats.presentMembers}
            icon={FiActivity}
            trend="up"
            trendValue="5.2%"
            isLoading={loading}
            gradient={GRADIENT_COLORS[2]}
          />

          <StatCard
            title="Today's Check-ins"
            value={stats.totalAttendance}
            icon={FiCheckCircle}
            trend="up"
            trendValue="8.1%"
            isLoading={loading}
            color="yellow"
            subtitle="Total attendance"
          />
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Monthly Target
              </h3>
              <FiTarget className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex items-center justify-center">
              <ProgressRing percentage={stats.completionRate} color="#3b82f6" />
            </div>
            <p className="text-center text-sm text-gray-600 mt-3">
              {formatCurrency(stats.totalRevenue)} of{" "}
              {formatCurrency(stats.monthlyTarget)}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Retention Rate
              </h3>
              <FiAward className="h-5 w-5 text-green-500" />
            </div>
            <div className="flex items-center justify-center">
              <ProgressRing
                percentage={stats.memberRetention}
                color="#10b981"
              />
            </div>
            <p className="text-center text-sm text-gray-600 mt-3">
              Excellent retention
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Avg. Session
              </h3>
              <FiClock className="h-5 w-5 text-purple-500" />
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {stats.averageSessionTime}min
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all duration-1000"
                  style={{
                    width: `${(stats.averageSessionTime / 120) * 100}%`,
                  }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Optimal range: 60-90min
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl shadow-lg p-6 text-white"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Peak Hours</h3>
              <FiZap className="h-5 w-5" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold mb-1">6-8 PM</div>
              <div className="text-sm opacity-90 mb-3">Busiest time</div>
              <div className="flex justify-center space-x-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-2 bg-white/50 rounded-full animate-pulse"
                    style={{
                      height: `${Math.random() * 20 + 10}px`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  ></div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-8">
          {/* Revenue Trend */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Revenue Trend</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                Revenue
                <div className="w-3 h-3 bg-gray-300 rounded-full ml-2"></div>
                Target
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient
                      id="revenueGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop
                        offset="95%"
                        stopColor="#3b82f6"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [
                      `${formatCurrency(value)}`,
                      name,
                    ]}
                    labelStyle={{ color: "#374151" }}
                    contentStyle={{
                      backgroundColor: "#f9fafb",
                      border: "none",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#revenueGradient)"
                    strokeWidth={3}
                  />
                  <Line
                    type="monotone"
                    dataKey="target"
                    stroke="#d1d5db"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Attendance Trend */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                Weekly Attendance
              </h3>
              <div className="text-sm text-green-600 font-medium">
                ↗ +12% vs last week
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceTrend}>
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [`${value} members`, name]}
                    labelFormatter={(label, payload) =>
                      payload[0]
                        ? `${label} (${payload[0].payload.date})`
                        : label
                    }
                    contentStyle={{
                      backgroundColor: "#f9fafb",
                      border: "none",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Bar
                    dataKey="attendance"
                    fill="url(#attendanceGradient)"
                    radius={[4, 4, 0, 0]}
                  />
                  <defs>
                    <linearGradient
                      id="attendanceGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop
                        offset="95%"
                        stopColor="#10b981"
                        stopOpacity={0.4}
                      />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Membership Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h3 className="text-xl font-bold text-gray-800 mb-6">
              Membership Types
            </h3>
            {membershipStats.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={membershipStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {membershipStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value} members`, "Count"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}

            {/* Legend */}
            <div className="mt-4 space-y-2">
              {membershipStats.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: item.fill }}
                    ></div>
                    <span className="text-sm text-gray-600">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h3 className="text-xl font-bold text-gray-800 mb-6">
              Gender Distribution
            </h3>
            {genderDistribution.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="20%"
                    outerRadius="80%"
                    data={genderDistribution}
                  >
                    <RadialBar
                      dataKey="value"
                      cornerRadius={10}
                      fill="#8884d8"
                    />
                    <Tooltip />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}

            {/* Stats */}
            <div className="mt-4 grid grid-cols-3 gap-4">
              {genderDistribution.map((item, index) => (
                <div key={index} className="text-center">
                  <div className="text-lg font-bold text-gray-900">
                    {item.value}
                  </div>
                  <div className="text-sm text-gray-500">{item.name}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h3 className="text-xl font-bold text-gray-800 mb-6">
              Top Active Members
            </h3>
            <div className="space-y-4">
              {loading
                ? [...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center animate-pulse">
                      <div className="w-10 h-10 bg-gray-200 rounded-full mr-3"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))
                : topActiveMembers.map((member, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                          {member.avatar}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {member.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {member.membershipType}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">
                          {member.count}
                        </div>
                        <div className="text-xs text-gray-500">check-ins</div>
                      </div>
                    </motion.div>
                  ))}
            </div>
          </motion.div>
        </div>

        {/* Recent Members Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8"
        >
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">
                Recent Registrations
              </h3>
              <Link
                to="/admin/members"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
              >
                View All
                <FiEye className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
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
                {loading
                  ? [...Array(3)].map((_, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center animate-pulse">
                            <div className="h-10 w-10 rounded-full bg-gray-200 mr-4"></div>
                            <div>
                              <div className="h-4 w-24 bg-gray-200 rounded mb-1"></div>
                              <div className="h-3 w-16 bg-gray-200 rounded"></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 w-12 bg-gray-200 rounded animate-pulse"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                        </td>
                      </tr>
                    ))
                  : recentMembers.map((member, index) => (
                      <motion.tr
                        key={member.id || index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          #{member.athlete_id || member.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {member.membership_type || "Standard"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(member.registration_date) || "Recent"}
                        </td>
                      </motion.tr>
                    ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h3 className="text-xl font-bold text-gray-800 mb-6">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                to: "/admin/register",
                icon: FiPlus,
                label: "Add Member",
                color: "blue",
              },
              {
                to: "/admin/attendance",
                icon: FiCheckCircle,
                label: "Check Attendance",
                color: "green",
              },
              {
                to: "/admin/trainings",
                icon: FiCalendar,
                label: "Schedule Training",
                color: "purple",
              },
              {
                to: "/admin/settings",
                icon: FiSettings,
                label: "Settings",
                color: "gray",
              },
            ].map((action, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  to={action.to}
                  className={`flex items-center justify-center p-4 rounded-xl bg-${action.color}-50 hover:bg-${action.color}-100 transition-colors duration-200 group`}
                >
                  <action.icon
                    className={`h-6 w-6 mr-3 text-${action.color}-600`}
                  />
                  <span
                    className={`font-medium text-${action.color}-700 group-hover:text-${action.color}-800`}
                  >
                    {action.label}
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default EnhancedDashboardPage;
