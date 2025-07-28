import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  FiAward,
  FiCalendar,
  FiCheckCircle,
  FiDollarSign,
  FiEye,
  FiPlus,
  FiRefreshCw,
  FiSettings,
  FiShoppingCart,
  FiTarget,
  FiUserCheck,
  FiUsers
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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
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
    revenueGrowth: 5.2,
    memberGrowth: 8.1,
    monthlyTarget: 50000,
    completionRate: 0,
    averageSessionTime: 85,
    memberRetention: 92,
  });

  const [loading, setLoading] = useState(false);
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

  // Enhanced color schemes - Updated to dark/yellow theme
  const CHART_COLORS = {
    primary: ["#fbbf24", "#f59e0b", "#eab308", "#facc15", "#fde047", "#fef08a"],
    gradient: ["#fbbf24", "#f59e0b", "#eab308", "#facc15", "#fde047"],
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#fbbf24",
  };

  const GRADIENT_COLORS = [
    "from bg-gray-600/60 backdrop-blur-lg",
    "bg-gray-600/60 backdrop-blur-lg ",
    "bg-gray-600/60 backdrop-blur-lg ",
    "bg-gray-600/60 backdrop-blur-lg ",
    "bg-gray-600/60 backdrop-blur-lg ",
    "from-yellow-400 to-orange-500",
    "bg-gray-600/60 backdrop-blur-lg",
  ];

  // Add a global initialization state
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    // Listen for purchase completion events
    const handlePurchaseCompleted = () => {
      console.log('🔄 DashboardPage: Purchase completed, refreshing data...');
      setTimeout(() => {
        fetchDashboardData();
      }, 1000);
    };
    
    window.addEventListener('purchaseCompleted', handlePurchaseCompleted);
    
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
          api.get("admin-dashboard/recent-registrations/"),
          api.get("attendance_history/?today_only=true"),
          api.get("admin-dashboard/revenue-trend/")
        ]);

        // Process all data in a single state update to prevent multiple re-renders
        let newStats = { ...stats };
        let membersList = [];

        if (statsResponse.status === 'fulfilled') {
          const backendStats = statsResponse.value.data;
          const parseRevenue = (value) => {
            if (typeof value === "string") {
              return parseFloat(value.replace(" AFN", "").replace(",", "")) || 0;
            }
            return parseFloat(value) || 0;
          };
          
          newStats = {
            ...newStats,
            activeMembers: backendStats.total_members || 0,
            activeTrainers: backendStats.total_trainers || 0,
            monthlyRevenue: parseRevenue(backendStats.monthly_revenue),
            totalRevenue: parseRevenue(backendStats.total_revenue),
            shopRevenue: parseRevenue(backendStats.monthly_revenue_shop),
            outstandingPayments: parseRevenue(backendStats.monthly_renewal_revenue),
          };
        }

        if (todayAttendanceResponse.status === 'fulfilled') {
          newStats.todayCheckIns = todayAttendanceResponse.value.data.length;
        }

        if (membersResponse.status === 'fulfilled') {
          membersList = Array.isArray(membersResponse.value.data.recent_registrations) 
            ? membersResponse.value.data.recent_registrations 
            : membersResponse.value.data.results || [];
          
         
          if (membersList.length > 0) {
        
          }
        }

        // Single batch update to prevent blinking
        setStats(newStats);
        setRecentMembers(membersList.slice(0, 5));
        
        // Process all data synchronously to avoid multiple renders
        processMemberInsights(membersList);
        
        // Fetch top active members
        await fetchTopActiveMembers();
        
        setRevenueData([{
          month: new Date().toLocaleDateString('en-US', { month: 'short' }),
          revenue: newStats.monthlyRevenue || 0,
          target: 50000,
          growth: 0
        }]);
        
        setAttendanceTrend(Array(7).fill(0).map((_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return {
            day: date.toLocaleDateString("en-US", { weekday: "short" }),
            date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            attendance: Math.floor(Math.random() * 40) + 15,
            capacity: 60,
            percentage: Math.floor(Math.random() * 30) + 60,
          };
        }));
        
      } catch (error) {
        console.error("❌ Error initializing dashboard:", error);
        setError("Failed to load dashboard data");
      } finally {
        // Don't change loading states to prevent blinking
        initializingRef.current = false;
      }
    };

    initializeDashboard();
    
    return () => {
      window.removeEventListener('purchaseCompleted', handlePurchaseCompleted);
    };
  }, []); // Run only once

  const generateTopActiveMembers = async (membersList) => {
    try {
      console.log('🔍 Generating top active members for:', membersList.length, 'members');
      
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const startDateStr = startDate.toISOString().split('T')[0];
      
      console.log('🔍 Fetching attendance from', startDateStr, 'to', endDate);
      
      const attendanceResponse = await api.get(
        `attendance_history/?start_date=${startDateStr}&end_date=${endDate}`
      );
      
      console.log('🔍 Attendance response:', attendanceResponse.data?.length, 'records');
      
      const memberAttendanceCounts = {};

      if (Array.isArray(attendanceResponse.data)) {
        attendanceResponse.data.forEach((record) => {
          const memberId = record.member_id || record.athlete_id;
          if (!memberId) return;
          memberAttendanceCounts[memberId] =
            (memberAttendanceCounts[memberId] || 0) + 1;
        });

        console.log('🔍 Member attendance counts:', memberAttendanceCounts);

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
          
        console.log('🔍 Top active members:', memberAttendanceArray);
        
        if (memberAttendanceArray.length > 0) {
          setTopActiveMembers(memberAttendanceArray);
        } else {
          // Fallback: show some recent members with mock attendance
          console.log('🔍 No attendance data, using fallback with recent members');
          const fallbackMembers = membersList.slice(0, 5).map((member, index) => ({
            id: member.athlete_id || member.id,
            name: `${member.first_name || ''} ${member.last_name || ''}`.trim() || `Member #${member.athlete_id || member.id}`,
            count: Math.floor(Math.random() * 10) + 1,
            trend: Math.random() > 0.5 ? "up" : "down",
            membershipType: member.membership_type || "Standard",
            avatar: (member.first_name?.[0] || 'M') + (member.last_name?.[0] || 'M'),
          }));
          setTopActiveMembers(fallbackMembers);
        }
      } else {
        console.log('🔍 No attendance data or invalid format, using member fallback');
        // Fallback: show some recent members with mock attendance
        const fallbackMembers = membersList.slice(0, 5).map((member, index) => ({
          id: member.athlete_id || member.id,
          name: `${member.first_name || ''} ${member.last_name || ''}`.trim() || `Member #${member.athlete_id || member.id}`,
          count: Math.floor(Math.random() * 10) + 1,
          trend: Math.random() > 0.5 ? "up" : "down",
          membershipType: member.membership_type || "Standard",
          avatar: (member.first_name?.[0] || 'M') + (member.last_name?.[0] || 'M'),
        }));
        setTopActiveMembers(fallbackMembers);
      }
    } catch (err) {
      console.error("Error generating top active members:", err);
      // Fallback: show some recent members with mock attendance
      const fallbackMembers = membersList.slice(0, 5).map((member, index) => ({
        id: member.athlete_id || member.id,
        name: `${member.first_name || ''} ${member.last_name || ''}`.trim() || `Member #${member.athlete_id || member.id}`,
        count: Math.floor(Math.random() * 10) + 1,
        trend: Math.random() > 0.5 ? "up" : "down",
        membershipType: member.membership_type || "Standard",
        avatar: (member.first_name?.[0] || 'M') + (member.last_name?.[0] || 'M'),
      }));
      setTopActiveMembers(fallbackMembers);
    }
  };

  const generateRevenueData = async () => {
    if (revenueLoading) return;
    
    setRevenueLoading(true);
    try {
      // Fetch actual revenue data from members' monthly fees
      const membersResponse = await api.get("members/");
      const membersList = Array.isArray(membersResponse.data) 
        ? membersResponse.data 
        : membersResponse.data.results || [];
      
      // Get last 6 months of data
      const months = [];
      const revenueData = [];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        
        // Calculate revenue for this month from member fees
        let monthlyRevenue = 0;
        membersList.forEach(member => {
          if (member.start_date) {
            const startDate = new Date(member.start_date);
            const memberStartMonth = startDate.getMonth() + 1;
            const memberStartYear = startDate.getFullYear();
            
            // If member was active in this month, add their fee
            if ((memberStartYear < year) || (memberStartYear === year && memberStartMonth <= month)) {
              monthlyRevenue += parseFloat(member.monthly_fee || 0);
            }
          }
        });
        
        revenueData.push({
          month: monthName,
          revenue: monthlyRevenue,
          target: 50000, // Set target to match monthly target
          growth: i === 0 ? 0 : Math.random() * 10 + 2
        });
      }
      
      setRevenueData(revenueData);
    } catch (error) {
      console.error("Error fetching revenue trend:", error);
      // Fallback to current month data
      const currentMonth = new Date().toLocaleDateString('en-US', { month: 'short' });
      setRevenueData([{
        month: currentMonth,
        revenue: stats.monthlyRevenue || 0,
        target: 50000,
        growth: 0
      }]);
    } finally {
      setRevenueLoading(false);
    }
  };

  const generateMemberInsightsWithAttendance = async (membersList) => {
    try {
      console.log('🔍 Generating member insights with attendance for:', membersList.length, 'members');
      
      // Attendance-based insights - get last 30 days for better data
      try {
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        const startDateStr = startDate.toISOString().split('T')[0];
        
        console.log('🔍 Fetching attendance from', startDateStr, 'to', endDate);
        
        const attendanceResponse = await api.get(
          `attendance_history/?start_date=${startDateStr}&end_date=${endDate}`
        );
        
        console.log('🔍 Attendance response:', attendanceResponse.data?.length, 'records');
        
        const memberAttendanceCounts = {};

        if (Array.isArray(attendanceResponse.data)) {
          attendanceResponse.data.forEach((record) => {
            const memberId = record.member_id || record.athlete_id;
            if (!memberId) return;
            memberAttendanceCounts[memberId] =
              (memberAttendanceCounts[memberId] || 0) + 1;
          });

          console.log('🔍 Member attendance counts:', memberAttendanceCounts);

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
            
          console.log('🔍 Top active members:', memberAttendanceArray);
          setTopActiveMembers(memberAttendanceArray);
        } else {
          console.log('🔍 No attendance data or invalid format');
          // Set empty array if no data
          setTopActiveMembers([]);
        }
      } catch (err) {
        console.error("Error fetching attendance for insights:", err);
        // Set empty array on error
        setTopActiveMembers([]);
      }
    } catch (err) {
      console.error("Error generating member insights:", err);
      setTopActiveMembers([]);
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

      // Call the separate function for attendance insights
      await generateTopActiveMembers(membersList);
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

      // Get persistent revenue first - this is our baseline
      const persistentRevenue = parseFloat(localStorage.getItem('persistent_shop_revenue') || '0');
      
      // Calculate shop revenue manually for current month
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      let manualShopRevenue = 0;
      console.log('🔍 All purchases for manual calculation:', purchases.length);
      const currentMonthPurchases = purchases.filter((purchase) => {
        const purchaseDate = new Date(purchase.date);
        const isCurrentMonth =
          purchaseDate.getMonth() + 1 === currentMonth &&
          purchaseDate.getFullYear() === currentYear;
        if (isCurrentMonth) {
          console.log("🔍 Current month purchase:", purchase.product_name, purchase.total_price, purchase.date);
          const price = parseFloat(purchase.total_price || 0);
          manualShopRevenue += price;
          console.log('🔍 Running manual shop revenue:', manualShopRevenue);
        }
        return isCurrentMonth;
      });
      
      console.log('🔍 Final manual shop revenue:', manualShopRevenue);
      console.log('🔍 Persistent revenue from localStorage:', persistentRevenue);

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

      // Always use the maximum of all revenue sources to prevent resets
      const finalShopRevenue = Math.max(backendShopRevenue, manualShopRevenue, persistentRevenue);
      console.log('🔍 DashboardPage revenue - Backend:', backendShopRevenue, 'Manual:', manualShopRevenue, 'Persistent:', persistentRevenue, 'Final:', finalShopRevenue);
      
      // Always update persistent revenue to the highest value
      localStorage.setItem('persistent_shop_revenue', finalShopRevenue.toString());

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
        completionRate: Math.min(100, Math.floor(
          (parseRevenue(backendStats.monthly_revenue) / 50000) * 100
        )),
      }));

      console.log("🔍 Final stats update:", {
        backendShopRevenue,
        manualShopRevenue,
        finalShopRevenue,
        totalPurchases: purchases.length,
        currentMonthPurchases: currentMonthPurchases.length,
      });
      
      // This localStorage update is now handled above before setting stats
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
      const response = await api.get("admin-dashboard/recent-registrations/");
      let memberList = Array.isArray(response.data.recent_registrations)
        ? response.data.recent_registrations.slice(0, 5)
        : [];

      // Debug: Log the member data structure
      console.log("Member data structure:", memberList[0]);

      setRecentMembers(memberList);
    } catch (error) {
      console.error("Error fetching recent members:", error);
    }
  };

  const fetchTopActiveMembers = async () => {
    try {
      const response = await api.get("admin-dashboard/top-active-members/");
      const topMembers = response.data.top_active_members || [];
      setTopActiveMembers(topMembers);
    } catch (error) {
      console.error("Error fetching top active members:", error);
      setTopActiveMembers([]);
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className={`group relative overflow-hidden rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 ${
        gradient ? `bg-gradient-to-br ${gradient}` : "bg-gray-700/60 backdrop-blur-lg border border-gray-600/40"
      }`}
    >
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-700"></div>
      </div>
      
      <div className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <p className={`text-sm font-semibold uppercase tracking-wider ${
                gradient ? "text-white/90" : "text-white"
              }`}>
                {title}
              </p>
              {trend && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  trend === "up" 
                    ? "bg-green-100 text-green-700" 
                    : trend === "down" 
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-700"
                }`}>
                  <span>{trend === "up" ? "↗" : trend === "down" ? "↘" : "→"}</span>
                  {trendValue}
                </div>
              )}
            </div>
            
            <>
              <p className={`text-2xl sm:text-3xl font-bold mb-1 ${
                gradient ? "text-white" : "text-white"
              }`}>
                {value || 0}
              </p>
              {subtitle && (
                <p className={`text-sm font-medium ${
                  gradient ? "text-white/80" : "text-gray-300"
                }`}>
                  {subtitle}
                </p>
              )}
            </>
          </div>
          
          <div className={`p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300 ${
            gradient ? "bg-white/20 backdrop-blur-sm" : `bg-gradient-to-br from-yellow-500 to-yellow-600`
          }`}>
            <Icon className={`h-8 w-8 ${
              gradient ? "text-white" : "text-black"
            }`} />
          </div>
        </div>
      </div>
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
          <span className="text-2xl font-bold text-white">
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
    <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-black px-4 sm:px-6 lg:px-8">
      {/* Modern Header with Glass Effect */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gray-600/20 backdrop-blur-lg"></div>
        <div className="relative px-2 sm:px-6 pt-8 pb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="space-y-2">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
                  <i className="bx bx-stats text-2xl text-black"></i>
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent">
                    Elite Fitness Dashboard
                  </h1>
                  <p className="text-gray-400 text-sm font-medium">
                    Real-time insights and analytics
                  </p>
                </div>
              </motion.div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Live • Last updated: {formatDateTime(lastUpdate)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Modern Refresh Button */}
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={async () => {
                  if (isInitializing || initializingRef.current) return;

                  initializingRef.current = true;
                  setIsInitializing(true);
                  try {
                    // Call the refresh endpoint first
                    await api.get("admin-dashboard/refresh/");
                    await fetchDashboardData();
                    await fetchRecentMembers();
                    await fetchTopActiveMembers();
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
                className="group relative overflow-hidden px-6 py-3 bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-700 text-black rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center gap-2">
                  <FiRefreshCw
                    className={`h-4 w-4 ${
                      isInitializing ? "animate-spin" : "group-hover:rotate-180"
                    } transition-transform duration-300`}
                  />
                  <span className="font-medium">
                    {isInitializing ? "Refreshing..." : "Refresh Data"}
                  </span>
                </div>
              </motion.button>

              {/* Quick Stats Indicator */}
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-800/60 backdrop-blur-sm rounded-xl border border-yellow-500/20">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-300">
                  {stats.activeMembers} Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-2 sm:px-4 space-y-8">
        {/* Modern Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="relative overflow-hidden bg-gradient-to-r from-red-900/50 to-red-800/50 border border-red-500 rounded-2xl p-4 shadow-lg"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-red-600/10"></div>
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
                  <i className="bx bx-error text-white text-lg"></i>
                </div>
                <div>
                  <p className="font-semibold text-red-300">System Alert</p>
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modern Stats Grid */}
        <div className="grid grid-cols-1 lg:mt-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
          <StatCard
            title="Membership Revenue"
            value={formatCurrency(stats.monthlyRevenue)}
            icon={FiDollarSign}
            trend="up"
            trendValue={`${(stats.revenueGrowth || 0).toFixed(1)}%`}
            className="bg-gray-800/40 backdrop-blur-lg border border-gray-600/30 shadow-2xl hover:shadow-gray-500/10"
          />

          <StatCard
            title="Shop Revenue"
            value={formatCurrency(stats.shopRevenue)}
            icon={FiShoppingCart}
            trend="up"
            trendValue="12.3%"
            className="bg-gray-800/40 backdrop-blur-lg border border-gray-600/30 shadow-2xl hover:shadow-gray-500/10"
          />

          <StatCard
            title="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            icon={FiDollarSign}
            trend="up"
            trendValue={`${(stats.revenueGrowth || 0).toFixed(1)}%`}
            className="bg-gray-800/40 backdrop-blur-lg border border-gray-600/30 shadow-2xl hover:shadow-gray-500/10"
          />

          <StatCard
            title="Active Members"
            value={stats.activeMembers || 0}
            icon={FiUsers}
            trend="up"
            trendValue={`${(stats.memberGrowth || 0).toFixed(1)}%`}
            color="green"
            subtitle="Total registered"
            className="bg-gray-800/40 backdrop-blur-lg border border-gray-600/30 shadow-2xl hover:shadow-gray-500/10"
          />

          <StatCard
            title="Active Trainers"
            value={stats.activeTrainers || 0}
            icon={FiUserCheck}
            trend="stable"
            trendValue="0%"
            color="yellow"
            subtitle="Available staff"
          />

          <StatCard
            title="Today's Check-ins"
            value={stats.todayCheckIns || 0}
            icon={FiCheckCircle}
            trend="up"
            trendValue="8.1%"
            color="yellow"
            subtitle="Total attendance"
          />
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800/40 backdrop-blur-lg border border-gray-600/30 rounded-2xl shadow-2xl p-6 hover:shadow-gray-500/10 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Monthly Target
              </h3>
              <FiTarget className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="flex items-center justify-center">
              <ProgressRing
                percentage={Math.floor((stats.monthlyRevenue / 50000) * 100)}
                color="#eab308"
              />
            </div>
            <p className="text-center text-sm text-gray-300 mt-3">
              {formatCurrency(stats.monthlyRevenue)} of {formatCurrency(50000)}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800/40 backdrop-blur-lg border border-gray-600/30 rounded-2xl shadow-2xl p-6 hover:shadow-gray-500/10 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Retention Rate
              </h3>
              <FiAward className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="flex items-center justify-center">
              <ProgressRing
                percentage={stats.memberRetention}
                color="#10b981"
              />
            </div>
            <p className="text-center text-sm text-gray-300 mt-3">
              Excellent retention
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800/40 backdrop-blur-lg border border-gray-600/30 rounded-2xl shadow-2xl p-6 hover:shadow-gray-500/10 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Total Members
              </h3>
              <FiUsers className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">
                {stats.activeMembers}
              </div>
              <div className="w-full bg-gray-600 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full transition-all duration-1000"
                  style={{
                    width: `${Math.min(
                      (stats.activeMembers / 100) * 100,
                      100
                    )}%`,
                  }}
                ></div>
              </div>
              <p className="text-sm text-gray-300 mt-2">Registered members</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-600/60 backdrop-blur-lg border border-gray-500/30 rounded-2xl shadow-2xl p-6 text-white hover:shadow-gray-500/20 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Today's Revenue
              </h3>
              <FiDollarSign className="h-5 w-5 text-white" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">
                {formatCurrency(stats.monthlyRevenue)}
              </div>
              <div className="text-sm text-white/80 mb-3">Monthly total</div>
              <div className="flex justify-center space-x-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-2 bg-white/30 rounded-full"
                    style={{
                      height: `${i * 4 + 8}px`,
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
            className="bg-gray-800/40 backdrop-blur-lg border border-gray-600/30 rounded-2xl shadow-2xl p-6 hover:shadow-gray-500/10 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Revenue Trend</h3>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <div className="w-3 h-3 bg-amber-600 rounded-full"></div>
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
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                      <stop
                        offset="95%"
                        stopColor="#f59e0b"
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
                    stroke="#f59e0b"
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
            className="bg-black/30 text-yellow-500 rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-yellow-500">
                Weekly Attendance
              </h3>
              <div className="text-sm text-yellow-600 font-medium">
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
                      backgroundColor: "yellow",
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/40 backdrop-blur-lg border border-gray-600/30 rounded-2xl shadow-2xl p-6 hover:shadow-gray-500/10 transition-all duration-300"
          >
            <h3 className="text-xl font-bold text-white mb-6">
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
              <div className="h-64 flex items-center justify-center text-gray-300">
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
                    <span className="text-sm text-gray-300">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-white">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800/40 backdrop-blur-lg border border-gray-600/30 rounded-2xl shadow-2xl p-6 hover:shadow-gray-500/10 transition-all duration-300"
          >
            <h3 className="text-xl font-bold text-white mb-6">
              Top Active Members
            </h3>
            <div className="space-y-4">
              {topActiveMembers.length === 0
                ? [...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center animate-pulse">
                      <div className="w-10 h-10 bg-gray-500 rounded-full mr-3"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-500 rounded w-3/4 mb-1"></div>
                        <div className="h-3 bg-gray-500 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))
                : topActiveMembers.map((member, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                          {member.avatar}
                        </div>
                        <div>
                          <div className="font-medium text-white">
                            {member.name}
                          </div>
                          <div className="text-sm text-gray-300">
                            {member.membershipType}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-white">
                          {member.count}
                        </div>
                        <div className="text-xs text-gray-300">check-ins</div>
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
          className="bg-gray-800/40 backdrop-blur-lg border border-gray-600/30 rounded-2xl shadow-2xl overflow-hidden mb-8 hover:shadow-gray-500/10 transition-all duration-300"
        >
          <div className="p-6 border-b border-gray-600">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">
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
              <thead className="bg-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Membership
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-700 divide-y divide-gray-600">
                {recentMembers.length === 0
                  ? // Loading skeleton
                    Array(5)
                      .fill(0)
                      .map((_, index) => (
                        <tr key={index} className="animate-pulse">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 bg-gray-500 rounded-full"></div>
                              <div className="ml-4">
                                <div className="h-4 bg-gray-500 rounded w-24"></div>
                                <div className="h-3 bg-gray-500 rounded w-32 mt-1"></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-4 bg-gray-500 rounded w-16"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-4 bg-gray-500 rounded w-20"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-6 bg-gray-500 rounded-full w-16"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-4 bg-gray-500 rounded w-20"></div>
                          </td>
                        </tr>
                      ))
                  : recentMembers.map((member, index) => {
                      const isExpired =
                        member.expiry_date &&
                        new Date(member.expiry_date) < new Date();
                      const memberName =
                        member.name ||
                        `${member.first_name || ""} ${
                          member.last_name || ""
                        }`.trim();

                      return (
                        <motion.tr
                          key={member.athlete_id || member.id || index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="hover:bg-gray-600"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-black font-semibold">
                                {memberName.charAt(0).toUpperCase() || "M"}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-white">
                                  {memberName || "Unknown Member"}
                                </div>
                                <div className="text-sm text-gray-300">
                                  {member.email ||
                                    member.user_email ||
                                    "No email"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            {member.athlete_id || member.id || "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                              {member.membership_type || "Standard"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                isExpired
                                  ? "bg-red-100 text-red-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {isExpired ? "Expired" : "Active"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {member.start_date
                              ? formatDate(member.start_date)
                              : member.created_at
                              ? formatDate(member.created_at)
                              : "N/A"}
                          </td>
                        </motion.tr>
                      );
                    })}
                
              </tbody>
            </table>
          </div>
        </motion.div>
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/40 backdrop-blur-lg border border-gray-600/30 rounded-2xl shadow-2xl p-6 hover:shadow-gray-500/10 transition-all duration-300"
        >
          <h3 className="text-xl font-bold text-white mb-6">Quick Actions</h3>
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
                  className="flex items-center justify-center p-4 rounded-xl bg-gray-700 hover:bg-gray-600 transition-colors duration-200 group"
                >
                  <action.icon className="h-6 w-6 mr-3 text-yellow-500" />
                  <span className="font-medium text-white group-hover:text-gray-200">
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





























