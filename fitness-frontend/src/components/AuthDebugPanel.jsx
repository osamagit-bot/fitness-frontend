// components/AuthDebugPanel.jsx - Development only
import { useEffect, useState } from "react";
import authDebugger from "../authManager.jsx/authDebugger";

const AuthDebugPanel = () => {
  const [debugInfo, setDebugInfo] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const updateDebugInfo = () => {
      setDebugInfo(authDebugger.getDebugInfo());
    };

    updateDebugInfo();
    const interval = setInterval(updateDebugInfo, 1000);

    return () => clearInterval(interval);
  }, []);

  if (process.env.NODE_ENV !== "development" || !debugInfo) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-600 text-white px-3 py-1 rounded text-xs"
      >
        🔍 Auth Debug
      </button>

      {isVisible && (
        <div className="mt-2 bg-black/90 text-white p-4 rounded-lg text-xs max-w-md max-h-64 overflow-auto">
          <div className="mb-2">
            <strong>Redirect Count:</strong> {debugInfo.redirectCount}
          </div>

          <div className="mb-2">
            <strong>Current Auth:</strong>
            <pre>{JSON.stringify(debugInfo.currentAuth, null, 2)}</pre>
          </div>

          <div className="mb-2">
            <strong>Available Sessions:</strong>
            <pre>{JSON.stringify(debugInfo.availableSessions, null, 2)}</pre>
          </div>

          <div>
            <strong>Recent Logs:</strong>
            {debugInfo.recentLogs.map((log, index) => (
              <div key={index} className="text-xs mt-1">
                [{new Date(log.timestamp).toLocaleTimeString()}] {log.message}
              </div>
            ))}
          </div>

          <button
            onClick={() => authDebugger.printDebugReport()}
            className="mt-2 bg-green-600 px-2 py-1 rounded text-xs"
          >
            Print Full Report
          </button>
        </div>
      )}
    </div>
  );
};

export default AuthDebugPanel;
