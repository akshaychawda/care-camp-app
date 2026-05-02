import { ReactNode } from "react";

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center md:p-6">
      <div className="relative w-full max-w-[420px] min-h-screen md:min-h-[860px] md:rounded-[2.5rem] md:shadow-card overflow-hidden bg-background md:border md:border-border/50">
        {children}
      </div>
    </div>
  );
}
