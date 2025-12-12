"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export function PinInput({ length = 6, onComplete, error = false }) {
  const [values, setValues] = useState(Array(length).fill(""));
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index, value) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;
    if (hasSubmitted) return; // Prevent changes after submission

    const newValues = [...values];
    newValues[index] = value;
    setValues(newValues);

    // Move to next input
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if complete
    if (newValues.every((v) => v !== "") && !hasSubmitted) {
      setHasSubmitted(true);
      onComplete?.(newValues.join(""));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (values[index]) {
        const newValues = [...values];
        newValues[index] = "";
        setValues(newValues);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newValues = [...values];
        newValues[index - 1] = "";
        setValues(newValues);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    if (hasSubmitted) return;

    const pastedData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);

    if (pastedData) {
      const newValues = Array(length).fill("");
      pastedData.split("").forEach((char, i) => {
        if (i < length) newValues[i] = char;
      });
      setValues(newValues);

      // Focus appropriate input
      const nextEmptyIndex = newValues.findIndex((v) => v === "");
      if (nextEmptyIndex !== -1) {
        inputRefs.current[nextEmptyIndex]?.focus();
      } else {
        inputRefs.current[length - 1]?.focus();
        if (!hasSubmitted) {
          setHasSubmitted(true);
          onComplete?.(newValues.join(""));
        }
      }
    }
  };

  const reset = () => {
    setValues(Array(length).fill(""));
    setHasSubmitted(false);
    inputRefs.current[0]?.focus();
  };

  // Reset on error
  useEffect(() => {
    if (error) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  return (
    <div className="flex gap-3 justify-center">
      {values.map((value, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className={cn(
            "w-12 h-14 text-center text-2xl font-semibold rounded-lg border-2",
            "bg-background transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
            "pin-input",
            error
              ? "border-destructive animate-shake"
              : value
                ? "border-primary"
                : "border-input",
          )}
        />
      ))}
    </div>
  );
}

export default PinInput;
