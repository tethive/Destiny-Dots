import type { Metadata } from "next";
import { Wrench } from "lucide-react";
import { StatusScreen } from "@/components/status/status-screen";
import { redirect } from "next/navigation";
import { contactConfig } from "@/lib/site";

export const metadata: Metadata = { title: "Down for maintenance", robots: { index: false } };

export default function MaintenancePage() {
  if (process.env.MAINTENANCE_MODE !== "1") redirect("/");
  return (
    <StatusScreen
      tone="info"
      icon={Wrench}
      code="Scheduled maintenance"
      title="We're making Destiny Dots better"
      description={`The site is briefly offline for an upgrade. Your progress, purchases and data are safe. Please check back shortly — questions? ${contactConfig.email}`}
    />
  );
}
