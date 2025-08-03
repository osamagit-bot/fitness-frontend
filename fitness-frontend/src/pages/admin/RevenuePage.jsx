import { useEffect, useState } from "react";
import "react-datepicker/dist/react-datepicker.css";
import { FiCalendar, FiDownload, FiPrinter } from "react-icons/fi";
import {
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import api from "../../utils/api";

const BACKEND_URL = "http://127.0.0.1:8000";
const COLORS = [
  "#2563eb",
  "#10b981",
  "#f59e42",
  "#a78bfa",
  "#f43f5e",
  "#fbbf24",
];

function RevenuePage() {
  const [members, setMembers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date(),
  });
  const [dateRangeType, setDateRangeType] = useState("monthly");

  // Revenue states
  const [rangeMembershipRevenue, setRangeMembershipRevenue] = useState(0);
  const [rangeProductRevenue, setRangeProductRevenue] = useState(0);
  const [stats, setStats] = useState({ monthlyRevenue: 0, shopRevenue: 0, totalMonthlyRevenue: 0 });

  // For charts
  const [dailyRevenueChart, setDailyRevenueChart] = useState([]);
  const [productPieData, setProductPieData] = useState([]);

  // --- Fetch Data ---
  useEffect(() => {
    fetchAllData();
    
    // Listen for purchase completion events
    const handlePurchaseCompleted = () => {
      console.log('🔄 Purchase completed, refreshing revenue data...');
      setTimeout(() => {
        fetchAllData();
      }, 1000);
    };
    
    // Listen for member registration events
    const handleMemberRegistered = () => {
      console.log('🔄 Member registered, refreshing revenue data...');
      setTimeout(() => {
        fetchAllData();
      }, 1500);
    };
    
    window.addEventListener('purchaseCompleted', handlePurchaseCompleted);
    window.addEventListener('memberRegistered', handleMemberRegistered);
    return () => {
      window.removeEventListener('purchaseCompleted', handlePurchaseCompleted);
      window.removeEventListener('memberRegistered', handleMemberRegistered);
    };
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("admin_access_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      console.log('🔍 Using token for API calls:', !!token);
      const [statsRes, membersRes, purchasesRes] = await Promise.all([
        api.get(`admin-dashboard/stats/`, { headers }),
        api.get(`members/?show_all=true`, { headers }),
        api.get(`purchases/?show_all=true`, { headers }),
      ]);
      
      console.log('🔍 Purchases API response:', purchasesRes.data);
      // Parse revenue values from backend stats
      const parseRevenue = (value) => {
        if (typeof value === "string") {
          return parseFloat(value.replace(" AFN", "").replace(",", "")) || 0;
        }
        return parseFloat(value) || 0;
      };
      const membershipRevenue = parseRevenue(statsRes.data.monthly_revenue);
      const shopRevenue = parseRevenue(statsRes.data.monthly_revenue_shop);
      const totalMonthlyRevenue = parseRevenue(statsRes.data.total_monthly_revenue);
      
      console.log('🔍 RevenuePage stats:', {
        membershipRevenue,
        shopRevenue,
        totalMonthlyRevenue,
        note: statsRes.data.note
      });
      
      setStats({
        monthlyRevenue: membershipRevenue,
        shopRevenue: shopRevenue,
        totalMonthlyRevenue: totalMonthlyRevenue,
      });
      // Ensure we always have arrays
      const membersData = Array.isArray(membersRes.data) 
        ? membersRes.data 
        : membersRes.data?.results || [];
      const purchasesData = Array.isArray(purchasesRes.data) 
        ? purchasesRes.data 
        : purchasesRes.data?.results || [];
      
      console.log('🔍 Processed purchases data:', purchasesData.length, 'purchases');
      console.log('🔍 Sample purchase:', purchasesData[0]);
      
      setMembers(membersData);
      setPurchases(purchasesData);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to fetch data.");
      setMembers([]);
      setPurchases([]);
    }
    setLoading(false);
  };

  // --- Helper Functions ---
  function formatDate(date) {
    if (!date) return "";
    const d = new Date(date);
    return d.toISOString().split("T")[0];
  }
  function formatDateForInput(date) {
    return formatDate(date);
  }
  function formatAfn(amount) {
    return `${Number(amount || 0).toLocaleString()} AFN`;
  }

  function formatDateForDisplay(date) {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  // --- Print Functions ---
  const generatePrintableReport = (reportType) => {
    const reportTitle = getReportTitle(reportType);
    const reportPeriod = getReportPeriod(reportType);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportTitle}</title>
        <style>
          @media print {
            @page {
              margin: 1in;
              size: A4;
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              line-height: 1.4;
              color: #000;
            }
            .no-print {
              display: none !important;
            }
          }
          
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
          }
          
          .report-header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 20px;
          }
          
          .report-title {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
          }
          
          .report-period {
            font-size: 16px;
            color: #666;
            margin-bottom: 5px;
          }
          
          .report-date {
            font-size: 14px;
            color: #888;
          }
          
          .summary-section {
            margin-bottom: 30px;
          }
          
          .summary-cards {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 20px;
          }
          
          .summary-card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
          }
          
          .summary-card h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            color: #666;
            text-transform: uppercase;
          }
          
          .summary-card .amount {
            font-size: 20px;
            font-weight: bold;
            color: #2563eb;
          }
          
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #333;
            margin: 30px 0 15px 0;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
          }
          
          .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          
          .data-table th,
          .data-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          
          .data-table th {
            background-color: #f8f9fa;
            font-weight: bold;
            font-size: 12px;
            text-transform: uppercase;
          }
          
          .data-table td {
            font-size: 11px;
          }
          
          .chart-placeholder {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            color: #666;
            margin-bottom: 20px;
            background-color: #f8f9fa;
          }
          
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 10px;
            color: #888;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <div class="report-title">${reportTitle}</div>
          <div class="report-period">${reportPeriod}</div>
          <div class="report-date">Generated on: ${new Date().toLocaleDateString(
            "en-US",
            {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }
          )}</div>
        </div>

        <div class="summary-section">
          <div class="summary-cards">
            <div class="summary-card">
              <h3>Membership Revenue</h3>
              <div class="amount">${formatAfn(rangeMembershipRevenue)}</div>
            </div>
            <div class="summary-card">
              <h3>Shop Revenue</h3>
              <div class="amount">${formatAfn(rangeProductRevenue)}</div>
            </div>
            <div class="summary-card">
              <h3>Total Revenue</h3>
              <div class="amount">${formatAfn(
                dateRangeType === "monthly" && 
                new Date(dateRange.startDate).getMonth() === new Date().getMonth() && 
                new Date(dateRange.startDate).getFullYear() === new Date().getFullYear()
                  ? stats.totalMonthlyRevenue
                  : rangeMembershipRevenue + rangeProductRevenue
              )}</div>
            </div>
          </div>
        </div>

        <div class="section-title">Revenue Trend Data</div>
        <div class="chart-placeholder">
          Revenue trend chart data is available in the digital version
        </div>
        
        ${generateRevenueTable()}
        
        <div class="section-title">Recent Registered Members</div>
        ${generateMembersTable()}
        
        <div class="section-title">Recent Product Sales</div>
        ${generateProductsTable()}
        
        ${
          productPieData.length > 0
            ? `
          <div class="section-title">Product Sales Summary</div>
          ${generateProductSummaryTable()}
        `
            : ""
        }
        
        <div class="footer">
          <p>This report was generated automatically from the Revenue Management System</p>
          <p>For questions or concerns, please contact the system administrator</p>
        </div>
      </body>
      </html>
    `;
  };

  const generateRevenueTable = () => {
    if (dailyRevenueChart.length === 0)
      return "<p>No revenue data available for this period.</p>";

    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Membership Revenue</th>
            <th>Shop Revenue</th>
            <th>Total Revenue</th>
          </tr>
        </thead>
        <tbody>
          ${dailyRevenueChart
            .map(
              (day) => `
            <tr>
              <td>${formatDateForDisplay(day.date)}</td>
              <td>${formatAfn(day.Membership)}</td>
              <td>${formatAfn(day.Shop)}</td>
              <td>${formatAfn(day.Total)}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
  };

  const generateMembersTable = () => {
    const recentMembers = [...members]
      .filter((m) => {
        const date = new Date(m.start_date);
        return (
          date >= new Date(dateRange.startDate) &&
          date <= new Date(dateRange.endDate)
        );
      })
      .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

    if (recentMembers.length === 0)
      return "<p>No members registered in this period.</p>";

    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Membership Type</th>
            <th>Monthly Fee</th>
            <th>Registration Date</th>
          </tr>
        </thead>
        <tbody>
          ${recentMembers
            .map(
              (m) => `
            <tr>
              <td>${m.name || `${m.first_name || ""} ${m.last_name || ""}`}</td>
              <td>${m.membership_type || "Standard"}</td>
              <td>${formatAfn(m.monthly_fee)}</td>
              <td>${formatDateForDisplay(m.start_date)}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
  };

  const generateProductsTable = () => {
    const recentProducts = [...purchases]
      .filter((p) => {
        const date = new Date(p.date);
        return (
          date >= new Date(dateRange.startDate) &&
          date <= new Date(dateRange.endDate)
        );
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (recentProducts.length === 0)
      return "<p>No products sold in this period.</p>";

    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Quantity</th>
            <th>Total Price</th>
            <th>Sale Date</th>
          </tr>
        </thead>
        <tbody>
          ${recentProducts
            .map(
              (p) => `
            <tr>
              <td>${p.product_name || `Product ${p.product}`}</td>
              <td>${p.quantity}</td>
              <td>${formatAfn(p.total_price)}</td>
              <td>${formatDateForDisplay(p.date)}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
  };

  const generateProductSummaryTable = () => {
    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Total Sales</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          ${productPieData
            .map((product) => {
              const percentage = (
                (product.value / rangeProductRevenue) *
                100
              ).toFixed(1);
              return `
              <tr>
                <td>${product.name}</td>
                <td>${formatAfn(product.value)}</td>
                <td>${percentage}%</td>
              </tr>
            `;
            })
            .join("")}
        </tbody>
      </table>
    `;
  };

  const getReportTitle = (reportType) => {
    switch (reportType) {
      case "daily":
        return "Daily Revenue Report";
      case "monthly":
        return "Monthly Revenue Report";
      case "annual":
        return "Annual Revenue Report";
      default:
        return "Revenue Report";
    }
  };

  const getReportPeriod = (reportType) => {
    const start = formatDateForDisplay(dateRange.startDate);
    const end = formatDateForDisplay(dateRange.endDate);

    if (reportType === "daily") {
      return `Daily Report for ${start}`;
    } else if (reportType === "annual") {
      return `Annual Report: ${start} - ${end}`;
    } else {
      return `Report Period: ${start} - ${end}`;
    }
  };

  const handlePrint = (reportType) => {
    // Set appropriate date range for the report type
    const today = new Date();
    let startDate, endDate;

    switch (reportType) {
      case "daily":
        startDate = new Date(today);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "monthly":
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "annual":
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate = dateRange.startDate;
        endDate = dateRange.endDate;
    }

    // Temporarily update date range for report generation
    const originalDateRange = dateRange;
    setDateRange({ startDate, endDate });

    // Generate and print report
    setTimeout(() => {
      const printContent = generatePrintableReport(reportType);
      const printWindow = window.open("", "_blank");
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();

      // Restore original date range
      setDateRange(originalDateRange);
    }, 100);
  };

  const handleDownloadReport = (reportType) => {
    const reportContent = generatePrintableReport(reportType);
    const blob = new Blob([reportContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${getReportTitle(reportType).replace(/\s+/g, "_")}_${
      new Date().toISOString().split("T")[0]
    }.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Revenue Calculations ---
  useEffect(() => {
    // Only calculate product revenue and charts from purchases
    calculateProductRevenueAndCharts();
    // eslint-disable-next-line
  }, [purchases, dateRange, stats.monthlyRevenue]);

  function calculateProductRevenueAndCharts() {
    // Range product revenue
    const _rangeProductRevenue = purchases
      .filter((p) => {
        const d = new Date(p.date);
        return d >= new Date(dateRange.startDate) && d <= new Date(dateRange.endDate);
      })
      .reduce((sum, p) => sum + parseFloat(p.total_price || 0), 0);
    
    // Use only calculated revenue from actual purchases
    setRangeProductRevenue(_rangeProductRevenue);
    
    // Fetch membership revenue for the selected date range
    fetchMembershipRevenueForRange();

    // Chart: Daily revenue in range
    generateDailyRevenueChart();

    // Pie: Product sales distribution
    const productMap = {};
    purchases
      .filter((p) => {
        const d = new Date(p.date);
        return (
          d >= new Date(dateRange.startDate) && d <= new Date(dateRange.endDate)
        );
      })
      .forEach((p) => {
        const name = p.product_name || `Product ${p.product}`;
        if (!productMap[name]) productMap[name] = 0;
        productMap[name] += parseFloat(p.total_price || 0);
      });
    setProductPieData(
      Object.entries(productMap).map(([name, value]) => ({ name, value }))
    );
  }

  // --- Fetch Membership Revenue for Date Range ---
  const fetchMembershipRevenueForRange = async () => {
    try {
      const startDate = dateRange.startDate.toISOString().split('T')[0];
      const endDate = dateRange.endDate.toISOString().split('T')[0];
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const rangeMonth = dateRange.startDate.getMonth();
      const rangeYear = dateRange.startDate.getFullYear();
      
      // If the date range is current month, use backend stats for consistency
      if (dateRangeType === "monthly" && rangeMonth === currentMonth && rangeYear === currentYear) {
        console.log('🔍 Using backend persistent revenue for current month:', stats.monthlyRevenue, 'AFN');
        setRangeMembershipRevenue(stats.monthlyRevenue);
        return stats.monthlyRevenue;
      }
      
      const response = await api.get(`members/membership_payments/?start_date=${startDate}&end_date=${endDate}`);
      const membershipRevenue = response.data.total_revenue || 0;
      
      console.log(`🔍 Membership revenue for ${startDate} to ${endDate}:`, membershipRevenue, 'AFN');
      setRangeMembershipRevenue(membershipRevenue);
      
      return membershipRevenue;
    } catch (error) {
      console.error('❌ Error fetching membership revenue for date range:', error);
      // Fallback to current monthly revenue if API fails
      setRangeMembershipRevenue(stats.monthlyRevenue || 0);
      return stats.monthlyRevenue || 0;
    }
  };

  // --- Generate Daily Revenue Chart ---
  const generateDailyRevenueChart = async () => {
    try {
      const startDate = dateRange.startDate.toISOString().split('T')[0];
      const endDate = dateRange.endDate.toISOString().split('T')[0];
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const rangeMonth = dateRange.startDate.getMonth();
      const rangeYear = dateRange.startDate.getFullYear();
      
      let membershipPayments = [];
      
      // For current month, try to get more accurate data
      if (dateRangeType === "monthly" && rangeMonth === currentMonth && rangeYear === currentYear) {
        try {
          const membershipResponse = await api.get(`members/membership_payments/?start_date=${startDate}&end_date=${endDate}`);
          membershipPayments = membershipResponse.data.payments || [];
        } catch (error) {
          console.warn('Could not fetch detailed membership payments, using fallback');
        }
      } else {
        // For other date ranges, fetch membership payments
        const membershipResponse = await api.get(`members/membership_payments/?start_date=${startDate}&end_date=${endDate}`);
        membershipPayments = membershipResponse.data.payments || [];
      }
      
      // Generate all days in range
      const days = [];
      let current = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);
      while (current <= end) {
        days.push(formatDate(current));
        current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
      }
      
      // Calculate daily revenue
      const chartData = days.map((day) => {
        // Shop revenue for this day
        const dayProducts = purchases
          .filter((p) => formatDate(p.date) === day)
          .reduce((sum, p) => sum + parseFloat(p.total_price || 0), 0);
        
        // Membership revenue for this day
        const dayMembership = membershipPayments
          .filter((p) => p.paid_on === day)
          .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        
        return {
          date: day,
          Membership: dayMembership,
          Shop: dayProducts,
          Total: dayMembership + dayProducts,
        };
      });
      
      setDailyRevenueChart(chartData);
    } catch (error) {
      console.error('❌ Error generating daily revenue chart:', error);
      // Fallback to simple calculation
      const days = [];
      let current = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);
      while (current <= end) {
        days.push(formatDate(current));
        current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
      }
      
      const chartData = days.map((day) => {
        const dayProducts = purchases
          .filter((p) => formatDate(p.date) === day)
          .reduce((sum, p) => sum + parseFloat(p.total_price || 0), 0);
        
        return {
          date: day,
          Membership: 0, // No membership data available
          Shop: dayProducts,
          Total: dayProducts,
        };
      });
      
      setDailyRevenueChart(chartData);
    }
  };

  // --- UI Handlers ---
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

  const handleRefresh = async () => {
    try {
      // Refresh membership revenue first
      await refreshMembershipRevenue();
      // Then fetch all data
      await fetchAllData();
    } catch (error) {
      console.error('Error during refresh:', error);
      // Still try to fetch data even if revenue refresh fails
      fetchAllData();
    }
  };

  const handleDateRangeChange = (type) => {
    setDateRangeType(type);
    const today = new Date();
    if (type === "daily") {
      const start = new Date(today);
      start.setHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      setDateRange({ startDate: start, endDate: end });
    } else if (type === "weekly") {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      setDateRange({ startDate: start, endDate: end });
    } else if (type === "monthly") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      setDateRange({ startDate: start, endDate: end });
    } else if (type === "quarterly") {
      const start = new Date(today);
      start.setMonth(today.getMonth() - 3); // Go back 3 months for quarterly
      start.setDate(1); // Start from first day of that month
      start.setHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      setDateRange({ startDate: start, endDate: end });
    }
  };

  const handleStartDateChange = (date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    setDateRange((prev) => ({ ...prev, startDate: start }));
  };
  const handleEndDateChange = (date) => {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    setDateRange((prev) => ({ ...prev, endDate: end }));
  };

  // --- Recent Members & Products ---
  const recentMembers = [...members]
    .filter((m) => {
      const date = new Date(m.start_date);
      return (
        date >= new Date(dateRange.startDate) &&
        date <= new Date(dateRange.endDate)
      );
    })
    .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
    .slice(0, 5);

  const recentProducts = [...purchases]
    .filter((p) => {
      const date = new Date(p.date);
      return (
        date >= new Date(dateRange.startDate) &&
        date <= new Date(dateRange.endDate)
      );
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  // --- Render ---
  return (
    <div className="p-6 bg-gradient-to-br from-gray-800 via-gray-800 to-black">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Revenue Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black px-4 py-2 rounded-lg shadow-md hover:from-yellow-600 hover:to-yellow-700 transition-all duration-300"
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>
      </div>

      {/* Print Controls */}
      <div className="bg-gray-700 p-5 rounded-xl shadow-md mb-6 no-print">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
          <FiPrinter className="mr-2" />
          Print Reports
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-600 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-2 flex items-center">
              <FiCalendar className="mr-2 text-blue-500" />
              Daily Report
            </h3>
            <p className="text-sm text-gray-300 mb-3">
              Print today's revenue summary
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handlePrint("daily")}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black px-3 py-2 rounded text-sm hover:from-yellow-600 hover:to-yellow-700 transition-all duration-300 flex items-center justify-center"
              >
                <FiPrinter className="mr-1" />
                Print
              </button>
              <button
                onClick={() => handleDownloadReport("daily")}
                className="flex-1 bg-gray-500 text-white px-3 py-2 rounded text-sm hover:bg-gray-600 transition-colors flex items-center justify-center"
              >
                <FiDownload className="mr-1" />
                Download
              </button>
            </div>
          </div>

          <div className="border border-gray-600 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-2 flex items-center">
              <FiCalendar className="mr-2 text-green-500" />
              Monthly Report
            </h3>
            <p className="text-sm text-gray-300 mb-3">
              Print this month's revenue summary
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handlePrint("monthly")}
                className="flex-1 bg-green-500 text-white px-3 py-2 rounded text-sm hover:bg-green-600 transition-colors flex items-center justify-center"
              >
                <FiPrinter className="mr-1" />
                Print
              </button>
              <button
                onClick={() => handleDownloadReport("monthly")}
                className="flex-1 bg-gray-500 text-white px-3 py-2 rounded text-sm hover:bg-gray-600 transition-colors flex items-center justify-center"
              >
                <FiDownload className="mr-1" />
                Download
              </button>
            </div>
          </div>

          <div className="border border-gray-600 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-2 flex items-center">
              <FiCalendar className="mr-2 text-purple-500" />
              Annual Report
            </h3>
            <p className="text-sm text-gray-300 mb-3">
              Print this year's revenue summary
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handlePrint("annual")}
                className="flex-1 bg-purple-500 text-white px-3 py-2 rounded text-sm hover:bg-purple-600 transition-colors flex items-center justify-center"
              >
                <FiPrinter className="mr-1" />
                Print
              </button>
              <button
                onClick={() => handleDownloadReport("annual")}
                className="flex-1 bg-gray-500 text-white px-3 py-2 rounded text-sm hover:bg-gray-600 transition-colors flex items-center justify-center"
              >
                <FiDownload className="mr-1" />
                Download
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-gray-600 rounded-lg">
          <p className="text-sm text-gray-300">
            <strong>Note:</strong> Print functionality will generate
            professional reports with all data tables, summaries, and formatted
            layouts optimized for printing. Download option saves reports as
            HTML files.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 text-red-300 p-4 mb-6 rounded-lg border border-red-500/50">
          {error}
        </div>
      )}

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-700 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-300 mb-1">
            Membership Revenue
          </h4>
          <p className="text-2xl font-bold text-blue-400">
            {formatAfn(rangeMembershipRevenue)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}
          </p>
        </div>
        <div className="bg-gray-700 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-300 mb-1">
            Shop Revenue
          </h4>
          <p className="text-2xl font-bold text-green-400">
            {formatAfn(rangeProductRevenue)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}
          </p>
        </div>
        <div className="bg-gray-700 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-300 mb-1">
            Total Revenue
          </h4>
          <p className="text-2xl font-bold text-yellow-400">
            {dateRangeType === "monthly" && 
             new Date(dateRange.startDate).getMonth() === new Date().getMonth() && 
             new Date(dateRange.startDate).getFullYear() === new Date().getFullYear()
              ? formatAfn(stats.totalMonthlyRevenue)
              : formatAfn(rangeMembershipRevenue + rangeProductRevenue)}
          </p>
        </div>
      </div>

      {/* Date Range Controls */}
      <div className="bg-gray-700 p-5 rounded-xl shadow-md mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Revenue Time Period</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            className={`px-4 py-2 rounded ${
              dateRangeType === "daily"
                ? "bg-yellow-500 text-black"
                : "bg-gray-600 text-white"
            }`}
            onClick={() => handleDateRangeChange("daily")}
          >
            Today
          </button>
          <button
            className={`px-4 py-2 rounded ${
              dateRangeType === "weekly"
                ? "bg-yellow-500 text-black"
                : "bg-gray-600 text-white"
            }`}
            onClick={() => handleDateRangeChange("weekly")}
          >
            Last 7 Days
          </button>
          <button
            className={`px-4 py-2 rounded ${
              dateRangeType === "monthly"
                ? "bg-yellow-500 text-black"
                : "bg-gray-600 text-white"
            }`}
            onClick={() => handleDateRangeChange("monthly")}
          >
            This Month
          </button>
          <button
            className={`px-4 py-2 rounded ${
              dateRangeType === "quarterly"
                ? "bg-yellow-500 text-black"
                : "bg-gray-600 text-white"
            }`}
            onClick={() => handleDateRangeChange("quarterly")}
          >
            Last 3 Months
          </button>
          <button
            className={`px-4 py-2 rounded ${
              dateRangeType === "custom"
                ? "bg-yellow-500 text-black"
                : "bg-gray-600 text-white"
            }`}
            onClick={() => setDateRangeType("custom")}
          >
            Custom Range
          </button>
        </div>
        {dateRangeType === "custom" && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formatDateForInput(dateRange.startDate)}
                onChange={(e) =>
                  handleStartDateChange(new Date(e.target.value))
                }
                max={formatDateForInput(new Date())}
                className="border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-gray-800 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={formatDateForInput(dateRange.endDate)}
                onChange={(e) => handleEndDateChange(new Date(e.target.value))}
                max={formatDateForInput(new Date())}
                className="border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-gray-800 text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Revenue Line Chart */}
      <div className="bg-gray-700 p-5 rounded-xl shadow-md mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Revenue Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyRevenueChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
            <XAxis dataKey="date" tick={{ fill: '#E5E7EB', fontSize: 12 }} axisLine={{ stroke: '#6B7280' }} />
            <YAxis tick={{ fill: '#E5E7EB', fontSize: 12 }} axisLine={{ stroke: '#6B7280' }} />
            <Tooltip contentStyle={{ backgroundColor: '#374151', border: '1px solid #6B7280', borderRadius: '8px', color: '#E5E7EB' }} />
            <Legend wrapperStyle={{ color: '#E5E7EB' }} />
            <Line
              type="monotone"
              dataKey="Membership"
              stroke="#3B82F6"
              strokeWidth={2}
              name="Membership Revenue"
            />
            <Line
              type="monotone"
              dataKey="Shop"
              stroke="#10B981"
              strokeWidth={2}
              name="Shop Revenue"
            />
            <Line
              type="monotone"
              dataKey="Total"
              stroke="#EAB308"
              strokeWidth={3}
              name="Total Revenue"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Product Sales Pie Chart */}
      <div className="bg-gray-700 p-5 rounded-xl shadow-md mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Product Sales Distribution
        </h2>
        {productPieData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={productPieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {productPieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-gray-300 text-center py-12">
            No product sales in this period.
          </div>
        )}
      </div>

      {/* Recent Registered Members */}
      <div className="bg-gray-700 p-5 rounded-xl shadow-md mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Recent Registered Members
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-600">
            <thead className="bg-gray-600">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Membership
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Fee
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Registered
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-700 divide-y divide-gray-600">
              {recentMembers.length > 0 ? (
                recentMembers.map((m, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-white">
                      {m.name || `${m.first_name || ""} ${m.last_name || ""}`}
                    </td>
                    <td className="px-4 py-2 text-gray-300">
                      {m.membership_type || "Standard"}
                    </td>
                    <td className="px-4 py-2 text-gray-300">{formatAfn(m.monthly_fee)}</td>
                    <td className="px-4 py-2 text-gray-300">{formatDate(m.start_date)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center text-gray-300 py-4">
                    No recent members.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Sold Products */}
      <div className="bg-gray-700 p-5 rounded-xl shadow-md mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Recent Sold Products</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-600">
            <thead className="bg-gray-600">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Total Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-700 divide-y divide-gray-600">
              {recentProducts.length > 0 ? (
                recentProducts.map((p, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-white">
                      {p.product_name || `Product ${p.product}`}
                    </td>
                    <td className="px-4 py-2 text-gray-300">{p.quantity}</td>
                    <td className="px-4 py-2 text-gray-300">{formatAfn(p.total_price)}</td>
                    <td className="px-4 py-2 text-gray-300">{formatDate(p.date)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center text-gray-300 py-4">
                    No recent sales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default RevenuePage;
