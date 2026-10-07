import React, { useState, useEffect } from "react";
import { AlertTriangle, RefreshCw, X } from "lucide-react";
import axios from "axios";
import API_URL from "@/config/api";

interface InternetConnectionAlertProps {
  /**
   * If true, forces the alert to be visible regardless of browser status.
   */
  forceShow?: boolean;
  /**
   * Optional custom position styling. Defaults to top centered toast/banner.
   */
  position?: "top" | "bottom" | "modal" | "inline";
  /**
   * Callback fired when connection status changes or user manually retries.
   */
  onStatusChange?: (isOnline: boolean) => void;
  /**
   * Allow user to close the alert banner.
   */
  dismissible?: boolean;
}

export const InternetConnectionAlert: React.FC<InternetConnectionAlertProps> = ({
  forceShow = false,
  position = "top",
  onStatusChange,
  dismissible = true,
}) => {
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [lastCheckFailed, setLastCheckFailed] = useState<boolean>(false);

  // Check network & server health
  const verifyConnection = async (): Promise<boolean> => {
    if (!navigator.onLine) {
      return false;
    }
    try {
      // Ping backend endpoint with short timeout
      await axios.get(`${API_URL}/health`, { timeout: 4000 });
      return true;
    } catch {
      // Even if backend fails, check if basic internet is active via fetch
      try {
        await fetch("https://www.google.com/generate_204", {
          mode: "no-cors",
          cache: "no-cache",
        });
        return true;
      } catch {
        return false;
      }
    }
  };

  const checkConnection = async () => {
    setIsChecking(true);
    const online = await verifyConnection();
    setIsChecking(false);

    if (online) {
      setIsOffline(false);
      setIsDismissed(false);
      setLastCheckFailed(false);
      if (onStatusChange) onStatusChange(true);
    } else {
      setIsOffline(true);
      setLastCheckFailed(true);
      if (onStatusChange) onStatusChange(false);
    }
  };

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setIsDismissed(false);
      if (onStatusChange) onStatusChange(false);
    };

    const handleOnline = () => {
      checkConnection();
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const shouldDisplay = (isOffline || forceShow) && !isDismissed;

  if (!shouldDisplay) return null;

  // Banner card content matching exact screenshot design with maximum contrast & bold text
  const AlertCard = (
    <div
      role="alert"
      className="bg-[#FFF9EA] border-2 border-[#EAD595] text-black rounded-2xl p-4 sm:p-5 shadow-2xl max-w-lg w-full flex items-start gap-4 transition-all duration-300 relative animate-in fade-in slide-in-from-top-4"
    >
      {/* Warning Triangle Icon */}
      <div className="shrink-0 mt-0.5">
        <AlertTriangle className="w-8 h-8 text-[#D97706] stroke-[2.5]" />
      </div>

      {/* Main Text Content */}
      <div className="flex-1 pr-6 sm:pr-2">
        <h3 className="font-extrabold text-base sm:text-lg text-black leading-tight mb-1 tracking-tight">
          Computer not connected
        </h3>
        <p className="text-sm sm:text-base text-black leading-normal font-bold">
          Make sure your computer has an active internet connection.{" "}
          <button
            type="button"
            onClick={checkConnection}
            disabled={isChecking}
            className="font-black text-[#15803D] hover:text-[#166534] hover:underline focus:outline-none transition-colors cursor-pointer inline-flex items-center gap-1 disabled:opacity-60 ml-0.5"
          >
            {isChecking ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin stroke-[2.5]" />
                <span>Reconnecting...</span>
              </>
            ) : (
              <span>Reconnect</span>
            )}
          </button>
        </p>

        {lastCheckFailed && !isChecking && (
          <p className="text-xs text-red-700 mt-1.5 font-extrabold">
            Connection attempt failed. Please check your network connection and try again.
          </p>
        )}
      </div>

      {/* Optional Close Button */}
      {dismissible && (
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="absolute top-3.5 right-3.5 text-gray-600 hover:text-black p-1 rounded-lg hover:bg-black/10 transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>
      )}
    </div>
  );

  if (position === "inline") {
    return AlertCard;
  }

  if (position === "modal") {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
        {AlertCard}
      </div>
    );
  }

  if (position === "bottom") {
    return (
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] px-4 w-full flex justify-center">
        {AlertCard}
      </div>
    );
  }

  // Default: floating top banner
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] px-4 w-full flex justify-center">
      {AlertCard}
    </div>
  );
};

export default InternetConnectionAlert;
