import { StatusShell } from "@/components/status/status-shell";

export default function StatusLayout({ children }: LayoutProps<"/">) {
  return <StatusShell>{children}</StatusShell>;
}
