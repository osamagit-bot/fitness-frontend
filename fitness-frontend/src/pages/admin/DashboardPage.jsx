import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
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
  FiUserCheck,
  FiUsers,
  FiZap
} from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
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
  YAxis,
} from "recharts";
import api from "../../utils/api";
import { formatDate, formatDateTime } from "../../utils/dateUtils";

const DashboardPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeMembers: 0,
    todayCheckIns: 0,
    monthlyRevenue: 0,
    outstandingPayments: 0,
    totalRevenue: 0,
    shopRevenue: 0,
    activeTrainers: 0,
    totalAttendance: 0,
    revenueGrowth: 0,
    memberGrowth: 0,
    monthlyTarget: 50000,
    completionRate: 0,
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
  const [recentActivity, setRecentActivity] = useState([]);

  // Add loading states to prevent duplicate calls
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [memberInsightsLoading, setMemberInsightsLoading] = useState(false);

  // Add ref to track initialization
  const initializingRef = useRef(false);

  // Add a single initialization flag at component level
  const [isInitialized, setIsInitialized] = useState(false);

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
    "from-blue-400 via-sky-500 to-blue-700",
    "from-blue-400 to-blue-500",
    "from-blue-400 to-purple-600",
    "from-yellow-400 to-red-500",
    "from-pink-400 to-purple-600",
    "from-indigo-400 to-purple-600",
    "from-blue-600 to-gray-400",
  ];

  // Add a global initialization state
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeDashboard = async () => {
      if (initializingRef.current) return;
      initializingRef.current = true;
      setIsInitializing(true);

      try {
        // Batch all API calls together
        const [
          statsResponse,
          membersResponse,
          todayAttendanceResponse,
          revenueResponse
        ] = await Promise.allSettled([
          api.get("admin-dashboard/stats/"),
          api.get("members/"),
          api.get("attendance_history/?today_only=true"),
          api.get("admin-dashboard/revenue-trend/")
        ]);

        // Process all data in a single state update to prevent multiple re-renders
        let newStats = { ...stats };
        let membersList = [];

        if (statsResponse.status === 'fulfilled') {
          const backendStats = statsResponse.value.data;
          newStats = {
            ...newStats,
            activeMembers: backendStats.total_members || 0,
            activeTrainers: backendStats.total_trainers || 0,
            monthlyRevenue: parseFloat(backendStats.monthly_revenue) || 0,
            totalRevenue: parseFloat(backendStats.total_revenue) || 0,
            shopRevenue: parseFloat(backendStats.monthly_revenue_shop) || 0,
            outstandingPayments: parseFloat(backendStats.monthly_renewal_revenue) || 0,
          };
        }

        if (todayAttendanceResponse.status === 'fulfilled') {
          newStats.todayCheckIns = todayAttendanceResponse.value.data.length;
        }

        if (membersResponse.status === 'fulfilled') {
          membersList = Array.isArray(membersResponse.value.data) 
            ? membersResponse.value.data 
            : membersResponse.value.data.results || [];
          
         
          if (membersList.length > 0) {
        
          }
        }

        // Single state update to prevent multiple re-renders
        setStats(newStats);
        setRecentMembers(membersList.slice(0, 5));
        console.log('🔍 Recent members set:', membersList.slice(0, 5));
        processMemberInsights(membersList);

        if (revenueResponse.status === 'fulfilled') {
          setRevenueData(revenueResponse.value.data.revenue_trend || []);
        }

        await generateAttendanceTrendOptimized();
        
      } catch (error) {
        console.error("❌ Error initializing dashboard:", error);
        setError("Failed to load dashboard data");
      } finally {
        setIsInitializing(false);
        initializingRef.current = false;
      }
    };

    initializeDashboard();
  }, []); // Run only once

  const generateRevenueData = async () => {
    if (revenueLoading) return; // Prevent duplicate calls
    
    setRevenueLoading(true);
    try {
      const response = await api.get("admin-dashboard/revenue-trend/");
      if (response.data.status === 'success') {
        setRevenueData(response.data.revenue_trend);
      } else {
        throw new Error('Failed to fetch revenue trend');
      }
    } catch (error) {
      console.error("Error fetching revenue trend:", error);
      // Fallback to mock data
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
      const data = months.map((month) => ({
        month,
        revenue: Math.floor(Math.random() * 30000) + 20000,
        target: 45000,
        growth: Math.floor(Math.random() * 20) + 5,
      }));
      setRevenueData(data);
    } finally {
      setRevenueLoading(false);
    }
  };

  const generateMemberInsights = async () => {
    if (memberInsightsLoading || initializingRef.current) return;
    
    setMemberInsightsLoading(true);
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

      // Attendance-based insights - use single API call
      try {
        const attendanceResponse = await api.get(
          "attendance_history/?today_only=true"
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
    } finally {
      setMemberInsightsLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    if (loading || initializingRef.current) return;
    
    setLoading(true);
    try {
      console.log("🔍 Fetching dashboard data...");

      // Fetch stats and purchases for debugging
      const [statsResponse, purchasesResponse] = await Promise.all([
        api.get("admin-dashboard/stats/"),
        api.get("purchases/"),
      ]);

      console.log("🔍 Stats response:", statsResponse.data);
      console.log("🔍 Purchases response:", purchasesResponse.data);

      // Debug purchases data
      const purchases = Array.isArray(purchasesResponse.data)
        ? purchasesResponse.data
        : purchasesResponse.data.results || [];

      console.log("🔍 Total purchases found:", purchases.length);
      console.log("🔍 Sample purchase:", purchases[0]);

      // Calculate shop revenue manually for current month
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      let manualShopRevenue = 0;
      const currentMonthPurchases = purchases.filter((purchase) => {
        const purchaseDate = new Date(purchase.date);
        const isCurrentMonth =
          purchaseDate.getMonth() + 1 === currentMonth &&
          purchaseDate.getFullYear() === currentYear;
        if (isCurrentMonth) {
          console.log("🔍 Current month purchase:", purchase);
          manualShopRevenue += parseFloat(purchase.total_price || 0);
        }
        return isCurrentMonth;
      });

      console.log("🔍 Current month purchases:", currentMonthPurchases.length);
      console.log("🔍 Manual shop revenue calculation:", manualShopRevenue);

      // Fetch today's attendance count
      const todayAttendanceResponse = await api.get(
        "attendance_history/?today_only=true"
      );

      // Parse the revenue values
      const parseRevenue = (value) => {
        if (typeof value === "string") {
          return parseFloat(value.replace(" AFN", "").replace(",", "")) || 0;
        }
        return parseFloat(value) || 0;
      };

      const backendStats = statsResponse.data;
      const backendShopRevenue = parseRevenue(
        backendStats.monthly_revenue_shop
      );

      // Use manual calculation if backend shows 0 but we have purchases
      const finalShopRevenue =
        backendShopRevenue > 0 ? backendShopRevenue : manualShopRevenue;

      setStats((prevStats) => ({
        ...prevStats,
        activeMembers: backendStats.total_members || 0,
        activeTrainers: backendStats.total_trainers || 0,
        todayCheckIns: todayAttendanceResponse.data.length,
        totalAttendance: todayAttendanceResponse.data.length,
        monthlyRevenue: parseRevenue(backendStats.monthly_revenue),
        totalRevenue: parseRevenue(backendStats.total_revenue),
        shopRevenue: finalShopRevenue,
        outstandingPayments: parseRevenue(backendStats.monthly_renewal_revenue),
        memberGrowth: Math.random() * 10 + 5,
        revenueGrowth: Math.random() * 10 + 3,
        completionRate: Math.floor(
          (parseRevenue(backendStats.monthly_revenue) /
            prevStats.monthlyTarget) *
            100
        ),
      }));

      console.log("🔍 Final stats update:", {
        backendShopRevenue,
        manualShopRevenue,
        finalShopRevenue,
        totalPurchases: purchases.length,
        currentMonthPurchases: currentMonthPurchases.length,
      });
    } catch (error) {
      console.error("❌ Error fetching dashboard data:", error);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentMembers = async () => {
    if (initializingRef.current) return;
    
    try {
      const response = await api.get("members/");
      let memberList = Array.isArray(response.data)
        ? response.data.slice(0, 5)
        : response.data.results?.slice(0, 5) || [];

      // Debug: Log the member data structure
      console.log("Member data structure:", memberList[0]);

      setRecentMembers(memberList);
    } catch (error) {
      console.error("Error fetching recent members:", error);
    }
  };

  const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount) || 0;
    return `${numAmount.toFixed(0)} AFN`;
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    trend,
    trendValue,
    color = "blue",
    subtitle,
    gradient,
    isLoading = false,
  }) => (
    <div
      className={`relative overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${
        gradient ? `bg-gradient-to-br ${gradient}` : "bg-white"
      }`}>
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
            {isInitializing ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-300 rounded w-20 mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-16"></div>
              </div>
            ) : (
              <>
                <p className="text-2xl sm:text-3xl font-bold mb-1">
                  {value}
                </p>
                {subtitle && (
                  <p
                    className={`text-xs ${
                      gradient ? "text-white/70" : "text-gray-400"
                    }`}
                  >
                    {subtitle}
                  </p>
                )}
              </>
            )}
          </div>
          <div
            className={`p-3 rounded-full ${
              gradient ? "bg-white/20" : `bg-${color}-100`
            }`}
          >
            <Icon
              className={`h-6 w-6 ${
                gradient ? "text-white" : `text-${color}-600`
              }`}
            />
          </div>
        </div>

        {!isInitializing && trend && (
          <div className="flex items-center mt-4">
            <div
              className={`flex items-center text-sm ${
                trend === "up"
                  ? gradient
                    ? "text-white/90"
                    : "text-green-600"
                  : gradient
                  ? "text-white/90"
                  : "text-gray-600"
              }`}
            >
              <span className="mr-1">
                {trend === "up" ? "↗" : trend === "down" ? "↘" : "→"}
              </span>
              {trendValue}
            </div>
          </div>
        )}
      </div>
    </div>
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

  const generateAttendanceTrendOptimized = async () => {
    try {
      // Get all 7 days in a single API call using date range
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 6);
      const startDateStr = startDate.toISOString().split('T')[0];
      
      const response = await api.get(`attendance_history/?start_date=${startDateStr}&end_date=${endDate}`);
      const allAttendance = response.data || [];
      
      // Group by date
      const attendanceByDate = {};
      allAttendance.forEach(record => {
        const date = record.date;
        attendanceByDate[date] = (attendanceByDate[date] || 0) + 1;
      });
      
      // Generate 7-day trend
      const attendanceData = Array(7).fill(0).map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const dateStr = date.toISOString().split('T')[0];
        const dayAttendance = attendanceByDate[dateStr] || 0;
        
        return {
          day: date.toLocaleDateString("en-US", { weekday: "short" }),
          date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          attendance: dayAttendance,
          capacity: 60,
          percentage: Math.floor((dayAttendance / 60) * 100),
        };
      });
      
      setAttendanceTrend(attendanceData);
    } catch (error) {
      console.error("Error generating attendance trend:", error);
      // Fallback to mock data
      const mockData = Array(7).fill(0).map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          day: date.toLocaleDateString("en-US", { weekday: "short" }),
          date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          attendance: Math.floor(Math.random() * 40) + 15,
          capacity: 60,
          percentage: Math.floor(Math.random() * 30) + 60,
        };
      });
      setAttendanceTrend(mockData);
    }
  };

  // Helper function to process member insights
  const processMemberInsights = (membersList) => {
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
  };

  return (
    <div className="bg-gradient-to-br from-gray-150 via-blue-50 to-indigo-50 -m-6 min-h-screen">
      {/* Header section with title and refresh */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
            >
              ⚡ Elite Fitness Dashboard
            </motion.h1>
            <p className="text-gray-600 mt-1 text-vsm sm:text-base">
              Real-time insights and analytics • Last updated:{" "}
              {formatDateTime(lastUpdate)}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Refresh Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={async () => {
                if (isInitializing || initializingRef.current) return;
                
                initializingRef.current = true;
                setIsInitializing(true);
                try {
                  await fetchDashboardData();
                  await fetchRecentMembers();
                  await generateMemberInsights();
                  await generateRevenueData();
                  await generateAttendanceTrendOptimized();
                  setLastUpdate(new Date());
                } finally {
                  setIsInitializing(false);
                  initializingRef.current = false;
                }
              }}
              disabled={isInitializing}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 text-sm sm:text-base"
            >
              <FiRefreshCw
                className={`h-4 w-4 ${isInitializing ? "animate-spin" : ""}`}
              />
              {isInitializing ? "Loading..." : "Refresh"}
            </motion.button>
          </div>
        </div>
      </div>

      <div className="px-6">
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
        <div className="grid grid-cols-1 p-5  sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            icon={FiDollarSign}
            trend="up"
            trendValue={`${(stats.revenueGrowth || 0).toFixed(1)}%`}
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
            value={stats.activeMembers || 0}
            icon={FiUsers}
            trend="up"
            trendValue={`${(stats.memberGrowth || 0).toFixed(1)}%`}
            isLoading={loading}
            color="green"
            subtitle="Total registered"
            gradient={GRADIENT_COLORS[6]}
            
          />

          <StatCard
            title="Active Trainers"
            value={stats.activeTrainers || 0}
            icon={FiUserCheck}
            trend="stable"
            trendValue="0%"
            isLoading={loading}
            color="blue"
            subtitle="Available staff"
          />

          <StatCard
            title="Today's Check-ins"
            value={stats.todayCheckIns || 0}
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
            className="bg-gradient-to-br from-blue-400 to-blue-800 rounded-2xl shadow-lg p-6 text-white"
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
                {isInitializing ? (
                  // Loading skeleton
                  Array(5).fill(0).map((_, index) => (
                    <tr key={index} className="animate-pulse">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-gray-300 rounded-full"></div>
                          <div className="ml-4">
                            <div className="h-4 bg-gray-300 rounded w-24"></div>
                            <div className="h-3 bg-gray-300 rounded w-32 mt-1"></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-300 rounded w-16"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-300 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-6 bg-gray-300 rounded-full w-16"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-300 rounded w-20"></div>
                      </td>
                    </tr>
                  ))
                ) : recentMembers.length > 0 ? (
                  recentMembers.map((member, index) => {
                    const isExpired = member.expiry_date && new Date(member.expiry_date) < new Date();
                    const memberName = member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim();
                    
                    return (
                      <motion.tr
                        key={member.athlete_id || member.id || index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {memberName.charAt(0).toUpperCase() || 'M'}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {memberName || 'Unknown Member'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {member.email || member.user_email || 'No email'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {member.athlete_id || member.id || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                            {member.membership_type || 'Standard'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isExpired 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {isExpired ? 'Expired' : 'Active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {member.start_date 
                            ? formatDate(member.start_date)
                            : member.created_at 
                            ? formatDate(member.created_at)
                            : 'N/A'
                          }
                        </td>
                      </motion.tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center">
                      <div className="text-gray-500">
                        <FiUsers className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-sm font-medium text-gray-900 mb-1">No recent members</h3>
                        <p className="text-sm text-gray-500">No members have been registered recently.</p>
                      </div>
                    </td>
                  </tr>
                )}
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
                to: "/admin/adminsettings",
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
};

export default DashboardPage;





























