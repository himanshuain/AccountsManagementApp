"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function PasswordInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Enter password",
  error = false,
  disabled = false,
  autoFocus = true,
  showSubmitButton = true,
  submitButtonText = "Login",
  isLoading = false,
}) {
  const [showPassword, setShowPassword] = useState(false);

  const handleKeyDown = e => {
    if (e.key === "Enter" && onSubmit && value) {
      onSubmit(value);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          autoFocus={autoFocus}
          autoComplete="current-password"
          className={cn(
            "h-12 pl-10 pr-12 text-base",
            error && "border-destructive focus-visible:ring-destructive"
          )}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={() => setShowPassword(!showPassword)}
          disabled={disabled || isLoading}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>

      {showSubmitButton && (
        <Button
          className="h-12 w-full text-base font-medium"
          onClick={() => onSubmit?.(value)}
          disabled={disabled || isLoading || !value}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Verifying...
            </span>
          ) : (
            submitButtonText
          )}
        </Button>
      )}
    </div>
  );
}

export default PasswordInput;
