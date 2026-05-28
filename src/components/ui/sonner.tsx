import { useTheme } from "next-themes";
import { Toaster as Sonner, toast as rawToast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-center"
      duration={5000}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:flex group-[.toaster]:items-center group-[.toaster]:justify-between group-[.toaster]:gap-4",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer border border-primary/20 shrink-0 shadow-sm",
          cancelButton: "bg-muted text-muted-foreground hover:bg-muted/90 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0",
        },
      }}
      {...props}
      closeButton={false}
    />
  );
};

const wrapOptions = (options?: any) => {
  return {
    action: {
      label: "OK",
      onClick: () => {}
    },
    ...options
  };
};

const toast = (message: string | React.ReactNode, options?: any) => {
  return rawToast(message, wrapOptions(options));
};

toast.success = (message: string | React.ReactNode, options?: any) => {
  return rawToast.success(message, wrapOptions(options));
};

toast.error = (message: string | React.ReactNode, options?: any) => {
  return rawToast.error(message, wrapOptions(options));
};

toast.info = (message: string | React.ReactNode, options?: any) => {
  return rawToast.info(message, wrapOptions(options));
};

toast.warning = (message: string | React.ReactNode, options?: any) => {
  return rawToast.warning(message, wrapOptions(options));
};

toast.loading = (message: string | React.ReactNode, options?: any) => {
  return rawToast.loading(message, options);
};

toast.dismiss = (id?: string | number) => {
  return rawToast.dismiss(id);
};

export { Toaster, toast };

