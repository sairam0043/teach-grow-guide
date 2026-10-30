import React, { useState } from 'react';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, Check, Search, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface CurrencySelectorProps {
  mode?: 'desktop' | 'mobile';
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({ mode = 'desktop' }) => {
  const { currentCurrency, currencyInfo, setCurrency, allCurrencies } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCurrencies = allCurrencies.filter(
    (c) =>
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.countryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-9 gap-1.5 border-border/80 font-medium transition-all text-foreground hover:text-foreground hover:bg-secondary focus:text-foreground focus-visible:ring-1 focus-visible:ring-primary active:bg-secondary/90 ${
            mode === 'mobile' ? 'w-full justify-between' : 'px-2.5'
          }`}
          title="Select display currency"
        >
          <span className="flex items-center gap-1.5 text-foreground">
            <span className="text-base leading-none select-none">{currencyInfo.flag}</span>
            <span className="text-xs font-semibold text-foreground">{currencyInfo.code}</span>
            <span className="text-xs text-foreground/75 font-normal">({currencyInfo.symbol})</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-foreground/70 transition-transform" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={mode === 'mobile' ? 'center' : 'end'}
        className="w-72 p-2 shadow-xl border-border/80 max-h-96 overflow-hidden flex flex-col z-50 bg-popover text-popover-foreground"
      >
        <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5 text-primary" /> Select Country & Currency
        </DropdownMenuLabel>

        {/* Search filter inside dropdown */}
        <div className="relative px-1 pb-2">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search currency or country..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 pl-8 text-xs bg-secondary/50 border-input text-foreground placeholder:text-muted-foreground"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>

        <DropdownMenuSeparator />

        <div className="overflow-y-auto max-h-64 pr-1 space-y-0.5">
          {filteredCurrencies.map((c) => {
            const isSelected = c.code === currentCurrency;
            return (
              <DropdownMenuItem
                key={c.code}
                onClick={() => setCurrency(c.code)}
                className={`flex items-center justify-between px-2.5 py-2 cursor-pointer rounded-md text-xs transition-colors ${
                  isSelected
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-foreground hover:bg-secondary hover:text-foreground focus:bg-secondary focus:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className="text-base select-none">{c.flag}</span>
                  <div className="flex flex-col truncate">
                    <span className="text-xs font-medium truncate text-foreground">
                      {c.countryName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {c.code} ({c.symbol}) · {c.marketSegment}
                    </span>
                  </div>
                </div>
                {isSelected && <Check className="h-4 w-4 text-primary shrink-0 ml-2" />}
              </DropdownMenuItem>
            );
          })}

          {filteredCurrencies.length === 0 && (
            <div className="py-4 text-center text-xs text-muted-foreground">
              No matching currencies found
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CurrencySelector;
