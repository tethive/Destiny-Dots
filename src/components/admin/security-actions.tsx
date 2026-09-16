"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { revokeAdminSession } from "@/server/actions/admin";

export function RevokeSessionButton({ sessionId }: { sessionId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        confirm("Sign this session out? If it's your current device you'll be logged out.") &&
        start(async () => {
          const res = await revokeAdminSession(sessionId);
          if (!res.ok) toast.error(res.error);
          else toast.success(res.message);
          router.refresh();
        })
      }
    >
      {pending ? <LoaderCircle className="animate-spin" /> : <LogOut />} Sign out
    </Button>
  );
}
