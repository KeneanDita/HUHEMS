"use client";

import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";

export function BackButton({
  fallbackHref = "/",
  children = "Back",
  ...props
}: ComponentProps<typeof Button> & { fallbackHref?: string }) {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant={props.variant ?? "outline"}
      {...props}
      onClick={(e) => {
        props.onClick?.(e);
        if (e.defaultPrevented) return;

        // Prefer history back for faster navigation.
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }

        router.push(fallbackHref);
      }}
    >
      {children}
    </Button>
  );
}
