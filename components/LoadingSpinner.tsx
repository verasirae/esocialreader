import React from "react";

interface LoadingSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

export default function LoadingSpinner({ size = "md", className = "" }: LoadingSpinnerProps) {
  // Sizing definitions preserving the user's border ratios and classes
  let sizeClasses = "h-10 w-10 border-b-2";
  if (size === "xs") {
    sizeClasses = "h-3.5 w-3.5 border-b";
  } else if (size === "sm") {
    sizeClasses = "h-6 w-6 border-b-2";
  } else if (size === "lg") {
    sizeClasses = "h-14 w-14 border-b-[3px]";
  }

  return (
    <div
      className={`animate-spin text-[#1B365D] rounded-full border-b-primary ${sizeClasses} ${className}`}
    />
  );
}
