import React, { useEffect, useState } from "react";
import { Input } from "./input";
import { Label } from "./label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import {
  COUNTRY_CODES,
  CountryCode,
  DEFAULT_COUNTRY,
  findCountryByDialCode,
  parsePhoneString,
  validatePhoneInput
} from "@/constants/countryCodes";

interface InternationalPhoneInputProps {
  id?: string;
  label?: string;
  subLabel?: string;
  required?: boolean;
  value: string;
  onChange: (fullPhone: string, isValid: boolean) => void;
  className?: string;
  disabled?: boolean;
}

export const InternationalPhoneInput: React.FC<InternationalPhoneInputProps> = ({
  id = "phone",
  label = "Phone Number",
  subLabel,
  required = true,
  value,
  onChange,
  className = "",
  disabled = false,
}) => {
  const parsed = parsePhoneString(value);
  const [dialCode, setDialCode] = useState<string>(parsed.dialCode);
  const [nationalNumber, setNationalNumber] = useState<string>(parsed.nationalNumber);
  const [country, setCountry] = useState<CountryCode>(parsed.country);
  const [touched, setTouched] = useState<boolean>(false);

  // Sync internal state if external value changes (e.g. form reset or prefill)
  useEffect(() => {
    if (value !== undefined) {
      const p = parsePhoneString(value);
      // Only sync if different to avoid typing jitter
      const currentFull = dialCode === "+" ? `+${nationalNumber}` : `${dialCode} ${nationalNumber}`.trim();
      if (value.trim() !== currentFull.trim()) {
        setDialCode(p.dialCode);
        setNationalNumber(p.nationalNumber);
        setCountry(p.country);
      }
    }
  }, [value]);

  const handleCountryChange = (newDialCode: string) => {
    setDialCode(newDialCode);
    const newCountry = findCountryByDialCode(newDialCode);
    setCountry(newCountry);
    setTouched(true);

    const validation = validatePhoneInput(newDialCode, nationalNumber);
    onChange(validation.fullPhone, validation.isValid);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTouched(true);
    let raw = e.target.value.replace(/\D/g, "");

    // If user pasted a full number with country code, e.g. 919876543210
    if (dialCode === "+91") {
      if (raw.length === 12 && raw.startsWith("91")) raw = raw.slice(2);
      if (raw.length === 11 && raw.startsWith("0")) raw = raw.slice(1);
    }

    const trimmed = raw.slice(0, country.maxLength);
    setNationalNumber(trimmed);

    const validation = validatePhoneInput(dialCode, trimmed);
    onChange(validation.fullPhone, validation.isValid);
  };

  const validation = validatePhoneInput(dialCode, nationalNumber);
  const isFilled = nationalNumber.length > 0;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-semibold text-foreground">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
        <span className="text-[11px] text-muted-foreground font-normal">
          {subLabel || `${country.flag} ${country.country}`}
        </span>
      </div>

      <div className="flex items-stretch rounded-md shadow-sm">
        {/* Country Code Selector */}
        <Select value={dialCode} onValueChange={handleCountryChange} disabled={disabled}>
          <SelectTrigger 
            className="w-[110px] sm:w-[125px] shrink-0 rounded-r-none border-r-0 focus:ring-0 focus:ring-offset-0 bg-secondary/30 hover:bg-secondary/50 font-medium text-xs sm:text-sm px-2.5 transition-colors"
            aria-label="Select country calling code"
          >
            <SelectValue>
              <span className="flex items-center gap-1.5 truncate">
                <span className="text-base leading-none">{country.flag}</span>
                <span className="font-semibold text-foreground">{dialCode}</span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[300px] w-[260px]">
            {COUNTRY_CODES.map((c) => (
              <SelectItem key={`${c.code}-${c.dialCode}`} value={c.dialCode} className="text-xs cursor-pointer py-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-base leading-none">{c.flag}</span>
                  <span className="font-bold text-foreground min-w-[42px]">{c.dialCode}</span>
                  <span className="text-muted-foreground truncate">{c.country}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* National Number Input */}
        <Input
          id={id}
          type="tel"
          required={required}
          disabled={disabled}
          maxLength={country.maxLength}
          placeholder={country.placeholder}
          value={nationalNumber}
          onChange={handleNumberChange}
          onBlur={() => setTouched(true)}
          className="rounded-l-none font-mono text-sm tracking-wide focus:z-10"
        />
      </div>

      {/* Validation micro-feedback */}
      {isFilled && (
        <p
          className={`text-[11px] transition-colors leading-tight ${
            validation.isValid
              ? "text-emerald-600 dark:text-emerald-400 font-medium"
              : touched && nationalNumber.length >= 2
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground"
          }`}
        >
          {validation.isValid ? (
            <span>✓ Valid {country.country} mobile number</span>
          ) : (
            <span>
              Expected: {country.formatHint} ({nationalNumber.length}/{country.maxLength} digits)
            </span>
          )}
        </p>
      )}
    </div>
  );
};
