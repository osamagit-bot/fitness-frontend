import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import ConfirmModal from "../../components/ui/ConfirmModal";
import AppToastContainer from "../../components/ui/ToastContainer";
import api from "../../utils/api";
import { showToast } from "../../utils/toast";

function MembersPage() {
  const [athletes, setAthletes] = useState([]);
  const [filteredAthletes, setFilteredAthletes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    startDate: "",
    endDate: "",
    filterType: "all",
  });

  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null, id: null, title: '', message: '' });

  const fetchAthletes = async () => {
    setIsLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("admin_access_token");
      const response = await api.get("members/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("🔍 Full API response:", response.data);
      console.log("🔍 Response structure:", {
        hasResults: !!response.data.results,
        isArray: Array.isArray(response.data),
        dataType: typeof response.data,
        dataKeys: Object.keys(response.data || {}),
      });

      const athletesData = response.data.results || response.data;
      console.log("🔍 Athletes data:", athletesData);
      console.log("🔍 Athletes count:", Array.isArray(athletesData) ? athletesData.length : 'Not an array');

      setAthletes(Array.isArray(athletesData) ? athletesData : []);
      setFilteredAthletes(Array.isArray(athletesData) ? athletesData : []);
    } catch (error) {
      console.error("❌ Error fetching athletes:", error);
      setError(error.response?.data?.message || "Failed to fetch athletes");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAthletes();
    if (localStorage.getItem("membershipRenewed") === "true") {
      localStorage.removeItem("membershipRenewed");
      setTimeout(fetchAthletes, 500);
    }
  }, []);

  useEffect(() => {
    applyFilters();
  }, [athletes, dateFilter, statusFilter, searchTerm]);

  const applyFilters = () => {
    let filtered = [...athletes];

    // Apply search filter first
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((athlete) => {
        const fullName =
          `${athlete.first_name} ${athlete.last_name}`.toLowerCase();
        const athleteId = athlete.athlete_id?.toString().toLowerCase() || "";
        const membershipType = athlete.membership_type?.toLowerCase() || "";
        const boxNumber = athlete.box_number?.toString().toLowerCase() || "";
        const timeSlot = athlete.time_slot?.toLowerCase() || "";

        return (
          fullName.includes(search) ||
          athleteId.includes(search) ||
          membershipType.includes(search) ||
          boxNumber.includes(search) ||
          timeSlot.includes(search)
        );
      });
    }

    // Apply date filters
    if (dateFilter.filterType === "today") {
      const today = new Date().toISOString().split("T")[0];
      filtered = filtered.filter(
        (athlete) => athlete.start_date && athlete.start_date.startsWith(today)
      );
    } else if (dateFilter.filterType === "thisMonth") {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      filtered = filtered.filter((athlete) => {
        if (!athlete.start_date) return false;
        const [year, month] = athlete.start_date.split("-");
        return (
          parseInt(month) === currentMonth && parseInt(year) === currentYear
        );
      });
    } else if (
      dateFilter.filterType === "custom" &&
      dateFilter.startDate &&
      dateFilter.endDate
    ) {
      filtered = filtered.filter((athlete) => {
        if (!athlete.start_date) return false;
        return (
          athlete.start_date >= dateFilter.startDate &&
          athlete.start_date <= dateFilter.endDate
        );
      });
    }

    if (statusFilter === "expired") {
      filtered = filtered.filter((athlete) =>
        isMembershipExpired(athlete.expiry_date)
      );
    } else if (statusFilter === "expiringSoon") {
      filtered = filtered.filter((athlete) =>
        isMembershipExpiringSoon(athlete.expiry_date)
      );
    } else if (statusFilter === "active") {
      filtered = filtered.filter(
        (athlete) =>
          !isMembershipExpired(athlete.expiry_date) &&
          !isMembershipExpiringSoon(athlete.expiry_date)
      );
    }

    setFilteredAthletes(filtered);
  };

  const resetDateFilters = () => {
    setDateFilter({
      startDate: "",
      endDate: "",
      filterType: "all",
    });
    setStatusFilter("all");
    setSearchTerm("");
    setFilteredAthletes(athletes);
  };

  const handleStatusFilter = (type) => {
    setStatusFilter(type);
  };

  const deleteAthlete = (athleteId) => {
    setConfirmModal({
      isOpen: true,
      action: 'deleteAthlete',
      id: athleteId,
      title: 'Delete Member',
      message: 'Are you sure you want to delete this member? This action cannot be undone.'
    });
  };

  const executeDeleteAthlete = async (athleteId) => {
    try {
      const token = localStorage.getItem("admin_access_token");
      await api.delete(`members/${athleteId}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      fetchAthletes();
      showToast.success("Athlete deleted successfully!");
    } catch (error) {
      console.error("Error deleting athlete:", error);
      showToast.error("Failed to delete athlete. Please try again.");
    }
  };

  const handleConfirmAction = async () => {
    const { action, id } = confirmModal;
    setConfirmModal({ isOpen: false, action: null, id: null, title: '', message: '' });
    
    if (action === 'deleteAthlete') {
      await executeDeleteAthlete(id);
    }
  };

  const handleCancelAction = () => {
    setConfirmModal({ isOpen: false, action: null, id: null, title: '', message: '' });
  };

  const handleRenew = (athlete) => {
    const params = new URLSearchParams({
      renewMode: "true",
      athleteId: athlete.athlete_id,
      firstName: athlete.first_name,
      lastName: athlete.last_name,
      membershipType: athlete.membership_type,
      monthlyFee: athlete.monthly_fee,
      boxNumber: athlete.box_number || "",
      timeSlot: athlete.time_slot || "morning",
    });
    navigate(`/admin/register?${params.toString()}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTimeSlot = (timeSlot) => {
    if (!timeSlot) return "Not specified";
    return timeSlot.charAt(0).toUpperCase() + timeSlot.slice(1);
  };

  const isMembershipExpired = (expiryDate) => {
    if (!expiryDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    return expiry < today;
  };

  const isMembershipExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    if (expiry < today) return false;
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7;
  };

  const getDaysRemaining = (expiryDate) => {
    if (!expiryDate) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-2 md:p-0 min-h-screen bg-gray-900"
      >
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-xl md:text-2xl lg:ml-6 lg:mt-5 font-bold mb-4 md:mb-6 text-yellow-400"
        >
          Athletes/Members Management
        </motion.h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
            <button
              onClick={fetchAthletes}
              className="mt-2 px-3 py-1 bg-red-200 rounded hover:bg-red-300"
            >
              Try Again
            </button>
          </div>
        )}

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="bg-gray-800 p-3 md:p-6 rounded-lg shadow-md border border-gray-700"
        >
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by name, ID, membership type, box number, or time slot..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-md leading-5 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:placeholder-gray-300 focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
              />
              {searchTerm && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    onClick={() => setSearchTerm("")}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-4">
            <h2 className="text-lg md:text-xl font-semibold text-white">Members List</h2>

            <div className="flex flex-wrap items-center gap-2 md:gap-4">
              <div
                className="flex items-center cursor-pointer"
                onClick={() => handleStatusFilter("expired")}
              >
                <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                <span className="text-xs md:text-sm text-gray-300">Expired</span>
              </div>
              <div
                className="flex items-center cursor-pointer"
                onClick={() => handleStatusFilter("expiringSoon")}
              >
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></div>
                <span className="text-xs md:text-sm text-gray-300">Expiring Soon</span>
              </div>
              <div
                className="flex items-center cursor-pointer"
                onClick={() => handleStatusFilter("active")}
              >
                <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                <span className="text-xs md:text-sm text-gray-300">Active</span>
              </div>

              <button
                onClick={() => {
                  resetDateFilters();
                  setStatusFilter("all");
                }}
                className="px-3 py-1 md:px-4 md:py-2 bg-yellow-400 text-black rounded hover:bg-yellow-600"
              >
                Refresh
              </button>
            </div>
          </div>

          {(dateFilter.filterType !== "all" ||
            statusFilter !== "all" ||
            searchTerm.trim()) && (
            <div className="mb-4 p-2 bg-gray-700 rounded-md text-sm flex items-center justify-between">
              <div className="text-gray-300">
                Showing {statusFilter !== "all" && `${statusFilter} `}
                {searchTerm.trim() && `search results for "${searchTerm}" `}(
                {filteredAthletes.length} of {athletes.length} members)
              </div>
              <button
                onClick={resetDateFilters}
                className="text-yellow-400 hover:text-yellow-300 text-sm flex items-center"
              >
                <FiX className="mr-1" /> Clear all filters
              </button>
            </div>
          )}
          {/* Large Screen Table */}
          <div className="hidden md:block">
            <table className="min-w-full divide-y divide-gray-600">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Box
                  </th>
                  <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Fee
                  </th>
                  <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Registered On
                  </th>
                  <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Expiry Date
                  </th>
                  <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-700 divide-y text-white divide-gray-400">
                {filteredAthletes.length === 0 ? (
                  <tr>
                    <td
                      colSpan="10"
                      className="px-3 md:px-6 py-4 text-center text-gray-500"
                    >
                      {searchTerm.trim()
                        ? `No members found matching "${searchTerm}"`
                        : statusFilter !== "all"
                        ? `No ${statusFilter} members found`
                        : "No athletes found"}
                    </td>
                  </tr>
                ) : (
                  filteredAthletes.map((athlete) => {
                    const isExpired = isMembershipExpired(athlete.expiry_date);
                    const isExpiringSoon = isMembershipExpiringSoon(
                      athlete.expiry_date
                    );
                    const daysRemaining = getDaysRemaining(athlete.expiry_date);

                    return (
                      <tr
                        key={athlete.athlete_id}
                        className={`
                ${isExpired ? "bg-red-900/30 hover:bg-red-900/40 text-sm" : ""}
                ${
                  isExpiringSoon && !isExpired
                    ? "bg-yellow-700/40 text-sm hover:bg-yellow-900/40"
                    : ""
                }
                ${
                  !isExpired && !isExpiringSoon
                    ? "hover:bg-gray-500 text-sm"
                    : ""
                }
              `}
                      >
                        <td className="px-3 md:px-6 py-2 md:py-3 text-xs">
                          {athlete.athlete_id}
                        </td>
                        <td
                          className={`px-3 md:px-6 py-2 md:py-3 text-xs truncate ${
                            isExpired ? "text-red-300 font-semibold" : ""
                          }`}
                        >
                          {athlete.first_name} {athlete.last_name}
                        </td>
                        <td className="px-3 md:px-6 py-2 md:py-3 text-xs capitalize truncate">
                          {athlete.membership_type}
                        </td>
                        <td className="px-3 md:px-6 py-2 md:py-3 text-xs">
                          {athlete.box_number || "-"}
                        </td>
                        <td className="px-3 md:px-6 py-2 md:py-3 text-xs capitalize truncate">
                          {formatTimeSlot(athlete.time_slot)}
                        </td>
                        <td className="px-3 md:px-6 py-2 md:py-3 text-xs">
                          {parseFloat(athlete.monthly_fee).toFixed(0)}
                        </td>
                        <td className="px-3 md:px-6 py-2 md:py-3 text-xs">
                          {formatDate(athlete.start_date)}
                        </td>
                        <td
                          className={`px-3 md:px-6 py-2 md:py-3 text-xs ${
                            isExpired ? "text-red-300 font-semibold" : ""
                          }`}
                        >
                          {formatDate(athlete.expiry_date)}
                        </td>
                        <td className="px-3 md:px-6 py-2 md:py-3 text-xs">
                          {isExpired ? (
                            <span className="px-1 py-1 inline-flex text-xs leading-4 font-semibold rounded bg-red-500/20 backdrop-blur-sm border border-red-400/30 text-red-200">
                              Expired {Math.abs(daysRemaining)} days ago
                            </span>
                          ) : isExpiringSoon ? (
                            <span className="px-1 py-1 inline-flex text-xs leading-4 font-semibold rounded bg-yellow-500/20 backdrop-blur-sm border border-yellow-400/30 text-yellow-200">
                              {daysRemaining} days left
                            </span>
                          ) : (
                            <span className="px-1 py-1 inline-flex text-xs leading-4 font-semibold rounded bg-green-500/20 backdrop-blur-sm border border-green-400/30 text-green-200">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-3 md:px-6 py-2 md:py-3">
                          <div className="flex space-x-1">
                            {isExpired && (
                              <button
                                onClick={() => handleRenew(athlete)}
                                className="text-amber-200 px-2 py-1 text-xs rounded bg-amber-500/20 backdrop-blur-sm border border-amber-400/30 hover:bg-amber-500/30 transition-all"
                              >
                                Renew
                              </button>
                            )}
                            <button
                              onClick={() => deleteAthlete(athlete.athlete_id)}
                              className="text-red-200 px-2 py-1 text-xs rounded bg-red-500/20 backdrop-blur-sm border border-red-400/30 hover:bg-red-500/30 transition-all"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Medium Screen Table */}
          <div className="hidden md:block lg:hidden overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-600">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-700 divide-y text-white divide-gray-400">
                {filteredAthletes.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-3 py-4 text-center text-gray-500"
                    >
                      {searchTerm.trim()
                        ? `No members found matching "${searchTerm}"`
                        : statusFilter !== "all"
                        ? `No ${statusFilter} members found`
                        : "No athletes found"}
                    </td>
                  </tr>
                ) : (
                  filteredAthletes.map((athlete) => {
                    const isExpired = isMembershipExpired(athlete.expiry_date);
                    const isExpiringSoon = isMembershipExpiringSoon(
                      athlete.expiry_date
                    );
                    const daysRemaining = getDaysRemaining(athlete.expiry_date);

                    return (
                      <tr
                        key={athlete.athlete_id}
                        className={`
                ${isExpired ? "bg-red-900/30 hover:bg-red-900/40 text-sm" : ""}
                ${
                  isExpiringSoon && !isExpired
                    ? "bg-yellow-500/70 text-sm hover:bg-yellow-900/40"
                    : ""
                }
                ${
                  !isExpired && !isExpiringSoon
                    ? "hover:bg-gray-500 text-sm"
                    : ""
                }
              `}
                      >
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          {athlete.athlete_id}
                        </td>
                        <td
                          className={`px-3 py-2 whitespace-nowrap text-sm ${
                            isExpired ? "text-red-300 font-semibold" : ""
                          }`}
                        >
                          {athlete.first_name} {athlete.last_name}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap capitalize text-sm">
                          {athlete.membership_type}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          {isExpired ? (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-500/20 backdrop-blur-sm border border-red-400/30 text-red-200">
                              Expired
                            </span>
                          ) : isExpiringSoon ? (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-500/20 backdrop-blur-sm border border-yellow-400/30 text-yellow-200">
                              Soon
                            </span>
                          ) : (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-500/20 backdrop-blur-sm border border-green-400/30 text-green-200">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          <div className="flex space-x-2">
                            {isExpired && (
                              <button
                                onClick={() => handleRenew(athlete)}
                                className="text-amber-200 px-2 py-1 rounded bg-amber-500/20 backdrop-blur-sm border border-amber-400/30 hover:bg-amber-500/30 transition-all"
                              >
                                Renew
                              </button>
                            )}
                            <button
                              onClick={() => deleteAthlete(athlete.athlete_id)}
                              className="text-red-200 px-2 py-1 rounded bg-red-500/20 backdrop-blur-sm border border-red-400/30 hover:bg-red-500/30 transition-all"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View - Cards */}
          <div className="md:hidden">
            {filteredAthletes.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                {searchTerm.trim()
                  ? `No members found matching "${searchTerm}"`
                  : statusFilter !== "all"
                  ? `No ${statusFilter} members found`
                  : "No athletes found"}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAthletes.map((athlete) => {
                  const isExpired = isMembershipExpired(athlete.expiry_date);
                  const isExpiringSoon = isMembershipExpiringSoon(
                    athlete.expiry_date
                  );
                  const daysRemaining = getDaysRemaining(athlete.expiry_date);

                  return (
                    <div
                      key={athlete.athlete_id}
                      className={`
              border rounded-lg p-4 shadow-sm
              ${isExpired ? "bg-red-900/30 border-red-600" : ""}
              ${
                isExpiringSoon && !isExpired
                  ? "bg-yellow-900/30 border-yellow-600"
                  : ""
              }
              ${!isExpired && !isExpiringSoon ? "bg-gray-700 border-gray-600" : ""}
            `}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3
                            className={`font-bold text-lg ${
                              isExpired ? "text-red-300" : "text-white"
                            }`}
                          >
                            {athlete.first_name} {athlete.last_name}
                          </h3>
                          <p className="text-gray-300 text-sm">
                            ID: {athlete.athlete_id}
                          </p>
                        </div>
                        <div>
                          {isExpired ? (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-500/20 backdrop-blur-sm border border-red-400/30 text-red-200">
                              Expired
                            </span>
                          ) : isExpiringSoon ? (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-500/20 backdrop-blur-sm border border-yellow-400/30 text-yellow-200">
                              Expiring Soon
                            </span>
                          ) : (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-500/20 backdrop-blur-sm border border-green-400/30 text-green-200">
                              Active
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                        <div>
                          <p className="text-gray-400">Membership:</p>
                          <p className="capitalize text-white">
                            {athlete.membership_type}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Monthly Fee:</p>
                          <p className="text-white">
                            {parseFloat(athlete.monthly_fee).toFixed(2)} AFN
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Box:</p>
                          <p className="text-white">{athlete.box_number || "-"}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Time Slot:</p>
                          <p className="capitalize text-white">
                            {formatTimeSlot(athlete.time_slot)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Registered:</p>
                          <p className="text-white">{formatDate(athlete.start_date)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Expires:</p>
                          <p
                            className={
                              isExpired ? "text-red-300 font-semibold" : "text-white"
                            }
                          >
                            {formatDate(athlete.expiry_date)}
                          </p>
                        </div>
                      </div>

                      {isExpired ? (
                        <p className="text-red-300 text-sm mb-3">
                          Expired {Math.abs(daysRemaining)} days ago
                        </p>
                      ) : isExpiringSoon ? (
                        <p className="text-yellow-300 text-sm mb-3">
                          Expires in {daysRemaining} days
                        </p>
                      ) : (
                        <p className="text-green-300 text-sm mb-3">
                          Valid for {daysRemaining} days
                        </p>
                      )}

                      <div className="flex justify-end space-x-3 pt-2 border-t border-gray-600">
                        {isExpired && (
                          <button
                            onClick={() => handleRenew(athlete)}
                            className="px-3 py-1 bg-amber-500/20 backdrop-blur-sm border border-amber-400/30 text-amber-200 rounded-md text-sm hover:bg-amber-500/30 transition-all"
                          >
                            Renew
                          </button>
                        )}
                        <button
                          onClick={() => deleteAthlete(athlete.athlete_id)}
                          className="px-3 py-1 bg-red-500/20 backdrop-blur-sm border border-red-400/30 text-red-200 rounded-md text-sm hover:bg-red-500/30 transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
      
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={handleCancelAction}
        onConfirm={handleConfirmAction}
        title={confirmModal.title}
        message={confirmModal.message}
      />
      
      <AppToastContainer />
    </>
  );
}

export default MembersPage;

