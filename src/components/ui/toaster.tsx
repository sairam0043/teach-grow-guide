import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props} className="flex items-center justify-between gap-4 p-4">
            <div className="grid gap-1 flex-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose className="static opacity-100 group-hover:opacity-100 bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-lg text-xs font-bold transition-all focus:opacity-100 border border-primary/20 shrink-0">
              OK
            </ToastClose>
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
