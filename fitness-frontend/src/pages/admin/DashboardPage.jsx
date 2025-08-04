import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiAward,
  FiCalendar,
  FiCheckCircle,
  FiDollarSign,
  FiEye,
  FiPlus,
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
import { useDashboard } from "../../layouts/AdminLayout";
import api from "../../utils/api";
import { formatDate } from "../../utils/dateUtils";
import { getRelativeTime } from "../../utils/timeUtils";

const DashboardPage = () => {
  const navigate = useNavigate();
  const { dashboardStats, setDashboardStats } = useDashboard() || {};
  // IMPORTANT: Only use stats.monthlyRevenue for membership revenue display.
  // Do NOT add stats.outstandingPayments to stats.monthlyRevenue or totalRevenue.
  // outstandingPayments is for reference only and is already included in persistent tracking from backend.
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

  const [loading, setLoading] = useState(true); // Start with loading true
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
  // Separate state for manual refresh vs initial load
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Debug function to check states
  const debugStates = () => {
    console.log('🔍 Current states:', {
      loading,
      isInitializing,
      isRefreshing,
      initializingRef: initializingRef.current,
      isInitialized
    });
  };

  useEffect(() => {
    // Prevent multiple initializations
    if (isInitialized || initializingRef.current) return;
    
    // Listen for purchase completion events
    const handlePurchaseCompleted = () => {
      console.log('🔄 DashboardPage: Purchase completed, refreshing data...');
      // Only refresh if not currently initializing
      if (!initializingRef.current && !isInitializing && isInitialized) {
        setTimeout(() => {
          fetchDashboardData();
        }, 1000);
      }
    };
    
    // Listen for member registration events
    const handleMemberRegistered = () => {
      console.log('🔄 DashboardPage: Member registered, refreshing data...');
      // Only refresh if not currently initializing
      if (!initializingRef.current && !isInitializing && isInitialized) {
        setTimeout(() => {
          fetchDashboardData();
        }, 1500);
      }
    };
    
    window.addEventListener('purchaseCompleted', handlePurchaseCompleted);
    window.addEventListener('memberRegistered', handleMemberRegistered);
    
    const initializeDashboard = async () => {
      if (initializingRef.current || isInitialized) return;
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
          
          const backendShopRevenue = parseRevenue(backendStats.monthly_revenue_shop);
          const membershipRevenue = parseRevenue(backendStats.monthly_revenue);
          const totalMonthlyRevenue = parseRevenue(backendStats.total_monthly_revenue);
          
          console.log('🔍 Dashboard revenue data:', {
            membershipRevenue,
            shopRevenue: backendShopRevenue,
            totalMonthlyRevenue,
            note: backendStats.note
          });
          
          newStats = {
            ...newStats,
            activeMembers: backendStats.total_members || 0,
            activeTrainers: backendStats.total_trainers || 0,
            monthlyRevenue: membershipRevenue,
            totalRevenue: totalMonthlyRevenue, // Use monthly total from backend
            shopRevenue: backendShopRevenue,
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

        // Batch all data processing before any state updates
        const memberInsights = processMemberInsightsSync(membersList);
        const topMembers = await fetchTopActiveMembersSync();
        const revenueData = await generateRevenueDataSync();
        const attendanceData = await generateAttendanceTrendSync();
        
        // Single batch update to prevent blinking - update all states at once
        setStats(newStats);
        setRecentMembers(membersList.slice(0, 5));
        setMembershipStats(memberInsights.membershipStats);
        setGenderDistribution(memberInsights.genderDistribution);
        setMemberFrequency(memberInsights.memberFrequency);
        setTopActiveMembers(topMembers);
        setRevenueData(revenueData);
        setAttendanceTrend(attendanceData);
        
        // Update dashboard stats in header
        const currentTime = new Date();
        setLastUpdate(currentTime);
        if (setDashboardStats) {
          setDashboardStats({
            activeMembers: newStats.activeMembers,
            lastUpdate: currentTime
          });
        }
        
      } catch (error) {
        console.error("❌ Error initializing dashboard:", error);
        setError("Failed to load dashboard data");
      } finally {
        // Set loading to false after initialization is complete
        setLoading(false);
        setIsInitialized(true);
        initializingRef.current = false;
      }
    };

    initializeDashboard();
    
    return () => {
      window.removeEventListener('purchaseCompleted', handlePurchaseCompleted);
      window.removeEventListener('memberRegistered', handleMemberRegistered);
    };
  }, [isInitialized]); // Only run when initialization status changes

  // Auto-reset stuck states - only for manual refresh, not initial load
  useEffect(() => {
    if (isRefreshing) {
      const autoReset = setTimeout(() => {
        console.warn('⚠️ Auto-resetting stuck refresh after 20 seconds');
        setIsRefreshing(false);
        setError('Refresh operation timed out. The server may be slow.');
      }, 20000);

      return () => clearTimeout(autoReset);
    }
  }, [isRefreshing]);

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
      // Use the same date range logic as RevenuePage for current month
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // Fetch current month's membership revenue using the same API as RevenuePage
      const response = await api.get(`members/membership_payments/?start_date=${startDateStr}&end_date=${endDateStr}`);
      const currentMonthRevenue = response.data.total_revenue || 0;
      
      const currentMonth = today.toLocaleDateString('en-US', { month: 'short' });
      
      setRevenueData([{
        month: currentMonth,
        revenue: currentMonthRevenue,
        target: 50000,
        growth: 0
      }]);
    } catch (error) {
      console.error("Error fetching revenue trend:", error);
      // Fallback to backend stats
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
    if (loading || initializingRef.current || isInitializing) return;
    
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

      // Trust the backend calculation - it's already correct
      console.log("🔍 Using backend shop revenue calculation (Purchase records persist when products are deleted)");

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
      const backendShopRevenue = parseRevenue(backendStats.monthly_revenue_shop);
      const membershipRevenue = parseRevenue(backendStats.monthly_revenue);
      const totalMonthlyRevenue = parseRevenue(backendStats.total_monthly_revenue);

      console.log('🔍 DashboardPage revenue refresh:', {
        membershipRevenue,
        shopRevenue: backendShopRevenue,
        totalMonthlyRevenue,
        note: backendStats.note
      });

      setStats((prevStats) => ({
        ...prevStats,
        activeMembers: backendStats.total_members || 0,
        activeTrainers: backendStats.total_trainers || 0,
        todayCheckIns: todayAttendanceResponse.data.length,
        totalAttendance: todayAttendanceResponse.data.length,
        monthlyRevenue: membershipRevenue,
        totalRevenue: totalMonthlyRevenue, // Use total monthly revenue from backend
        shopRevenue: backendShopRevenue,
        // outstandingPayments is not used in revenue display
        memberGrowth: Math.random() * 10 + 5,
        revenueGrowth: Math.random() * 10 + 3,
        completionRate: Math.min(100, Math.floor(
          (membershipRevenue / 50000) * 100
        )),
      }));

      console.log("🔍 Final stats update:", {
        shopRevenue: backendShopRevenue,
        membershipRevenue,
        totalMonthlyRevenue,
        note: 'Revenue uses persistent tracking to prevent double counting'
      });
      
      // Force update last update time to trigger re-render
      setLastUpdate(new Date());
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
              {isLoading ? (
                <div className="animate-pulse">
                  <div className={`h-8 sm:h-10 w-20 rounded mb-1 ${
                    gradient ? "bg-white/20" : "bg-gray-600"
                  }`}></div>
                  {subtitle && (
                    <div className={`h-4 w-16 rounded ${
                      gradient ? "bg-white/10" : "bg-gray-700"
                    }`}></div>
                  )}
                </div>
              ) : (
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
    if (attendanceLoading) return; // Prevent duplicate calls
    
    setAttendanceLoading(true);
    try {
      console.log('🔍 Generating weekly attendance trend...');
      
      // Get last 7 days including today
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 6);
      const startDateStr = startDate.toISOString().split('T')[0];
      
      console.log('🔍 Fetching attendance from', startDateStr, 'to', endDate);
      
      const response = await api.get(`attendance_history/?start_date=${startDateStr}&end_date=${endDate}`);
      const allAttendance = response.data || [];
      
      console.log('🔍 Total attendance records:', allAttendance.length);
      
      // Group by date
      const attendanceByDate = {};
      allAttendance.forEach(record => {
        const date = record.date;
        if (date) {
          attendanceByDate[date] = (attendanceByDate[date] || 0) + 1;
        }
      });
      
      console.log('🔍 Attendance by date:', attendanceByDate);
      
      // Generate 7-day trend with real data
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
          percentage: dayAttendance > 0 ? Math.floor((dayAttendance / 60) * 100) : 0,
        };
      });
      
      console.log('🔍 Final attendance data:', attendanceData);
      setAttendanceTrend(attendanceData);
      
    } catch (error) {
      console.error("❌ Error generating attendance trend:", error);
      
      // Fallback: Create empty data for last 7 days
      const fallbackData = Array(7).fill(0).map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          day: date.toLocaleDateString("en-US", { weekday: "short" }),
          date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          attendance: 0,
          capacity: 60,
          percentage: 0,
        };
      });
      
      console.log('🔍 Using fallback data:', fallbackData);
      setAttendanceTrend(fallbackData);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const refreshMembershipRevenue = async () => {
    try {
      console.log('🔄 Refreshing membership revenue...');
      const response = await api.post('members/refresh_revenue/');
      console.log('✅ Membership revenue refreshed:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error refreshing membership revenue:', error);
      throw error;
    }
  };

  // Helper function to process member insights synchronously
  const processMemberInsightsSync = (membersList) => {
    // Membership type distribution
    const membershipTypes = {};
    membersList.forEach((member) => {
      const type = member.membership_type || "Standard";
      membershipTypes[type] = (membershipTypes[type] || 0) + 1;
    });
    
    const membershipStats = Object.keys(membershipTypes).map((type, index) => ({
      name: type,
      value: membershipTypes[type],
      fill: CHART_COLORS.primary[index % CHART_COLORS.primary.length],
    }));

    // Gender distribution
    const genderCounts = { Male: 0, Female: 0, Other: 0 };
    membersList.forEach((member) => {
      const gender = member.gender || "Other";
      genderCounts[gender] = (genderCounts[gender] || 0) + 1;
    });
    
    const genderDistribution = Object.keys(genderCounts).map((gender, index) => ({
      name: gender,
      value: genderCounts[gender],
      fill: CHART_COLORS.primary[index % CHART_COLORS.primary.length],
    }));

    // Member frequency (mock data for now)
    const memberFrequency = [
      { name: "Daily", value: Math.floor(membersList.length * 0.2) },
      { name: "Weekly", value: Math.floor(membersList.length * 0.5) },
      { name: "Monthly", value: Math.floor(membersList.length * 0.3) },
    ].map((item, index) => ({
      ...item,
      fill: CHART_COLORS.primary[index % CHART_COLORS.primary.length],
    }));

    return { membershipStats, genderDistribution, memberFrequency };
  };

  // Synchronous version of fetchTopActiveMembers
  const fetchTopActiveMembersSync = async () => {
    try {
      const response = await api.get("admin-dashboard/top-active-members/");
      return response.data.top_active_members || [];
    } catch (error) {
      console.error("Error fetching top active members:", error);
      return [];
    }
  };

  // Synchronous version of generateRevenueData
  const generateRevenueDataSync = async () => {
    try {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const response = await api.get(`members/membership_payments/?start_date=${startDateStr}&end_date=${endDateStr}`);
      const currentMonthRevenue = response.data.total_revenue || 0;
      
      const currentMonth = today.toLocaleDateString('en-US', { month: 'short' });
      
      return [{
        month: currentMonth,
        revenue: currentMonthRevenue,
        target: 50000,
        growth: 0
      }];
    } catch (error) {
      console.error("Error fetching revenue trend:", error);
      const currentMonth = new Date().toLocaleDateString('en-US', { month: 'short' });
      return [{
        month: currentMonth,
        revenue: 0,
        target: 50000,
        growth: 0
      }];
    }
  };

  // Synchronous version of generateAttendanceTrendOptimized
  const generateAttendanceTrendSync = async () => {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 6);
      const startDateStr = startDate.toISOString().split('T')[0];
      
      const response = await api.get(`attendance_history/?start_date=${startDateStr}&end_date=${endDate}`);
      const allAttendance = response.data || [];
      
      const attendanceByDate = {};
      allAttendance.forEach(record => {
        const date = record.date;
        if (date) {
          attendanceByDate[date] = (attendanceByDate[date] || 0) + 1;
        }
      });
      
      return Array(7).fill(0).map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const dateStr = date.toISOString().split('T')[0];
        const dayAttendance = attendanceByDate[dateStr] || 0;
        
        return {
          day: date.toLocaleDateString("en-US", { weekday: "short" }),
          date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          attendance: dayAttendance,
          capacity: 60,
          percentage: dayAttendance > 0 ? Math.floor((dayAttendance / 60) * 100) : 0,
        };
      });
    } catch (error) {
      console.error("❌ Error generating attendance trend:", error);
      return Array(7).fill(0).map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          day: date.toLocaleDateString("en-US", { weekday: "short" }),
          date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          attendance: 0,
          capacity: 60,
          percentage: 0,
        };
      });
    }
  };

  // Legacy function for backward compatibility
  const processMemberInsights = (membersList) => {
    const insights = processMemberInsightsSync(membersList);
    setMembershipStats(insights.membershipStats);

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
    <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-black px-2 sm:px-4 lg:px-8">
      <div className="px-2 sm:px-4 space-y-6 sm:space-y-8">
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
        {useMemo(() => (
          <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-8 lg:mt-10">
            <StatCard
              title="Membership Revenue"
              value={formatCurrency(stats.monthlyRevenue)}
              icon={FiDollarSign}
              trend="up"
              trendValue={`${(stats.revenueGrowth || 0).toFixed(1)}%`}
              className="bg-gray-800/40 backdrop-blur-lg border border-gray-600/30 shadow-2xl hover:shadow-gray-500/10"
              isLoading={loading}
            />

            <StatCard
              title="Shop Revenue"
              value={formatCurrency(stats.shopRevenue)}
              icon={FiShoppingCart}
              trend="up"
              trendValue="12.3%"
              className="bg-gray-800/40 backdrop-blur-lg border border-gray-600/30 shadow-2xl hover:shadow-gray-500/10"
              isLoading={loading}
            />

            <StatCard
              title="Total Monthly Revenue"
              value={formatCurrency(stats.totalRevenue)}
              icon={FiDollarSign}
              trend="up"
              trendValue={`${(stats.revenueGrowth || 0).toFixed(1)}%`}
              subtitle="This month's total"
              className="bg-gray-800/40 backdrop-blur-lg border border-gray-600/30 shadow-2xl hover:shadow-gray-500/10"
              isLoading={loading}
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
              isLoading={loading}
            />

            <StatCard
              title="Active Trainers"
              value={stats.activeTrainers || 0}
              icon={FiUserCheck}
              trend="stable"
              trendValue="0%"
              color="yellow"
              subtitle="Available staff"
              isLoading={loading}
            />

            <StatCard
              title="Today's Check-ins"
              value={stats.todayCheckIns || 0}
              icon={FiCheckCircle}
              trend="up"
              trendValue="8.1%"
              color="yellow"
              isLoading={loading}
              subtitle="Total attendance"
            />
          </div>
        ), [stats, loading, formatCurrency])}

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
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
                className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 font-medium"
              >
                View All
                <FiEye className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-600">
                <tr>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Membership
                  </th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Biometric
                  </th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
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
                          <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 lg:h-10 lg:w-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-black font-semibold text-xs lg:text-sm">
                                {memberName.charAt(0).toUpperCase() || "M"}
                              </div>
                              <div className="ml-2 lg:ml-4">
                                <div className="text-xs lg:text-sm font-medium text-white">
                                  {memberName || "Unknown Member"}
                                </div>
                                <div className="text-xs text-gray-300">
                                  {member.email ||
                                    member.user_email ||
                                    "No email"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs lg:text-sm text-white">
                            {member.athlete_id || member.id || "N/A"}
                          </td>
                          <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                              {member.membership_type || "Standard"}
                            </span>
                          </td>
                          <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                isExpired
                                  ? "bg-red-100 text-red-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {isExpired ? "Expired" : "Active"}
                            </span>
                          </td>
                          <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                member.biometric_registered
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {member.biometric_registered ? "Registered" : "Not Registered"}
                            </span>
                          </td>
                          <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs lg:text-sm text-gray-300">
                            <div className="flex flex-col">
                              <span className="text-white">
                                {member.start_date
                                  ? formatDate(member.start_date)
                                  : member.created_at
                                  ? formatDate(member.created_at)
                                  : "N/A"}
                              </span>
                              <span className="text-gray-400 text-xs">
                                {(() => {
                                  const timestamp = member.created_at || member.start_date;
                                  if (!timestamp) return "";
                                  // If it's just a date (no time), treat it as today
                                  if (timestamp.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                    const today = new Date().toISOString().split('T')[0];
                                    if (timestamp === today) {
                                      return 'Today';
                                    }
                                  }
                                  return getRelativeTime(timestamp);
                                })()}
                              </span>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                
              </tbody>
            </table>
          </div>
          
          {/* Mobile Cards */}
          <div className="md:hidden">
            {recentMembers.length === 0
              ? Array(3)
                  .fill(0)
                  .map((_, index) => (
                    <div key={index} className="p-4 border-b border-gray-600 animate-pulse">
                      <div className="flex items-center mb-3">
                        <div className="h-10 w-10 bg-gray-500 rounded-full"></div>
                        <div className="ml-3 flex-1">
                          <div className="h-4 bg-gray-500 rounded w-3/4 mb-1"></div>
                          <div className="h-3 bg-gray-500 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
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
                    <motion.div
                      key={member.athlete_id || member.id || index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 border-b border-gray-600 last:border-b-0"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-black font-semibold">
                            {memberName.charAt(0).toUpperCase() || "M"}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-white">
                              {memberName || "Unknown Member"}
                            </div>
                            <div className="text-xs text-gray-300">
                              ID: {member.athlete_id || member.id || "N/A"}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            isExpired
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {isExpired ? "Expired" : "Active"}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-gray-400 text-xs">Email</div>
                          <div className="text-white text-xs truncate">
                            {member.email || member.user_email || "No email"}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-xs">Membership</div>
                          <div className="text-white text-xs capitalize">
                            {member.membership_type || "Standard"}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-xs">Biometric</div>
                          <div className={`text-xs font-medium ${
                            member.biometric_registered ? "text-green-400" : "text-red-400"
                          }`}>
                            {member.biometric_registered ? "Registered" : "Not Registered"}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <div className="text-gray-400 text-xs">Joined</div>
                          <div className="text-white text-xs">
                            {member.start_date
                              ? formatDate(member.start_date)
                              : member.created_at
                              ? formatDate(member.created_at)
                              : "N/A"}
                          </div>
                          <div className="text-gray-400 text-xs">
                            {(() => {
                              const timestamp = member.created_at || member.start_date;
                              if (!timestamp) return "";
                              // If it's just a date (no time), treat it as today
                              if (timestamp.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                const today = new Date().toISOString().split('T')[0];
                                if (timestamp === today) {
                                  return 'Today';
                                }
                              }
                              return getRelativeTime(timestamp);
                            })()}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
          </div>
        </motion.div>
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/40 backdrop-blur-lg border border-gray-600/30 rounded-2xl shadow-2xl p-6 hover:shadow-gray-500/10 transition-all duration-300"
        >
          <h3 className="text-xl font-bold text-white mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-4">
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





























