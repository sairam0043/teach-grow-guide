import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";
import API_URL from "@/config/api";
import PageLayout from "@/components/layout/PageLayout";
import { CheckCircle, XCircle, Clock } from "lucide-react";

const ApproveBooking = () => {
  const { bookingId } = useParams();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email");
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"pending" | "approved" | "declined" | "error" | "not_found">("pending");

  const handleApproval = async (action: "approve" | "decline") => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/tutors/booking/${bookingId}/approve`, {
        email,
        action,
      });
      setStatus(action === "approve" ? "approved" : "declined");
      toast.success(action === "approve" ? "Successfully approved and paid your share!" : "You have declined the group booking.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit approval.");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  if (!email || !bookingId) {
    return (
      <PageLayout>
        <div className="container py-20 flex justify-center">
          <Card className="w-full max-w-md text-center">
             <CardHeader>
               <CardTitle>Invalid Link</CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-muted-foreground mb-4">This approval link is invalid or missing required parameters.</p>
               <Button onClick={() => navigate("/")}>Go Home</Button>
             </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container py-20 flex justify-center">
        <Card className="w-full max-w-md shadow-lg border-primary/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              {status === "pending" && <Clock className="w-6 h-6 text-primary" />}
              {status === "approved" && <CheckCircle className="w-6 h-6 text-green-500" />}
              {status === "declined" && <XCircle className="w-6 h-6 text-destructive" />}
              {status === "error" && <XCircle className="w-6 h-6 text-destructive" />}
            </div>
            <CardTitle className="text-2xl">Group Class Invitation</CardTitle>
            <CardDescription>
              {status === "pending" && `Please approve or decline your participation.`}
              {status === "approved" && `You have successfully approved this booking!`}
              {status === "declined" && `You have declined this booking.`}
              {status === "error" && `An error occurred processing your request.`}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {status === "pending" && (
              <>
                <div className="bg-secondary/20 p-4 rounded-lg text-sm space-y-2">
                  <p><strong>Email:</strong> {email}</p>
                  <p className="text-muted-foreground">
                    By approving, you agree to join the group class and pay your respective share. The booking will only be confirmed once all invited students have approved.
                  </p>
                </div>

                <div className="flex gap-4">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => handleApproval("decline")}
                    disabled={loading}
                  >
                    Decline
                  </Button>
                  <Button 
                    className="w-full" 
                    onClick={() => handleApproval("approve")}
                    disabled={loading}
                  >
                    {loading ? "Processing..." : "Approve & Pay Share"}
                  </Button>
                </div>
              </>
            )}

            {status !== "pending" && (
               <div className="text-center mt-4">
                 <Button variant="outline" onClick={() => navigate("/")}>Return to Home</Button>
               </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default ApproveBooking;
