import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PageLayout from "@/components/layout/PageLayout";
import { Calendar, Loader2, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import axios from "axios";
import API_URL from "@/config/api";

const GoogleCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const tutorId = searchParams.get("state");

    if (!code || !tutorId) {
      setStatus("error");
      setErrorMessage("Missing required authorization parameters (code or state).");
      return;
    }

    const saveTokens = async () => {
      try {
        const response = await axios.post(`${API_URL}/auth/google-calendar/save-tokens`, {
          code,
          tutorId,
        });

        if (response.data.success) {
          setStatus("success");
          toast.success("Google Calendar connected successfully!");
          
          // Automatically redirect to tutor dashboard settings after 2.5 seconds
          setTimeout(() => {
            navigate("/dashboard/tutor?tab=settings&google_connected=true");
          }, 2500);
        } else {
          throw new Error(response.data.message || "Failed to save authorization tokens.");
        }
      } catch (error: any) {
        console.error("Error exchanging Google code:", error);
        setStatus("error");
        setErrorMessage(
          error.response?.data?.message ||
            error.message ||
            "An error occurred while connecting your Google Calendar."
        );
        toast.error("Failed to connect Google Calendar.");
      }
    };

    saveTokens();
  }, [searchParams, navigate]);

  return (
    <PageLayout>
      <div className="container max-w-lg mx-auto py-16 px-4 flex flex-col items-center justify-center min-h-[60vh]">
        <Card className="w-full shadow-lg border border-border/40 backdrop-blur-sm bg-card/90">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Google Calendar Integration</CardTitle>
            <CardDescription>Setting up your video scheduling interface</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center text-center p-6 space-y-6">
            {status === "loading" && (
              <div className="space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground text-sm font-medium">
                  Exchanging authentication codes securely...
                </p>
              </div>
            )}

            {status === "success" && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-foreground">Connection Successful!</h3>
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                    Your Google Calendar is connected. Sessions booked on this platform will now create Google Meet rooms.
                  </p>
                </div>
                <p className="text-xs text-primary/80 animate-pulse pt-2">
                  Redirecting back to your tutor dashboard...
                </p>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300 w-full">
                <XCircle className="w-16 h-16 text-destructive mx-auto" />
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-foreground">Connection Failed</h3>
                  <p className="text-destructive text-sm max-w-sm mx-auto bg-destructive/10 p-3 rounded-md border border-destructive/20 font-mono">
                    {errorMessage}
                  </p>
                </div>
                <div className="pt-4 flex flex-col space-y-2">
                  <Button onClick={() => navigate("/dashboard/tutor")} className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Tutor Dashboard
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default GoogleCallback;
