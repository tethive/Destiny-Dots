"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button variant="outline" size="lg" className="rounded-full" onClick={() => window.print()}>
      <Printer data-icon="inline-start" /> Print
    </Button>
  );
}
