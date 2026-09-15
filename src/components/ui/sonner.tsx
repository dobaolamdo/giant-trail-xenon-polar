import type { ComponentProps } from "react";
import { Toaster as Sonner } from "sonner";

function Toaster(props: ComponentProps<typeof Sonner>) {
  return (
    <Sonner
      theme="dark"
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "bg-surface text-fg shadow-[var(--shadow-border)] border-0 font-[family-name:var(--font-sans)]",
          title: "text-fg tracking-wide",
          description: "text-muted",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
