import { forwardRef } from "react";
import { RiSettingsLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";

export const AccountSettingsTrigger = forwardRef(function AccountSettingsTrigger(
  { className = "", ...props },
  ref
) {
  return (
    <Button
      ref={ref}
      {...props}
      type="button"
      variant="secondary"
      aria-label="Account settings"
      title="Account settings"
      className={`h-9 w-full justify-start gap-2 rounded-lg border border-border bg-background px-3 text-foreground shadow-none hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] ${className}`}
    >
      <RiSettingsLine className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>Account settings</span>
    </Button>
  );
});
