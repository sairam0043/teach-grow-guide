import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  const innerRef = React.useRef<HTMLDivElement>(null);
  React.useImperativeHandle(ref, () => innerRef.current!);

  React.useEffect(() => {
    const container = innerRef.current;
    if (!container) return;

    const scrollActiveIntoView = () => {
      // Only scroll if the container is horizontally scrollable
      if (container.scrollWidth <= container.clientWidth) return;

      const activeEl = container.querySelector<HTMLElement>('[data-state="active"]');
      if (activeEl) {
        const triggerLeft = activeEl.offsetLeft;
        const triggerWidth = activeEl.offsetWidth;
        const containerWidth = container.clientWidth;

        // Calculate offset to center the active trigger inside the container
        const targetScrollLeft = triggerLeft - containerWidth / 2 + triggerWidth / 2;

        if (typeof container.scrollTo === "function") {
          container.scrollTo({
            left: Math.max(0, targetScrollLeft),
            behavior: "smooth",
          });
        } else {
          container.scrollLeft = Math.max(0, targetScrollLeft);
        }
      }
    };

    // Scroll active trigger into view on initial mount / render
    const timer = setTimeout(scrollActiveIntoView, 60);

    // Observe changes to data-state attribute on children (when active tab changes)
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.attributeName === "data-state") {
          scrollActiveIntoView();
          break;
        }
      }
    });

    observer.observe(container, {
      attributes: true,
      subtree: true,
      attributeFilter: ["data-state"],
    });

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  return (
    <TabsPrimitive.List
      ref={innerRef}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground scroll-smooth",
        className,
      )}
      {...props}
    />
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    data-tab={props.value}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
