import React from 'react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { X, Sparkles } from 'lucide-react';
import CurrencySelector from './CurrencySelector';

export const CurrencyBanner: React.FC = () => {
  const { isAutoDetected, currencyInfo, dismissAutoDetectBanner } = useCurrency();

  if (!isAutoDetected) return null;

  return (
    <div className="bg-primary/10 border-b border-primary/20 text-foreground py-1.5 px-3 text-xs transition-all animate-in fade-in">
      <div className="container flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>
            Showing localized pricing in <strong>{currencyInfo.code} ({currencyInfo.symbol})</strong> for students in <strong>{currencyInfo.countryName}</strong>.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CurrencySelector />
          <button
            onClick={dismissAutoDetectBanner}
            className="p-1 hover:bg-primary/20 rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Dismiss"
            aria-label="Dismiss banner"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CurrencyBanner;

