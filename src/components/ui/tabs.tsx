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

    const scrollActiveIntoView = (smooth = true) => {
      const activeEl = container.querySelector<HTMLElement>('[data-state="active"]');
      if (!activeEl) return;

      if (container.scrollWidth <= container.clientWidth) return;

      const containerRect = container.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();

      const activeLeftInContainer = container.scrollLeft + (activeRect.left - containerRect.left);
      const targetScrollLeft = Math.max(
        0,
        activeLeftInContainer - (container.clientWidth / 2) + (activeRect.width / 2)
      );

      if (smooth && typeof container.scrollTo === "function") {
        container.scrollTo({
          left: targetScrollLeft,
          behavior: "smooth",
        });
      } else {
        container.scrollLeft = targetScrollLeft;
      }
    };

    // Scroll active trigger into view on initial mount / render
    const timer = setTimeout(() => scrollActiveIntoView(false), 100);

    let scrollDebounceTimer: any = null;
    const debouncedScroll = () => {
      if (scrollDebounceTimer) clearTimeout(scrollDebounceTimer);
      scrollDebounceTimer = setTimeout(() => {
        scrollActiveIntoView(true);
      }, 50);
    };

    // Observe changes to data-state attribute on children (when active tab changes)
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.attributeName === "data-state") {
          debouncedScroll();
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
      if (scrollDebounceTimer) clearTimeout(scrollDebounceTimer);
      observer.disconnect();
    };
  }, []);

  return (
    <TabsPrimitive.List
      ref={innerRef}
      className={cn(
        "relative inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
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
