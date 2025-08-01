import { useEffect, useState } from "react";
import {
  FiAlertCircle,
  FiBox,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiCopy,
  FiDollarSign,
  FiEye,
  FiEyeOff,
  FiLoader,
  FiMail,
  FiPhone,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../utils/api";

const ConfirmationPrompt = ({
  isOpen,
  onClose,
  title,
  message,
  type = "success",
}) => {
  if (!isOpen) return null;

  const colors = {
    success: {
      bg: "bg-gray-800",
      border: "border-yellow-600",
      icon: <FiCheckCircle className="h-6 w-6 text-yellow-500" />,
      title: "text-yellow-400",
      message: "text-gray-200",
      button: "bg-yellow-700 hover:bg-yellow-800",
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      icon: <FiAlertCircle className="h-6 w-6 text-red-500" />,
      title: "text-red-800",
      message: "text-red-600",
      button: "bg-red-600 hover:bg-red-700",
    },
    warning: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: <FiAlertCircle className="h-6 w-6 text-amber-500" />,
      title: "text-amber-800",
      message: "text-amber-600",
      button: "bg-amber-600 hover:bg-amber-700",
    },
  };

  const currentColor = colors[type];

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className={`fixed inset-0 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true">
          <div className="absolute inset-0 bg-gray-900 opacity-50"></div>
        </div>

        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
        >
          &#8203;
        </span>

        <div className={`inline-block align-bottom bg-gray-900 rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all duration-300 sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'}`}>
          <div
            className={`${currentColor.bg} ${currentColor.border} border-l-4 p-6`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">{currentColor.icon}</div>
              <div className="ml-3 w-0 flex-1 pt-0.5">
                <h3 className={`text-lg font-semibold ${currentColor.title}`}>
                  {title}
                </h3>
                <div className={`mt-2 text-sm ${currentColor.message}`}>
                  <p>{message}</p>
                </div>
              </div>
              <div className="ml-4 flex-shrink-0 flex">
                <button
                  onClick={onClose}
                  className="rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-600 transition-colors"
                >
                  <span className="sr-only">Close</span>
                  <FiX className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 px-6 py-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className={`w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 ${currentColor.button} text-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-600 sm:ml-3 sm:w-auto sm:text-sm transition-all hover:shadow-lg`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FormField = ({
  label,
  icon: Icon,
  error,
  success,
  children,
  required = false,
  tooltip,
}) => (
  <div className="space-y-2">
    <label className="flex items-center text-sm font-medium text-gray-200">
      {Icon && <Icon className="h-4 w-4 mr-2 text-gray-500" />}
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
      {tooltip && (
        <div className="ml-2 group relative">
          <FiAlertCircle className="h-4 w-4 text-gray-400 cursor-help" />
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
            {tooltip}
          </div>
        </div>
      )}
    </label>
    <div className="relative">
      {children}
      {error && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <FiAlertCircle className="h-5 w-5 text-red-500" />
        </div>
      )}
      {success && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <FiCheckCircle className="h-5 w-5 text-green-500" />
        </div>
      )}
    </div>
    {error && (
      <p className="text-sm text-red-600 flex items-center">
        <FiAlertCircle className="h-4 w-4 mr-1" />
        {error}
      </p>
    )}
  </div>
);

const CredentialsModal = ({ isOpen, credentials, onClose }) => {
  const [copied, setCopied] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied({ ...copied, [field]: true });
      setTimeout(() => setCopied({ ...copied, [field]: false }), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className={`fixed inset-0 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true">
          <div className="absolute inset-0 bg-gray-900 opacity-75"></div>
        </div>

        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
        >
          &#8203;
        </span>

        <div className={`inline-block align-bottom bg-black/20 rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all duration-300 sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full ${isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'}`}>
          <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 border-b-2 border-yellow-400 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-white p-2 rounded-full mr-3">
                  <FiUser className="h-6 w-6 text-yellow-600" />
                </div>
                <h2 className="text-xl font-bold text-white">
                  Member Login Credentials
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-md inline-flex text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-600 transition-colors"
              >
                <span className="sr-only">Close</span>
                <FiX className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="p-6 bg-gray-800">
            <div className="space-y-4">
              <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-300">Username</p>
                    <p className="font-mono text-lg text-white">
                      {credentials.username}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(credentials.username, "username")
                    }
                    className="p-2 text-gray-400 hover:text-yellow-400 transition-colors"
                  >
                    {copied.username ? (
                      <FiCheck className="h-5 w-5" />
                    ) : (
                      <FiCopy className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-300">Email</p>
                    <p className="font-mono text-lg text-white">
                      {credentials.email}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(credentials.email, "email")}
                    className="p-2 text-gray-400 hover:text-yellow-400 transition-colors"
                  >
                    {copied.email ? (
                      <FiCheck className="h-5 w-5" />
                    ) : (
                      <FiCopy className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <p className="text-sm text-gray-300">Password</p>
                    <div className="flex items-center">
                      <p className="font-mono text-lg text-white mr-2">
                        {showPassword ? credentials.password : "••••••••"}
                      </p>
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1 text-gray-400 hover:text-yellow-400 transition-colors"
                      >
                        {showPassword ? (
                          <FiEyeOff className="h-4 w-4" />
                        ) : (
                          <FiEye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(credentials.password, "password")
                    }
                    className="p-2 text-gray-400 hover:text-yellow-400 transition-colors"
                  >
                    {copied.password ? (
                      <FiCheck className="h-5 w-5" />
                    ) : (
                      <FiCopy className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-300 mt-2">
                <span className="text-yellow-500">Note:</span> You can change member password later in
                Settings.
              </p>
            </div>

            <div className="mt-4 p-4 bg-amber-900/50 border border-amber-600 rounded-lg">
              <div className="flex items-start">
                <FiAlertCircle className="h-5 w-5 text-amber-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-300">
                    Important
                  </p>
                  <p className="text-sm text-amber-200 mt-1">
                    Please save these credentials securely and share them with
                    the member. They will need them to access their account.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 px-6 py-4 sm:flex sm:flex-row-reverse">
            <button
              onClick={() => {
                onClose();
                navigate("/admin/members");
              }}
              className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-6 py-3 bg-yellow-700 hover:bg-yellow-800 text-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-600 sm:ml-3 sm:w-auto sm:text-sm transition-all hover:shadow-lg"
            >
              Continue to Members Page
              <FiUsers className="ml-2 h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-600 shadow-sm px-6 py-3 bg-gray-700 text-base font-medium text-gray-200 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-600 sm:mt-0 sm:w-auto sm:text-sm transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const isRenewal = queryParams.get("renewMode") === "true";
  const originalAthleteId = queryParams.get("athleteId") || "";

  // State for generated credentials (registration only)
  const [generatedCredentials, setGeneratedCredentials] = useState({
    email: "",
    password: "",
    username: "",
  });
  const [showCredentials, setShowCredentials] = useState(false);

  // Confirmation prompt state
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptData, setPromptData] = useState({
    title: "",
    message: "",
    type: "success",
  });

  // Form validation state
  const [fieldErrors, setFieldErrors] = useState({});
  const [fieldSuccess, setFieldSuccess] = useState({});

  // Initialize state with URL parameters if renewal mode, else blank for registration
  const [memberData, setMemberData] = useState(() => {
    if (isRenewal) {
      const today = new Date();
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);

      return {
        athlete_id: originalAthleteId || "",
        first_name: queryParams.get("member_name") || "",
        last_name: queryParams.get("lastName") || "",
        monthly_fee: queryParams.get("monthlyFee") || "",
        membership_type: queryParams.get("membershipType") || "gym",
        box_number: queryParams.get("boxNumber") || "",
        time_slot: queryParams.get("timeSlot") || "morning",
        start_date: today.toISOString().split("T")[0],
        expiry_date: expiryDate.toISOString().split("T")[0],
        email: queryParams.get("email") || "",
        phone: queryParams.get("phone") || "",
      };
    }

    const today = new Date();
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);

    return {
      athlete_id: "",
      first_name: "",
      last_name: "",
      monthly_fee: "",
      membership_type: "gym",
      box_number: "",
      time_slot: "morning",
      start_date: today.toISOString().split("T")[0],
      expiry_date: expiryDate.toISOString().split("T")[0],
      email: "",
      phone: "",
    };
  });

  const [loading, setLoading] = useState(false);
  const [pageReady, setPageReady] = useState(false);

  const showConfirmationPrompt = (title, message, type = "success") => {
    setPromptData({ title, message, type });
    setShowPrompt(true);
  };

  // Enhanced validation functions
  const validateField = (name, value) => {
    const errors = { ...fieldErrors };
    const success = { ...fieldSuccess };

    switch (name) {
      case "athlete_id":
        if (!value) {
          errors[name] = "Athlete ID is required";
          success[name] = false;
        } else {
          delete errors[name];
          success[name] = true;
        }
        break;

      case "first_name":
      case "last_name":
        if (!value) {
          errors[name] = `${
            name === "first_name" ? "First" : "Last"
          } name is required`;
          success[name] = false;
        } else if (value.length < 2) {
          errors[name] = `${
            name === "first_name" ? "First" : "Last"
          } name must be at least 2 characters`;
          success[name] = false;
        } else if (!/^[a-zA-Z\s]+$/.test(value)) {
          errors[name] = "Only letters and spaces are allowed";
          success[name] = false;
        } else {
          delete errors[name];
          success[name] = true;
        }
        break;

      case "email":
        if (!value && !isRenewal) {
          errors[name] = "Email is required";
          success[name] = false;
        } else if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors[name] = "Please enter a valid email address";
          success[name] = false;
        } else if (value) {
          delete errors[name];
          success[name] = true;
        }
        break;

      case "phone":
        if (!value && !isRenewal) {
          errors[name] = "Phone number is required";
          success[name] = false;
        } else if (value && !/^\d{10,11}$/.test(value)) {
          errors[name] = "Phone number must be 10-11 digits";
          success[name] = false;
        } else if (value) {
          delete errors[name];
          success[name] = true;
        }
        break;

      case "monthly_fee":
        if (!value) {
          errors[name] = "Monthly fee is required";
          success[name] = false;
        } else if (parseFloat(value) <= 0) {
          errors[name] = "Monthly fee must be greater than 0";
          success[name] = false;
        } else {
          delete errors[name];
          success[name] = true;
        }
        break;

      default:
        if (!value && name !== "box_number") {
          errors[name] = "This field is required";
          success[name] = false;
        } else {
          delete errors[name];
          success[name] = true;
        }
    }

    setFieldErrors(errors);
    setFieldSuccess(success);
  };

  useEffect(() => {
    const checkAuth = async () => {
      setPageReady(false);

      const adminToken = localStorage.getItem("admin_access_token");
      const adminAuth = localStorage.getItem("admin_isAuthenticated");

      if (!adminToken || adminAuth !== "true") {
        navigate("/login");
        return;
      }

      await testAuth();
      setPageReady(true);
    };

    checkAuth();
  }, [navigate, isRenewal, originalAthleteId]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "phone") {
      // Only allow digits and limit to 11 characters
      const cleanValue = value.replace(/\D/g, "").slice(0, 11);
      setMemberData((prev) => ({
        ...prev,
        [name]: cleanValue,
      }));
      validateField(name, cleanValue);
    } else {
      setMemberData((prev) => ({
        ...prev,
        [name]: value,
      }));
      validateField(name, value);
    }
  };

  const testAuth = async () => {
    try {
      const token = localStorage.getItem("admin_access_token");
      const response = await api.get("test/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return true;
    } catch (error) {
      console.error("Auth test failed:", error);
      return false;
    }
  };

  const refreshStats = async () => {
    try {
      const token = localStorage.getItem("admin_access_token");
      if (!token) return;

      await api.get("admin-dashboard/stats/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error("Failed to refresh stats:", error);
    }
  };

  const generatePassword = () => {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const generateUsername = (firstName, athleteId) => {
    return `${firstName.toLowerCase()}${athleteId}`;
  };

  const renewMembership = async () => {
    try {
      const token = localStorage.getItem("admin_access_token");
      if (!token) {
        throw new Error("No authentication token found. Please login again.");
      }

      const response = await api.post(
        `members/${memberData.athlete_id}/renew/`,
        null,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error renewing membership:", error);
      throw error;
    }
  };

  const getMemberData = async (athleteId) => {
    try {
      const token = localStorage.getItem("admin_access_token");
      if (!token)
        throw new Error("No authentication token found. Please login again.");

      const response = await api.get(`members/${athleteId}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching member data:", error);
      return null;
    }
  };

  const validateForm = () => {
    const requiredFields = isRenewal
      ? [
          "athlete_id",
          "start_date",
          "expiry_date",
          "monthly_fee",
          "membership_type",
          "time_slot",
        ]
      : [
          "athlete_id",
          "first_name",
          "last_name",
          "email",
          "phone",
          "monthly_fee",
          "membership_type",
          "time_slot",
          "start_date",
          "expiry_date",
        ];

    const errors = {};

    requiredFields.forEach((field) => {
      if (!memberData[field]) {
        errors[field] = "This field is required";
      }
    });

    // Additional validation
    if (memberData.phone && !/^\d{10,11}$/.test(memberData.phone)) {
      errors.phone = "Phone number must be 10-11 digits";
    }

    if (
      memberData.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(memberData.email)
    ) {
      errors.email = "Please enter a valid email address";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showConfirmationPrompt(
        "Validation Error",
        "Please fix all errors before submitting.",
        "error"
      );
      return;
    }

    setLoading(true);
    setShowCredentials(false);

    try {
      const token = localStorage.getItem("admin_access_token");
      if (!token)
        throw new Error("No authentication token found. Please login again.");

      if (isRenewal) {
        await renewMembership();

        const updatedMember = await getMemberData(memberData.athlete_id);
        if (updatedMember) {
          setMemberData(updatedMember);
        }

        localStorage.setItem("membershipRenewed", "true");

        showConfirmationPrompt(
          "Membership Renewed Successfully!",
          `${updatedMember.first_name} ${
            updatedMember.last_name
          }'s membership has been renewed until ${new Date(
            updatedMember.expiry_date
          ).toLocaleDateString()}`,
          "success"
        );

        setTimeout(() => {
          navigate("/admin/members");
        }, 2000);
      } else {
        // Registration flow
        const generatedPassword = generatePassword();
        const username = generateUsername(
          memberData.first_name,
          memberData.athlete_id
        );

        setGeneratedCredentials({
          email: memberData.email,
          password: generatedPassword,
          username: username,
        });

        const memberDataWithAuth = {
          ...memberData,
          password: generatedPassword,
          username: username,
        };

        localStorage.setItem(
          "lastMemberCredentials",
          JSON.stringify({
            email: memberData.email,
            password: generatedPassword,
            username: username,
            name: `${memberData.first_name} ${memberData.last_name}`,
            athleteId: memberData.athlete_id,
            timestamp: new Date().toISOString(),
          })
        );

        await api.post("members/register/", memberDataWithAuth, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        showConfirmationPrompt(
          "Registration Successful!",
          `${memberData.first_name} ${memberData.last_name} has been successfully registered. Their account credentials have been generated.`,
          "success"
        );

        // Show credentials modal after a brief delay
        setTimeout(() => {
          setShowCredentials(true);
        }, 1000);

        // Reset form
        setMemberData({
          athlete_id: "",
          first_name: "",
          last_name: "",
          monthly_fee: "",
          membership_type: "gym",
          box_number: "",
          time_slot: "morning",
          start_date: new Date().toISOString().split("T")[0],
          expiry_date: new Date(new Date().setMonth(new Date().getMonth() + 1))
            .toISOString()
            .split("T")[0],
          email: "",
          phone: "",
        });
        setFieldErrors({});
        setFieldSuccess({});
      }

      await refreshStats();
    } catch (error) {
      console.error("Registration/renewal error:", error);

      let errorMessage =
        error.message || "An error occurred during registration/renewal";
      if (error.response?.data) {
        errorMessage =
          typeof error.response.data === "object"
            ? JSON.stringify(error.response.data)
            : error.response.data;
      }

      showConfirmationPrompt("Error", errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  if (!pageReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100 flex justify-center items-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-700 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <ConfirmationPrompt
        isOpen={showPrompt}
        onClose={() => setShowPrompt(false)}
        title={promptData.title}
        message={promptData.message}
        type={promptData.type}
      />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-black/30 rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 p-3 rounded-full">
                <FiUsers className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-200 mb-2">
              {isRenewal ? "Renew Membership" : "Register New Athlete"}
            </h1>
            <p className="text-gray-300">
              {isRenewal
                ? "Extend the membership duration for an existing athlete"
                : "Add a new athlete to the system with their membership details"}
            </p>
          </div>
        </div>

        {/* Credentials Modal */}
        <CredentialsModal
          isOpen={showCredentials}
          credentials={generatedCredentials}
          onClose={() => setShowCredentials(false)}
        />

        {/* Form */}
        <div className="bg-black/20 rounded-2xl shadow-xl overflow-hidden">
          <div className="flex items-center space-x-3 mb-6 p-6">
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-2 rounded-lg">
              <FiUsers className="text-white w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold text-gray-200">
              {isRenewal ? "Membership Renewal Form" : "Registration Form"}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Athlete ID */}
              <FormField
                label="Athlete ID"
                icon={FiUser}
                required
                error={fieldErrors.athlete_id}
                success={fieldSuccess.athlete_id}
                tooltip="Unique identifier for the athlete"
              >
                <input
                  type="text"
                  name="athlete_id"
                  value={memberData.athlete_id}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg text-white bg-gray-800 border-gray-300 focus:outline-none transition-all duration-200 ${
                    fieldErrors.athlete_id
                      ? "border-red-500"
                      : fieldSuccess.athlete_id
                      ? "border-green-500"
                      : "border-gray-600"
                  } ${isRenewal ? "bg-gray-700 cursor-not-allowed" : ""}`}
                  placeholder="Enter athlete ID (e.g., A12345)"
                  disabled={isRenewal}
                />
              </FormField>

              {/* First Name */}
              <FormField
                label="First Name"
                icon={FiUser}
                required
                error={fieldErrors.first_name}
                success={fieldSuccess.first_name}
              >
                <input
                  type="text"
                  name="first_name"
                  value={memberData.first_name}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg text-white bg-gray-800 border-gray-300 focus:outline-none transition-all duration-200 ${
                    fieldErrors.first_name
                      ? "border-red-500"
                      : fieldSuccess.first_name
                      ? "border-green-500"
                      : "border-gray-600"
                  } ${isRenewal ? "bg-gray-700 cursor-not-allowed" : ""}`}
                  placeholder="Enter first name"
                  disabled={isRenewal}
                />
              </FormField>

              {/* Last Name */}
              <FormField
                label="Last Name"
                icon={FiUser}
                required
                error={fieldErrors.last_name}
                success={fieldSuccess.last_name}
              >
                <input
                  type="text"
                  name="last_name"
                  value={memberData.last_name}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg text-white bg-gray-800 border-gray-300 focus:outline-none transition-all duration-200 ${
                    fieldErrors.last_name
                      ? "border-red-500"
                      : fieldSuccess.last_name
                      ? "border-green-500"
                      : "border-gray-600"
                  } ${isRenewal ? "bg-gray-700 cursor-not-allowed" : ""}`}
                  placeholder="Enter last name"
                  disabled={isRenewal}
                />
              </FormField>

              {/* Email */}
              <FormField
                label="Email Address"
                icon={FiMail}
                required={!isRenewal}
                error={fieldErrors.email}
                success={fieldSuccess.email}
                tooltip="Email address for account notifications"
              >
                <input
                  type="email"
                  name="email"
                  value={memberData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg text-white bg-gray-800 border-gray-300 focus:outline-none transition-all duration-200 ${
                    fieldErrors.email
                      ? "border-red-500"
                      : fieldSuccess.email
                      ? "border-green-500"
                      : "border-gray-600"
                  } ${isRenewal ? "bg-gray-700 cursor-not-allowed" : ""}`}
                  placeholder="Enter email address"
                  disabled={isRenewal}
                />
              </FormField>

              {/* Phone Number */}
              <FormField
                label="Phone Number"
                icon={FiPhone}
                required={!isRenewal}
                error={fieldErrors.phone}
                success={fieldSuccess.phone}
                tooltip="10-11 digit phone number"
              >
                <input
                  type="tel"
                  name="phone"
                  value={memberData.phone}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg text-white bg-gray-800 border-gray-300 focus:outline-none transition-all duration-200 ${
                    fieldErrors.phone
                      ? "border-red-500"
                      : fieldSuccess.phone
                      ? "border-green-500"
                      : "border-gray-600"
                  } ${isRenewal ? "bg-gray-700 cursor-not-allowed" : ""}`}
                  placeholder="07XXXXXXXXX"
                  disabled={isRenewal}
                />
              </FormField>

              {/* Monthly Fee */}
              <FormField
                label="Monthly Fee (AFN)"
                icon={FiDollarSign}
                required
                error={fieldErrors.monthly_fee}
                success={fieldSuccess.monthly_fee}
                tooltip="Monthly membership fee amount"
              >
                <input
                  type="number"
                  name="monthly_fee"
                  value={memberData.monthly_fee}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg text-white bg-gray-800 border-gray-300 focus:outline-none transition-all duration-200 ${
                    fieldErrors.monthly_fee
                      ? "border-red-500"
                      : fieldSuccess.monthly_fee
                      ? "border-green-500"
                      : "border-gray-600"
                  } ${isRenewal ? "bg-gray-700 cursor-not-allowed" : ""}`}
                  placeholder="Enter monthly fee"
                  min="0"
                  step="0.01"
                  disabled={isRenewal}
                />
              </FormField>

              {/* Box Number */}
              <FormField
                label="Box Number"
                icon={FiBox}
                error={fieldErrors.box_number}
                success={fieldSuccess.box_number}
                tooltip="Optional locker box number"
              >
                <input
                  type="text"
                  name="box_number"
                  value={memberData.box_number}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg text-white bg-gray-800 border-gray-300 focus:outline-none transition-all duration-200 ${
                    fieldErrors.box_number
                      ? "border-red-500"
                      : fieldSuccess.box_number
                      ? "border-green-500"
                      : "border-gray-600"
                  }`}
                  placeholder="Enter box number (optional)"
                />
              </FormField>

              {/* Membership Type */}
              <FormField
                label="Membership Type"
                icon={FiUsers}
                required
                error={fieldErrors.membership_type}
                success={fieldSuccess.membership_type}
              >
                <select
                  name="membership_type"
                  value={memberData.membership_type}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg text-white bg-gray-800 border-gray-300 focus:outline-none transition-all duration-200 ${
                    fieldErrors.membership_type
                      ? "border-red-500"
                      : fieldSuccess.membership_type
                      ? "border-green-500"
                      : "border-gray-600"
                  } ${isRenewal ? "bg-gray-600 cursor-not-allowed" : ""}`}
                  disabled={isRenewal}
                >
                  <option value="gym" className="text-yellow-500">
                    Gym Membership
                  </option>
                  <option value="fitness" className="text-yellow-500">
                    Fitness Only
                  </option>
                </select>
              </FormField>

              {/* Time Slot */}
              <FormField
                label="Time Slot"
                icon={FiClock}
                required
                error={fieldErrors.time_slot}
                success={fieldSuccess.time_slot}
              >
                <select
                  name="time_slot"
                  value={memberData.time_slot}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg text-white bg-gray-800 border-gray-300 focus:outline-none transition-all duration-200 ${
                    fieldErrors.time_slot
                      ? "border-red-500"
                      : fieldSuccess.time_slot
                      ? "border-green-500"
                      : "border-gray-600"
                  }`}
                >
                  <option value="morning" className="text-yellow-500">
                    Morning (6AM - 12PM)
                  </option>
                  <option value="afternoon" className="text-yellow-500">
                    Afternoon (12PM - 6PM)
                  </option>
                  <option value="evening" className="text-yellow-500">
                    {" "}
                    Evening (6PM - 10PM)
                  </option>
                  <option value="all_day" className="text-yellow-500">
                    All Day Access
                  </option>
                </select>
              </FormField>

              {/* Start Date */}
              <FormField
                label="Start Date"
                icon={FiCalendar}
                required
                error={fieldErrors.start_date}
                success={fieldSuccess.start_date}
              >
                <input
                  type="date"
                  name="start_date"
                  value={memberData.start_date}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg text-white bg-gray-800 border-gray-300 focus:outline-none transition-all duration-200 ${
                    fieldErrors.start_date
                      ? "border-red-500"
                      : fieldSuccess.start_date
                      ? "border-green-500"
                      : "border-gray-600"
                  } ${isRenewal ? "bg-gray-700 cursor-not-allowed" : ""}`}
                  style={{ colorScheme: 'dark' }}
                  min={new Date().toISOString().split("T")[0]}
                  disabled={isRenewal}
                />
              </FormField>

              {/* Expiry Date */}
              <FormField
                label="Expiry Date"
                icon={FiCalendar}
                required
                error={fieldErrors.expiry_date}
                success={fieldSuccess.expiry_date}
              >
                <input
                  type="date"
                  name="expiry_date"
                  value={memberData.expiry_date}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg text-white bg-gray-800 border-gray-300 focus:outline-none transition-all duration-200 ${
                    fieldErrors.expiry_date
                      ? "border-red-500"
                      : fieldSuccess.expiry_date
                      ? "border-green-500"
                      : "border-gray-600"
                  }`}
                  style={{ colorScheme: 'dark' }}
                  min={memberData.start_date}
                />
              </FormField>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate("/admin/members")}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-200 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading || Object.keys(fieldErrors).length > 0}
                className={`flex-1 px-6 py-3 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-yellow-600 transition-all duration-200 ${
                  loading || Object.keys(fieldErrors).length > 0
                    ? "bg-gray-400 cursor-not-allowed text-white"
                    : "bg-gradient-to-r from-yellow-700 to-yellow-600 hover:from-yellow-600 hover:to-yellow-900 text-white shadow-lg hover:shadow-xl"
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <FiLoader className="animate-spin h-5 w-5 mr-2" />
                    Processing...
                  </div>
                ) : isRenewal ? (
                  "Renew Membership"
                ) : (
                  "Register Athlete"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
