import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  CurrencyInfo,
  SUPPORTED_CURRENCIES,
  convertInrToCurrency,
  formatPrice as formatPriceUtil,
  detectCurrencyFromTimezone
} from '@/constants/currencyConfig';
import { useAuth } from './AuthContext';

interface CurrencyContextType {
  currentCurrency: string;
  currencyInfo: CurrencyInfo;
  setCurrency: (code: string) => void;
  formatPrice: (inrAmount: number) => string;
  convertPrice: (inrAmount: number) => number;
  allCurrencies: CurrencyInfo[];
  isAutoDetected: boolean;
  dismissAutoDetectBanner: () => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const STORAGE_KEY = 'cuvasol_currency_preference';
const BANNER_DISMISSED_KEY = 'cuvasol_currency_banner_dismissed';

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currentCurrency, setCurrentCurrencyState] = useState<string>('INR');
  const [isAutoDetected, setIsAutoDetected] = useState<boolean>(false);

  useEffect(() => {
    // 1. Check localStorage first
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_CURRENCIES[saved]) {
      setCurrentCurrencyState(saved);
      setIsAutoDetected(false);
      return;
    }

    // 2. Check user's phone dialCode if authenticated
    if (user?.phone) {
      const p = user.phone.trim();
      if (p.startsWith('+971')) { applyAutoDetected('AED'); return; }
      if (p.startsWith('+966')) { applyAutoDetected('SAR'); return; }
      if (p.startsWith('+974')) { applyAutoDetected('QAR'); return; }
      if (p.startsWith('+965')) { applyAutoDetected('KWD'); return; }
      if (p.startsWith('+968')) { applyAutoDetected('OMR'); return; }
      if (p.startsWith('+973')) { applyAutoDetected('BHD'); return; }
      if (p.startsWith('+1')) { applyAutoDetected('USD'); return; }
      if (p.startsWith('+44')) { applyAutoDetected('GBP'); return; }
      if (p.startsWith('+65')) { applyAutoDetected('SGD'); return; }
      if (p.startsWith('+60')) { applyAutoDetected('MYR'); return; }
      if (p.startsWith('+91')) { applyAutoDetected('INR'); return; }
    }

    // 3. Fallback to browser timezone
    const tzCurrency = detectCurrencyFromTimezone();
    if (tzCurrency && SUPPORTED_CURRENCIES[tzCurrency]) {
      applyAutoDetected(tzCurrency);
    }
  }, [user]);

  const applyAutoDetected = (code: string) => {
    setCurrentCurrencyState(code);
    if (code !== 'INR') {
      const isDismissed = localStorage.getItem(BANNER_DISMISSED_KEY) === 'true';
      if (!isDismissed) {
        setIsAutoDetected(true);
      }
    }
  };

  const setCurrency = (code: string) => {
    if (SUPPORTED_CURRENCIES[code]) {
      setCurrentCurrencyState(code);
      localStorage.setItem(STORAGE_KEY, code);
      setIsAutoDetected(false);
      localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
    }
  };

  const dismissAutoDetectBanner = () => {
    setIsAutoDetected(false);
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
  };

  const currencyInfo = SUPPORTED_CURRENCIES[currentCurrency] || SUPPORTED_CURRENCIES['INR'];

  const formatPrice = (inrAmount: number) => {
    return formatPriceUtil(inrAmount, currentCurrency);
  };

  const convertPrice = (inrAmount: number) => {
    return convertInrToCurrency(inrAmount, currentCurrency);
  };

  const allCurrencies = Object.values(SUPPORTED_CURRENCIES);

  return (
    <CurrencyContext.Provider
      value={{
        currentCurrency,
        currencyInfo,
        setCurrency,
        formatPrice,
        convertPrice,
        allCurrencies,
        isAutoDetected,
        dismissAutoDetectBanner
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

