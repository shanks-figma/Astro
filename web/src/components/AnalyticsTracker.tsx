"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageView } from "../utils/analytics";

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      let fullPath = pathname;
      if (searchParams && searchParams.toString()) {
        fullPath += `?${searchParams.toString()}`;
      }
      trackPageView(fullPath);
    }
  }, [pathname, searchParams]);

  return null;
}
