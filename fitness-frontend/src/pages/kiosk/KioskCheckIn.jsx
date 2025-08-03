import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import "../../styles/kiosk.css";
// --- CHANGE: Import both api and publicApi ---
import { publicApi } from "../../utils/api";
import { isWebAuthnSupported, kioskAuthenticate } from "../../utils/webauthn";
import { smartBiometricAuth } from "../../utils/smartBiometricAuth";
import PinCheckIn from "../../components/PinCheckIn";

const KioskCheckIn = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isListening, setIsListening] = useState(true); // This state is not used, can be removed
  const [recentCheckIns, setRecentCheckIns] = useState([]);
  const [welcomeMessage, setWelcomeMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({ todayCount: 0, totalMembers: 0 });
  const [isAutoMode, setIsAutoMode] = useState(() => {
    const saved = localStorage.getItem("kioskAutoMode");
    return saved === "true";
  });
  const [showPinMode, setShowPinMode] = useState(false);
  const [authMethod, setAuthMethod] = useState(null);
  const [sensorStatus, setSensorStatus] = useState('initializing');
  const intervalRef = useRef(null);
  const checkInTimeoutRef = useRef(null);
  const authTimeoutRef = useRef(null);
  const isAuthenticatingRef = useRef(false);
  const abortControllerRef = useRef(null);
  const lastCancelTimeRef = useRef(null);
  const cancelCountRef = useRef(0);

  useEffect(() => {
    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Initialize kiosk (fetch data only)
    initializeKiosk();
    
    // Initialize smart biometric authentication
    initializeSmartAuth();

    return () => {
      clearInterval(timeInterval);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (checkInTimeoutRef.current) clearTimeout(checkInTimeoutRef.current);
      if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      isAuthenticatingRef.current = false;
      
      // Stop smart authentication
      smartBiometricAuth.stopAuthentication();
    };
  }, []);

  // Effect to start/stop continuous authentication when isAutoMode changes
  useEffect(() => {
    if (isAutoMode) {
      console.log("Auto mode enabled. Starting continuous authentication...");
      // Start continuous authentication with the current auto mode state
      startContinuousAuthentication(false, true);
    } else {
      console.log("Auto mode disabled. Stopping continuous authentication...");
      // Clear any pending authentication
      clearAuthState();
    }
  }, [isAutoMode]);

  const initializeKiosk = async () => {
    try {
      // Fetch recent check-ins
      await fetchRecentCheckIns();
      // Fetch today's stats
      await fetchTodayStats();
    } catch (error) {
      console.error("Failed to initialize kiosk:", error);
    }
  };

  const initializeSmartAuth = async () => {
    try {
      setSensorStatus('detecting');
      console.log("🚀 Initializing smart biometric authentication...");
      
      // Listen for authentication method changes
      smartBiometricAuth.onAuthMethodChange((method) => {
        console.log("🔄 Authentication method detected:", method);
        setAuthMethod(method);
        setSensorStatus('ready');
      });
      
      // Initialize the authentication system
      const method = await smartBiometricAuth.initialize();
      console.log("✅ Smart authentication initialized:", method);
      
    } catch (error) {
      console.error("❌ Failed to initialize smart authentication:", error);
      setSensorStatus('error');
      setErrorMessage("Authentication system initialization failed");
    }
  };

  const fetchRecentCheckIns = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const response = await publicApi.get(
        `attendance_history/?date=${today}`
      );
      
      console.log("🔍 Recent check-ins raw data:", response.data);
      
      // Validate and clean the data
      const validCheckIns = (Array.isArray(response.data) ? response.data : []).slice(0, 4).map(checkIn => {
        // Combine date and time if they're separate
        let fullDateTime = checkIn.check_in_datetime || checkIn.check_in_time;
        
        if (!fullDateTime && checkIn.date && checkIn.check_in_time) {
          // If we have separate date and time, combine them
          if (checkIn.check_in_time.match(/^\d{2}:\d{2}:\d{2}$/)) {
            fullDateTime = `${checkIn.date}T${checkIn.check_in_time}`;
          }
        }
        
        return {
          ...checkIn,
          check_in_datetime: fullDateTime || new Date().toISOString(),
          member_name: checkIn.member_name || "Unknown Member",
          member_id: checkIn.member_id || "N/A",
          verification_method: checkIn.verification_method || "Manual"
        };
      });
      
      console.log("🔍 Processed check-ins:", validCheckIns);
      setRecentCheckIns(validCheckIns);
      
    } catch (error) {
      console.error("Error fetching recent check-ins:", error);
      setRecentCheckIns([]);
    }
  };

  const fetchTodayStats = async () => {
    try {
      console.log("🔍 Fetching today's stats...");
      
      // Use public endpoint - no authentication needed
      const response = await publicApi.get('/today_stats/');
      
      console.log("📊 Stats response:", response.data);
      
      setStats({
        todayCount: response.data.todayCount || 0,
        totalMembers: response.data.totalMembers || 0,
      });
      
      console.log(`📊 Stats updated: ${response.data.todayCount} check-ins, ${response.data.totalMembers} total members`);
      
    } catch (error) {
      console.error("❌ Error fetching stats:", error);
      setStats({
        todayCount: 0,
        totalMembers: 0,
      });
    }
  };

  const checkWebAuthnSupport = () => {
    if (!isWebAuthnSupported()) {
      setErrorMessage(
        "Fingerprint authentication not supported on this device"
      );
      return false;
    }
    return true;
  };

  const startAutomaticAuthentication = async (autoModeOverride = null) => {
    const effectiveAutoMode = autoModeOverride !== null ? autoModeOverride : isAutoMode;
    console.log("startAutomaticAuthentication called", {
      effectiveAutoMode,
      autoModeOverride,
    });

    // Check WebAuthn support first
    if (!checkWebAuthnSupport()) {
      console.log("WebAuthn not supported");
      return;
    }

    // Don't start if already processing, welcome message showing, or auto mode disabled
    if (
      isAuthenticatingRef.current ||
      isProcessing ||
      welcomeMessage ||
      !effectiveAutoMode
    ) {
      console.log("Skipping authentication - conditions not met");
      return;
    }

    // Check if user recently cancelled
    const now = Date.now();
    if (lastCancelTimeRef.current && now - lastCancelTimeRef.current < 30000) {
      console.log("Recent cancellation detected, staying in manual mode");
      return;
    }

    try {
      isAuthenticatingRef.current = true;
      setIsProcessing(true);
      setErrorMessage(null);

      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();

      // Use simplified kiosk authentication
      const assertion = await kioskAuthenticate(abortControllerRef.current.signal);

      // Send assertion to backend for member identification - USE PUBLIC API
      const response = await publicApi.post("webauthn/kiosk/checkin/", {
        assertion: assertion,
      });

      handleSuccessfulCheckIn(response.data);
      cancelCountRef.current = 0;
      
    } catch (error) {
      // Handle errors without token refresh attempts
      if (error.name === "NotAllowedError") {
        console.log("User cancelled fingerprint authentication");
        lastCancelTimeRef.current = Date.now();
        cancelCountRef.current++;
        showTemporaryError("Authentication cancelled - Auto mode still active");
      } else if (error.name === "AbortError") {
        console.log("Authentication was aborted");
      } else {
        console.error("Fingerprint detection error:", error);
        if (error.response?.status === 404) {
          showTemporaryError("Fingerprint not recognized. Please register first.");
        } else {
          showTemporaryError("Check-in failed. Please try again.");
        }
      }
    } finally {
      setIsProcessing(false);
      isAuthenticatingRef.current = false;
      abortControllerRef.current = null;
    }
  };

  const enableAutoMode = () => {
    console.log("Enabling auto mode...");
    setIsAutoMode(true);
    localStorage.setItem("kioskAutoMode", "true");
    setErrorMessage(null);
    // The useEffect for isAutoMode will now handle starting continuous authentication
  };

  const disableAutoMode = () => {
    console.log("Disabling auto mode...");
    setIsAutoMode(false);
    localStorage.setItem("kioskAutoMode", "false");
    setErrorMessage(null);
    // The useEffect for isAutoMode will now handle stopping continuous authentication
  };

  const startContinuousAuthentication = async (
    forceStart = false,
    autoModeOverride = null
  ) => {
    const effectiveAutoMode =
      autoModeOverride !== null ? autoModeOverride : isAutoMode;
    console.log(
      "startContinuousAuthentication called, forceStart:",
      forceStart,
      "isAutoMode:",
      isAutoMode,
      "effectiveAutoMode:",
      effectiveAutoMode
    );

    // Only run if auto mode is enabled (or forced) and we're not already processing
    if (
      (!effectiveAutoMode && !forceStart) ||
      isAuthenticatingRef.current ||
      isProcessing ||
      welcomeMessage
    ) {
      console.log("Skipping authentication - conditions not met");
      return;
    }

    // Check for recent cancellations - just wait, don't disable auto mode
    const now = Date.now();
    if (lastCancelTimeRef.current && now - lastCancelTimeRef.current < 5000) {
      console.log("Recent cancellation detected, waiting before retry");
      // Schedule next attempt after the cooldown period
      authTimeoutRef.current = setTimeout(
        () => startContinuousAuthentication(false, effectiveAutoMode),
        5000
      );
      return;
    }

    console.log("Starting smart biometric authentication...");
    await startSmartAuthentication(effectiveAutoMode);
  };

  const startSmartAuthentication = async (effectiveAutoMode) => {
    try {
      isAuthenticatingRef.current = true;
      setIsProcessing(true);
      setErrorMessage(null);

      // Use smart biometric authentication
      const result = await smartBiometricAuth.startKioskAuthentication(
        handleSuccessfulCheckIn,
        (error) => {
          console.error("Smart authentication error:", error);
          if (error.name === "NotAllowedError") {
            console.log("User cancelled authentication");
            lastCancelTimeRef.current = Date.now();
            cancelCountRef.current++;
            showTemporaryError("Authentication cancelled - Auto mode still active");
          } else if (error.name === "AbortError") {
            console.log("Authentication was aborted");
          } else {
            console.error("Authentication error:", error);
            showTemporaryError("Authentication failed. Please try again.");
          }
          
          // Retry if still in auto mode
          if (effectiveAutoMode) {
            authTimeoutRef.current = setTimeout(
              () => startContinuousAuthentication(false, effectiveAutoMode),
              3000
            );
          }
        }
      );

      console.log("Smart authentication result:", result);

    } catch (error) {
      console.error("Failed to start smart authentication:", error);
      setErrorMessage("Authentication system error");
    } finally {
      setIsProcessing(false);
      isAuthenticatingRef.current = false;
    }
  };

  const handleFingerprintClick = async () => {
    // Check WebAuthn support first
    if (!checkWebAuthnSupport()) {
      return;
    }

    // Prevent multiple concurrent authentication requests
    if (isAuthenticatingRef.current || isProcessing) {
      console.log("Authentication already in progress, skipping...");
      return;
    }

    // Cancel any existing authentication request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    try {
      isAuthenticatingRef.current = true;
      setIsProcessing(true);
      setErrorMessage(null);

      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();

      // Use simplified kiosk authentication (prompts for any registered fingerprint)
      const assertion = await kioskAuthenticate(
        abortControllerRef.current.signal
      );

      // Send assertion to backend for member identification
      // --- CHANGE: Use publicApi ---
      const response = await publicApi.post("webauthn/kiosk/checkin/", {
        assertion: assertion,
      });

      handleSuccessfulCheckIn(response.data);
    } catch (error) {
      // Handle different types of errors gracefully
      if (error.name === "NotAllowedError") {
        console.log("User cancelled or denied fingerprint authentication");
        // Don't show error for user cancellation - just stop processing
      } else if (error.name === "AbortError") {
        console.log("Authentication was aborted");
        // Don't show error for abort - just stop processing
      } else if (
        error.name === "InvalidStateError" ||
        error.message?.includes("already pending")
      ) {
        console.log("Authentication request already pending, skipping...");
        // Don't show error for pending requests
      } else {
        console.error("Fingerprint detection error:", error);
        console.error("Error details:", error.response?.data);

        if (error.response?.status === 404) {
          showTemporaryError(
            "Fingerprint not recognized. Please register first."
          );
        } else if (error.response?.data?.error) {
          showTemporaryError(error.response.data.error);
        } else {
          showTemporaryError("Check-in failed. Please try again.");
        }
      }
    } finally {
      setIsProcessing(false);
      isAuthenticatingRef.current = false;
      abortControllerRef.current = null;
    }
  };

  const clearAuthState = () => {
    // Clear any existing timeout
    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current);
      authTimeoutRef.current = null;
    }

    // Cancel any existing authentication request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const handleSuccessfulCheckIn = (data) => {
    const { member, already_checked_in } = data;
    
    // Keep PIN mode visible after successful check-in
    // setShowPinMode(false); // Removed this line

    if (already_checked_in) {
      setWelcomeMessage({
        type: "already_checked_in",
        member: member,
        message: `Welcome back, ${member.name}!`,
        submessage: "You already checked in today",
      });
    } else {
      setWelcomeMessage({
        type: "success",
        member: member,
        message: `Welcome, ${member.name}!`,
        submessage: "Check-in successful",
      });
    }

    // Refresh data
    fetchRecentCheckIns();
    fetchTodayStats();

    // Clear any pending authentication while showing message
    clearAuthState();

    // Clear message after 4 seconds and restart automatic authentication if in auto mode
    checkInTimeoutRef.current = setTimeout(() => {
      setWelcomeMessage(null);
      // Only restart continuous authentication if auto mode is still enabled
      if (isAutoMode) {
        // Check isAutoMode state directly
        startContinuousAuthentication(false, true); // Pass true to ensure it restarts in auto mode
      }
    }, 4000);
  };

  const showTemporaryError = (message) => {
    // Clear any pending authentication while showing error
    clearAuthState();

    setErrorMessage(message);
    setTimeout(() => {
      setErrorMessage(null);
    }, 3000);
  };

  const formatTime = (dateTimeString) => {
    if (!dateTimeString) return "No time";
    
    try {
      // Handle different date formats
      let dateObj;
      
      if (typeof dateTimeString === 'string') {
        // If it's just a time string like "04:43:22"
        if (dateTimeString.match(/^\d{2}:\d{2}:\d{2}$/)) {
          const today = new Date().toISOString().split('T')[0];
          dateObj = new Date(`${today}T${dateTimeString}`);
        } 
        // If it's a full ISO string
        else if (dateTimeString.includes('T')) {
          dateObj = new Date(dateTimeString);
        }
        // If it's a date string, combine with current time
        else {
          dateObj = new Date(dateTimeString);
        }
      } else {
        dateObj = new Date(dateTimeString);
      }
      
      if (isNaN(dateObj.getTime())) {
        console.error("Invalid date:", dateTimeString);
        return "Invalid time";
      }
      
      return dateObj.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      console.error("Time formatting error:", error, "Input:", dateTimeString);
      return "Invalid time";
    }
  };

  const formatDateDisplay = (dateString) => {
    if (!dateString) return "No date";
    
    try {
      const dateObj = new Date(dateString);
      if (isNaN(dateObj.getTime())) {
        console.error("Invalid date:", dateString);
        return "Invalid date";
      }
      
      return dateObj.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      console.error("Date formatting error:", error, "Input:", dateString);
      return "Invalid date";
    }
  };

  return (
    <div className="kiosk-container min-h-screen bg-gradient-to-br from-gray-900/80 via-black/90 to-gray-900/80 text-white overflow-hidden">
      {/* Header */}
      <div className="kiosk-header bg-gray-900/80 backdrop-blur-md px-4 sm:px-8 py-3 sm:py-4 border-b border-yellow-500/20">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
          <div className="text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
              Atalan Fitness Club
            </h1>
            <p className="text-sm sm:text-base text-gray-300">
              Attendance Kiosk
            </p>
          </div>
          <div className="text-center sm:text-right">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
              {formatTime(currentTime)}
            </div>
            <div className="text-xs sm:text-sm lg:text-base text-gray-300">
              {formatDateDisplay(currentTime)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="kiosk-main flex flex-col lg:flex-row min-h-[calc(100vh-120px)] h-auto">
        {/* Left Side - Check-in Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            {welcomeMessage ? (
              <motion.div
                key="welcome"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="text-center"
              >
                <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg border-2 border-yellow-400/50">
                  <i className="bx bx-check text-6xl text-white"></i>
                </div>
                <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 text-center ${
                  welcomeMessage.member?.wrong_time_access ? 'text-yellow-400' : 'bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent'
                }`}>
                  {welcomeMessage.member?.wrong_time_access ? 'Access Granted (Wrong Time)' : welcomeMessage.message}
                </h2>
                <p className="text-lg sm:text-xl text-gray-300 text-center">
                  {welcomeMessage.submessage}
                </p>
                <div className="mt-4 text-gray-200">
                  <p>Member ID: {welcomeMessage.member.athlete_id}</p>
                  {welcomeMessage.member?.time_slot && (
                    <p className="text-sm text-gray-300 mt-1">
                      Time Slot: {welcomeMessage.member.time_slot} ({welcomeMessage.member.allowed_time})
                    </p>
                  )}
                </div>
                {welcomeMessage.member?.wrong_time_access && (
                  <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
                    <p className="text-yellow-300 text-sm">
                      ⚠️ Check-in outside registered time slot
                    </p>
                    <p className="text-yellow-300 text-xs mt-1">
                      Security photo captured for verification
                    </p>
                  </div>
                )}
              </motion.div>
            ) : errorMessage ? (
              <motion.div
                key="error"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="text-center"
              >
                <div className="w-32 h-32 mx-auto mb-6 bg-red-500 rounded-full flex items-center justify-center">
                  <i className="bx bx-x text-6xl text-white"></i>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-red-400 text-center">
                  Error
                </h2>
                <p className="text-lg sm:text-xl text-red-200 text-center px-4">
                  {errorMessage}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="waiting"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="text-center"
              >
                <motion.div
                  animate={
                    isProcessing
                      ? { scale: [1, 1.1, 1] }
                      : { scale: [1, 1.05, 1] }
                  }
                  transition={{
                    repeat: Infinity,
                    duration: isProcessing ? 1.5 : 3,
                  }}
                  onClick={() =>
                    !isProcessing && !isAutoMode && handleFingerprintClick()
                  }
                  className={`w-32 h-32 sm:w-36 sm:h-36 lg:w-40 lg:h-40 mx-auto mb-6 sm:mb-8 rounded-full flex items-center justify-center ${
                    isProcessing
                      ? "bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg border-2 border-yellow-400/50"
                      : "bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg border-2 border-yellow-400/50"
                  } ${
                    !isProcessing && !isAutoMode
                      ? "cursor-pointer hover:from-yellow-500 hover:to-yellow-700"
                      : ""
                  }`}
                >
                  <i
                    className={`bx bx-fingerprint text-6xl sm:text-7xl lg:text-8xl text-white ${
                      isProcessing ? "animate-pulse" : ""
                    }`}
                  ></i>
                </motion.div>

                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                  {isProcessing ? "Processing..." : "Touch to Check In"}
                </h2>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 text-center px-4">
                  {isProcessing
                    ? "Verifying your fingerprint..."
                    : "Place your finger on the sensor to check in"}
                </p>
                
                {/* Authentication Method Status */}
                {authMethod && (
                  <div className="mt-4 px-4 py-2 bg-gray-800/60 rounded-lg border border-yellow-500/30">
                    <div className="text-sm text-gray-300">
                      <span className="text-yellow-400">📡 </span>
                      Active: {authMethod.name}
                      {authMethod.type === 'external_sensor' && (
                        <span className="ml-2 text-green-400">✅ External Sensor Detected</span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Sensor Status */}
                {sensorStatus === 'detecting' && (
                  <div className="mt-2 text-sm text-yellow-400 animate-pulse">
                    🔍 Detecting sensors...
                  </div>
                )}
                {sensorStatus === 'error' && (
                  <div className="mt-2 text-sm text-red-400">
                    ⚠️ Sensor detection failed
                  </div>
                )}
                
                {/* PIN Mode Toggle */}
                <div className="mt-6">
                  <button
                    onClick={() => setShowPinMode(!showPinMode)}
                    className="text-yellow-400 hover:text-yellow-300 text-lg font-medium"
                  >
                    {showPinMode ? 'Use Fingerprint' : 'Use PIN Instead'}
                  </button>
                </div>

                {/* Always show disable button when auto mode is active */}
                {isAutoMode && isProcessing && (
                  <motion.div className="text-center mt-4 mb-4">
                    <motion.button
                      onClick={disableAutoMode}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl text-base sm:text-lg font-semibold shadow-lg transition-colors"
                    >
                      <i className="bx bx-x text-lg sm:text-xl mr-1 sm:mr-2"></i>
                      <span className="hidden sm:inline">
                        Disable Auto Mode
                      </span>
                      <span className="sm:hidden">Stop Auto</span>
                    </motion.button>
                  </motion.div>
                )}

                {/* Show PIN input or fingerprint controls */}
                <AnimatePresence mode="wait">
                  {showPinMode ? (
                    <motion.div 
                      key="pin-mode"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      className="mt-8"
                    >
                      <PinCheckIn
                        onSuccess={handleSuccessfulCheckIn}
                        onError={showTemporaryError}
                      />
                    </motion.div>
                  ) : (
                  !isProcessing ? (
                    <motion.div 
                      key="fingerprint-mode"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      className="mt-4 sm:mt-8 mb-8"
                    >
                      {isAutoMode ? (
                        <motion.div className="text-center">
                          <motion.div
                            animate={{ opacity: [0.7, 1, 0.7] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="mb-4"
                          >
                            <i className="bx bx-wifi text-3xl text-yellow-400 mb-2"></i>
                            <p className="text-lg text-yellow-400 font-semibold">
                              Auto mode - Listening for fingerprint...
                            </p>
                          </motion.div>
                          <motion.button
                            onClick={disableAutoMode}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl text-base sm:text-lg font-semibold shadow-lg transition-colors"
                          >
                            <i className="bx bx-x text-lg sm:text-xl mr-1 sm:mr-2"></i>
                            <span className="hidden sm:inline">
                              Disable Auto Mode
                            </span>
                            <span className="sm:hidden">Stop Auto</span>
                          </motion.button>
                        </motion.div>
                      ) : (
                        <motion.div className="text-center">
                          <motion.button
                            onClick={enableAutoMode}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black px-8 py-4 rounded-xl text-xl font-semibold shadow-lg transition-all duration-200 mb-4"
                          >
                            <i className="bx bx-fingerprint text-2xl mr-2"></i>
                            Enable Auto Sensor
                          </motion.button>
                          <p className="text-sm text-gray-300">
                            or manually touch the sensor above
                          </p>
                        </motion.div>
                      )}

                      <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 3, delay: 1 }}
                        className="mt-6"
                      >
                        <i className="bx bx-down-arrow-alt text-4xl text-gray-200"></i>
                      </motion.div>
                    </motion.div>
                  ) : null
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Side - Stats & Recent Check-ins */}
        <div className="w-full lg:w-96 bg-gray-900/80 backdrop-blur-md p-4 sm:p-6 border-t lg:border-t-0 lg:border-l border-yellow-500/20">
          {/* Today's Stats */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
              Today's Stats
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4">
              <div className="bg-gray-800/60 backdrop-blur-md rounded-lg p-3 sm:p-4 border border-yellow-500/30">
                <div className="text-xl sm:text-2xl font-bold text-white">
                  {stats.todayCount}
                </div>
                <div className="text-sm sm:text-base text-gray-300">
                  Check-ins Today
                </div>
              </div>
              <div className="bg-gray-800/60 backdrop-blur-md rounded-lg p-3 sm:p-4 border border-yellow-500/30">
                <div className="text-xl sm:text-2xl font-bold text-white">
                  {stats.totalMembers}
                </div>
                <div className="text-sm sm:text-base text-gray-300">
                  Total Members
                </div>
              </div>
            </div>
          </div>

          {/* Recent Check-ins */}
          <div>
            <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
              Recent Check-ins
            </h3>
            <div className="space-y-2 sm:space-y-3 max-h-64 sm:max-h-96 overflow-y-auto">
              {recentCheckIns.length === 0 ? (
                <div className="text-gray-400 text-center py-8">
                  <i className="bx bx-time text-3xl mb-2"></i>
                  <p>No check-ins yet today</p>
                </div>
              ) : (
                recentCheckIns.map((checkIn, index) => (
                  <motion.div
                    key={checkIn.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gray-800/60 backdrop-blur-md rounded-lg p-2 sm:p-3 border border-yellow-500/30"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-0">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-white text-sm sm:text-base truncate">
                          {checkIn.member_name}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-300">
                          ID: {checkIn.member_id}
                        </div>
                      </div>
                      <div className="text-left sm:text-right flex-shrink-0">
                        <div className="text-xs sm:text-sm font-medium text-white">
                          {formatTime(checkIn.check_in_datetime)}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-300">
                          {checkIn.verification_method}
                          {checkIn.has_photo && (
                            <span className="text-green-400" title="Photo verified">
                              📷
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="kiosk-footer bg-gray-800/80 backdrop-blur-md px-4 sm:px-8 py-2 text-center border-t border-yellow-500/20">
        <p className="text-xs sm:text-sm text-gray-400">
          <span className="hidden sm:inline">
            Kiosk Mode <span className="text-yellow-500">Active</span> • WebAuthn Fingerprint Authentication
            •
          </span>
          <span className="sm:hidden">Kiosk Active •</span>
          {isProcessing ? " Processing..." : " Ready for Check-in"}
        </p>
      </div>
    </div>
  );
};

export default KioskCheckIn;












