"use client";

import { SessionProvider } from "next-auth/react";
import { PopupProvider } from "@/components/Popup";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PopupProvider>{children}</PopupProvider>
    </SessionProvider>
  );
}
