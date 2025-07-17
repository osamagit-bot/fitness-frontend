import axios from "axios";
import { useEffect, useState } from "react";
import "react-datepicker/dist/react-datepicker.css";
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
  XAxis, YAxis
} from "recharts";

const BACKEND_URL = "http://127.0.0.1:8000";
const COLORS = ["#2563eb", "#10b981", "#f59e42", "#a78bfa", "#f43f5e", "#fbbf24"];

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

  // For charts
  const [dailyRevenueChart, setDailyRevenueChart] = useState([]);
  const [productPieData, setProductPieData] = useState([]);

  // --- Fetch Data ---
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [membersRes, purchasesRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/members/`, { headers }),
        axios.get(`${BACKEND_URL}/api/purchases/`, { headers }),
      ]);
      setMembers(membersRes.data);
      setPurchases(purchasesRes.data);
    } catch (err) {
      setError("Failed to fetch data.");
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

  // --- Revenue Calculations ---
  useEffect(() => {
    calculateRevenues();
    // eslint-disable-next-line
  }, [members, purchases, dateRange]);

  function calculateRevenues() {
    // Range revenue (memberships)
    const rangeMembers = members.filter((m) => {
      const s = new Date(m.start_date);
      return s >= new Date(dateRange.startDate) && s <= new Date(dateRange.endDate);
    });
    const _rangeMembershipRevenue = rangeMembers.reduce(
      (sum, m) => sum + parseFloat(m.monthly_fee || 0),
      0
    );
    setRangeMembershipRevenue(_rangeMembershipRevenue);

    // Range product revenue
    const _rangeProductRevenue = purchases
      .filter((p) => {
        const d = new Date(p.date);
        return d >= new Date(dateRange.startDate) && d <= new Date(dateRange.endDate);
      })
      .reduce((sum, p) => sum + parseFloat(p.total_price || 0), 0);
    setRangeProductRevenue(_rangeProductRevenue);

    // Chart: Daily revenue in range
    const days = [];
    let current = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    while (current <= end) {
      days.push(formatDate(current));
      current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
    }
    const chartData = days.map((day) => {
      const dayMembers = members.filter((m) => formatDate(m.start_date) === day);
      const dayMembership = dayMembers.reduce((sum, m) => sum + parseFloat(m.monthly_fee || 0), 0);
      const dayProducts = purchases
        .filter((p) => formatDate(p.date) === day)
        .reduce((sum, p) => sum + parseFloat(p.total_price || 0), 0);
      return {
        date: day,
        Membership: dayMembership,
        Shop: dayProducts,
        Total: dayMembership + dayProducts,
      };
    });
    setDailyRevenueChart(chartData);

    // Pie: Product sales distribution
    const productMap = {};
    purchases
      .filter((p) => {
        const d = new Date(p.date);
        return d >= new Date(dateRange.startDate) && d <= new Date(dateRange.endDate);
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

  // --- UI Handlers ---
  const handleRefresh = () => fetchAllData();

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
      start.setMonth(today.getMonth() - 2);
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
  .filter(m => {
    const date = new Date(m.start_date);
    return date >= new Date(dateRange.startDate) && date <= new Date(dateRange.endDate);
  })
  .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
  .slice(0, 5);

const recentProducts = [...purchases]
  .filter(p => {
    const date = new Date(p.date);
    return date >= new Date(dateRange.startDate) && date <= new Date(dateRange.endDate);
  })
  .sort((a, b) => new Date(b.date) - new Date(a.date))
  .slice(0, 5);

  // --- Render ---
  return (
    <div className="p-6 bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Revenue Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600 transition-colors duration-300"
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>
      </div>
      {error && (
        <div className="bg-red-100 text-red-700 p-4 mb-6 rounded-lg">{error}</div>
      )}

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-500 mb-1">Membership Revenue</h4>
          <p className="text-2xl font-bold text-blue-600">{formatAfn(rangeMembershipRevenue)}</p>
          <p className="text-xs text-gray-500 mt-1">
            {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-500 mb-1">Shop Revenue</h4>
          <p className="text-2xl font-bold text-green-600">{formatAfn(rangeProductRevenue)}</p>
          <p className="text-xs text-gray-500 mt-1">
            {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}
          </p>
        </div>
        <div className="bg-indigo-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-500 mb-1">Total Revenue</h4>
          <p className="text-2xl font-bold text-indigo-600">
            {formatAfn(rangeMembershipRevenue + rangeProductRevenue)}
          </p>
        </div>
      </div>

      {/* Date Range Controls */}
      <div className="bg-white p-5 rounded-xl shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Revenue Time Period</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            className={`px-4 py-2 rounded ${dateRangeType === "daily" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
            onClick={() => handleDateRangeChange("daily")}
          >
            Today
          </button>
          <button
            className={`px-4 py-2 rounded ${dateRangeType === "weekly" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
            onClick={() => handleDateRangeChange("weekly")}
          >
            Last 7 Days
          </button>
          <button
            className={`px-4 py-2 rounded ${dateRangeType === "monthly" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
            onClick={() => handleDateRangeChange("monthly")}
          >
            This Month
          </button>
          <button
            className={`px-4 py-2 rounded ${dateRangeType === "quarterly" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
            onClick={() => handleDateRangeChange("quarterly")}
          >
            Last 3 Months
          </button>
          <button
            className={`px-4 py-2 rounded ${dateRangeType === "custom" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
            onClick={() => setDateRangeType("custom")}
          >
            Custom Range
          </button>
        </div>
        {dateRangeType === "custom" && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                value={formatDateForInput(dateRange.startDate)}
                onChange={(e) => handleStartDateChange(new Date(e.target.value))}
                max={formatDateForInput(new Date())}
                className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                value={formatDateForInput(dateRange.endDate)}
                onChange={(e) => handleEndDateChange(new Date(e.target.value))}
                max={formatDateForInput(new Date())}
                className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Revenue Line Chart */}
      <div className="bg-white p-5 rounded-xl shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Revenue Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyRevenueChart}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Membership" stroke="#2563eb" name="Membership Revenue" />
            <Line type="monotone" dataKey="Shop" stroke="#10b981" name="Shop Revenue" />
            <Line type="monotone" dataKey="Total" stroke="#a78bfa" name="Total Revenue" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Product Sales Pie Chart */}
      <div className="bg-white p-5 rounded-xl shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Product Sales Distribution</h2>
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
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-gray-500 text-center py-12">No product sales in this period.</div>
        )}
      </div>

      {/* Recent Registered Members */}
      <div className="bg-white p-5 rounded-xl shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Recent Registered Members</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Membership</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fee</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Registered</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentMembers.length > 0 ? recentMembers.map((m, i) => (
                <tr key={i}>
                  <td className="px-4 py-2">{m.name || `${m.first_name || ""} ${m.last_name || ""}`}</td>
                  <td className="px-4 py-2">{m.membership_type || "Standard"}</td>
                  <td className="px-4 py-2">{formatAfn(m.monthly_fee)}</td>
                  <td className="px-4 py-2">{formatDate(m.start_date)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="text-center text-gray-500 py-4">No recent members.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Sold Products */}
      <div className="bg-white p-5 rounded-xl shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Recent Sold Products</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Price</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentProducts.length > 0 ? recentProducts.map((p, i) => (
                <tr key={i}>
                  <td className="px-4 py-2">{p.product_name || `Product ${p.product}`}</td>
                  <td className="px-4 py-2">{p.quantity}</td>
                  <td className="px-4 py-2">{formatAfn(p.total_price)}</td>
                  <td className="px-4 py-2">{formatDate(p.date)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="text-center text-gray-500 py-4">No recent sales.</td>
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