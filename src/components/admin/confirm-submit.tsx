"use client";

import { Button } from "@/components/ui/button";

/** Submit button that asks for confirmation before the form's server action runs. */
export function ConfirmSubmit({
  message,
  children,
  variant = "destructive",
  className,
}: {
  message: string;
  children: React.ReactNode;
  variant?: "destructive" | "outline" | "default";
  className?: string;
}) {
  return (
    <Button
      type="submit"
      variant={variant}
      size="lg"
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </Button>
  );
}
