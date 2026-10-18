import { useEffect, useState } from "react";
import axios from "axios";
import { format } from "date-fns";
import {
  MessageSquare,
  Search,
  RefreshCw,
  Mail,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  Eye,
  GraduationCap,
  Sparkles
} from "lucide-react";
import API_URL from "@/config/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";

export interface CustomServiceRequestItem {
  _id: string;
  category: "Student" | "Tutor";
  name: string;
  email: string;
  message: string;
  status: "New" | "Contacted" | "Resolved";
  createdAt: string;
  updatedAt: string;
}

export default function CustomServiceRequestsViewer() {
  const [requests, setRequests] = useState<CustomServiceRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "New" | "Contacted" | "Resolved">("All");
  const [categoryFilter, setCategoryFilter] = useState<"All" | "Student" | "Tutor">("All");
  const [selectedRequest, setSelectedRequest] = useState<CustomServiceRequestItem | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/custom-service`);
      if (res.data && Array.isArray(res.data.requests)) {
        setRequests(res.data.requests);
      } else if (Array.isArray(res.data)) {
        setRequests(res.data);
      } else {
        setRequests([]);
      }
    } catch (err: any) {
      console.error("Failed to fetch custom service requests:", err);
      toast.error("Unable to load custom service requests from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: "New" | "Contacted" | "Resolved") => {
    try {
      setUpdatingId(id);
      await axios.patch(`${API_URL}/custom-service/${id}/status`, { status: newStatus });
      setRequests((prev) =>
        prev.map((item) => (item._id === id ? { ...item, status: newStatus } : item))
      );
      if (selectedRequest && selectedRequest._id === id) {
        setSelectedRequest((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      toast.success(`Request marked as ${newStatus}`);
    } catch (err: any) {
      console.error("Failed to update status:", err);
      toast.error(err.response?.data?.message || "Failed to update request status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredRequests = requests.filter((item) => {
    if (statusFilter !== "All" && item.status !== statusFilter) return false;
    if (categoryFilter !== "All" && item.category !== categoryFilter) return false;
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase().trim();
      const matchName = (item.name || "").toLowerCase().includes(q);
      const matchEmail = (item.email || "").toLowerCase().includes(q);
      const matchMessage = (item.message || "").toLowerCase().includes(q);
      return matchName || matchEmail || matchMessage;
    }
    return true;
  });

  const totalCount = requests.length;
  const newCount = requests.filter((r) => r.status === "New").length;
  const contactedCount = requests.filter((r) => r.status === "Contacted").length;
  const resolvedCount = requests.filter((r) => r.status === "Resolved").length;

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border shadow-xs bg-card/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Inquiries</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{totalCount}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <MessageSquare className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-xs bg-card/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">New / Uncontacted</p>
              <p className="text-2xl font-bold text-amber-600 mt-0.5">{newCount}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <AlertCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-xs bg-card/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Contacted</p>
              <p className="text-2xl font-bold text-blue-600 mt-0.5">{contactedCount}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-xs bg-card/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Resolved</p>
              <p className="text-2xl font-bold text-emerald-600 mt-0.5">{resolvedCount}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Listing Card */}
      <Card className="border border-border/50 shadow-md bg-card/60 backdrop-blur-md">
        <CardHeader className="p-5 border-b bg-secondary/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              Chatbot Custom Service Requests
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Review and follow up on personalized support inquiries submitted via the Cuvasol chatbot.
            </CardDescription>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchRequests}
            disabled={loading}
            className="h-9 gap-1.5 rounded-lg text-xs font-semibold shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          {/* Filters & Search Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl bg-background"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={categoryFilter}
                onValueChange={(val: any) => setCategoryFilter(val)}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl w-[130px] bg-background">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Categories</SelectItem>
                  <SelectItem value="Student">Student</SelectItem>
                  <SelectItem value="Tutor">Tutor</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={(val: any) => setStatusFilter(val)}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl w-[130px] bg-background">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Statuses</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Contacted">Contacted</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table / List */}
          {loading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground bg-secondary/5 rounded-2xl border border-dashed border-border/70 p-6">
              <MessageSquare className="mx-auto mb-3 h-10 w-10 opacity-30 text-indigo-500" />
              <h4 className="font-semibold text-sm text-foreground mb-1">No Inquiries Found</h4>
              <p className="text-xs">
                {searchQuery || statusFilter !== "All" || categoryFilter !== "All"
                  ? "No custom service requests match the current filters."
                  : "No custom service requests have been submitted via the chatbot yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/40">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-secondary/30 border-b border-border/60 text-muted-foreground font-semibold">
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Sender</th>
                    <th className="p-3.5">Message Excerpt</th>
                    <th className="p-3.5">Date & Time</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 bg-card">
                  {filteredRequests.map((item) => (
                    <tr
                      key={item._id}
                      className="hover:bg-secondary/20 transition-colors cursor-pointer"
                      onClick={() => setSelectedRequest(item)}
                    >
                      <td className="p-3.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0.5 border-none font-bold ${
                            item.category === "Student"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          }`}
                        >
                          {item.category === "Student" ? "🎓 Student" : "👩‍🏫 Tutor"}
                        </Badge>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-foreground">{item.name}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3" />
                          <a
                            href={`mailto:${item.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:underline text-primary"
                          >
                            {item.email}
                          </a>
                        </div>
                      </td>

                      <td className="p-3.5 max-w-xs truncate text-muted-foreground">
                        <p className="truncate">{item.message}</p>
                      </td>

                      <td className="p-3.5 text-muted-foreground whitespace-nowrap">
                        {item.createdAt
                          ? format(new Date(item.createdAt), "MMM d, yyyy • h:mm a")
                          : "N/A"}
                      </td>

                      <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={item.status}
                          disabled={updatingId === item._id}
                          onValueChange={(val: any) => handleUpdateStatus(item._id, val)}
                        >
                          <SelectTrigger
                            className={`h-7 px-2 text-[10px] font-bold rounded-lg border-none w-auto ${
                              item.status === "New"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                : item.status === "Contacted"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            }`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="New">New</SelectItem>
                            <SelectItem value="Contacted">Contacted</SelectItem>
                            <SelectItem value="Resolved">Resolved</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>

                      <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRequest(item)}
                          className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        {selectedRequest && (
          <DialogContent className="sm:max-w-md bg-card p-6 rounded-2xl border shadow-xl">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <Badge
                  variant="outline"
                  className={`text-[10px] px-2 py-0.5 border-none font-bold ${
                    selectedRequest.category === "Student"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  }`}
                >
                  {selectedRequest.category} Inquirer
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  {selectedRequest.createdAt &&
                    format(new Date(selectedRequest.createdAt), "PPP p")}
                </span>
              </div>
              <DialogTitle className="text-lg font-bold text-foreground mt-2">
                {selectedRequest.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                <a
                  href={`mailto:${selectedRequest.email}?subject=Regarding your Cuvasol Custom Service Request`}
                  className="text-primary hover:underline flex items-center gap-1.5 mt-1"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {selectedRequest.email}
                </a>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Message Details
                </label>
                <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/50 text-xs text-foreground leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {selectedRequest.message}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <span className="text-xs font-medium text-muted-foreground">Status:</span>
                <div className="flex items-center gap-2">
                  {(["New", "Contacted", "Resolved"] as const).map((status) => (
                    <Button
                      key={status}
                      type="button"
                      size="sm"
                      variant={selectedRequest.status === status ? "default" : "outline"}
                      disabled={updatingId === selectedRequest._id}
                      onClick={() => handleUpdateStatus(selectedRequest._id, status)}
                      className={`h-7 px-2.5 text-xs rounded-lg ${
                        selectedRequest.status === status && status === "Resolved"
                          ? "bg-emerald-600 hover:bg-emerald-700"
                          : selectedRequest.status === status && status === "New"
                          ? "bg-amber-600 hover:bg-amber-700"
                          : ""
                      }`}
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  asChild
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
                >
                  <a
                    href={`mailto:${selectedRequest.email}?subject=Cuvasol Custom Service Request follow-up&body=Hi ${selectedRequest.name},%0D%0A%0D%0AThank you for reaching out regarding custom service options on Cuvasol.`}
                  >
                    <Mail className="h-3.5 w-3.5 mr-1.5" />
                    Reply via Email
                  </a>
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
