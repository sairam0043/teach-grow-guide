import { useEffect, useState, Fragment } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import {
  CreditCard,
  DollarSign,
  Users,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building2,
  ChevronDown,
  ChevronUp,
  Mail,
  RefreshCw,
  Eye,
  EyeOff,
  History,
  Send,
  ShieldCheck,
  Calendar,
  Check,
  Sparkles,
  ArrowUpRight,
  Landmark,
  FileSpreadsheet,
  AlertTriangle,
  Percent,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import PageLayout from "@/components/layout/PageLayout";
import { toast } from "@/components/ui/sonner";
import API_URL from "@/config/api";
import { useAuth } from "@/contexts/AuthContext";

const HRDashboard = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedTutorId, setExpandedTutorId] = useState<string | null>(null);

  // Pagination states (20 per page by default)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modals state
  const [selectedTutorForBank, setSelectedTutorForBank] = useState<any | null>(null);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [showFullAccountNum, setShowFullAccountNum] = useState(false);

  const [selectedTutorForPayout, setSelectedTutorForPayout] = useState<any | null>(null);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<number | string>("");
  const [payoutMode, setPayoutMode] = useState("Bank Transfer (NEFT/IMPS)");
  const [transactionRef, setTransactionRef] = useState("");
  const [periodMonth, setPeriodMonth] = useState(() => {
    return new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
  });
  const [payoutNotes, setPayoutNotes] = useState("");
  const [sendReceiptEmail, setSendReceiptEmail] = useState(true);
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);

  const [selectedTutorForHistory, setSelectedTutorForHistory] = useState<any | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const [isSendingReminders, setIsSendingReminders] = useState(false);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/dashboard/hr/payouts`);
      setPayouts(res.data);
    } catch (err: any) {
      console.error("Error fetching tutor payouts:", err);
      toast.error(err.response?.data?.message || "Failed to load tutor payouts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  // Summary KPIs Calculation
  const totalGrossCollected = payouts.reduce((acc, curr) => acc + (curr.totalCollected || 0), 0);
  const totalCommission = payouts.reduce((acc, curr) => acc + (curr.totalCommission || 0), 0);
  const totalNetPayoutsDue = payouts.reduce((acc, curr) => acc + (curr.totalPayout || 0), 0);
  const totalDisbursed = payouts.reduce((acc, curr) => acc + (curr.totalPaidOut || 0), 0);
  const totalPendingDisbursement = payouts.reduce((acc, curr) => acc + (curr.pendingPayout || 0), 0);
  const tutorsWithBankDetails = payouts.filter(p => p.hasBankDetails).length;
  const tutorsMissingBankDetails = payouts.filter(p => !p.hasBankDetails && (p.totalPayout || 0) > 0).length;

  // Filtered Tutors List
  const filteredPayouts = payouts.filter(item => {
    const matchesSearch =
      item.tutorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.paymentDetails?.bankName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.paymentDetails?.ifscCode?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "pending") {
      return item.pendingPayout > 0;
    }
    if (statusFilter === "ready") {
      return item.pendingPayout > 0 && item.hasBankDetails;
    }
    if (statusFilter === "missing_bank") {
      return !item.hasBankDetails && item.totalPayout > 0;
    }
    if (statusFilter === "paid") {
      return item.payoutStatus === "paid";
    }

    return true;
  });

  // Reset pagination when search, filter, or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, pageSize]);

  // Paginated Slicing
  const totalPages = Math.max(1, Math.ceil(filteredPayouts.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedPayouts = filteredPayouts.slice(startIndex, startIndex + pageSize);

  const handleOpenBankModal = (tutor: any) => {
    setSelectedTutorForBank(tutor);
    setShowFullAccountNum(false);
    setIsBankModalOpen(true);
  };

  const handleOpenPayoutModal = (tutor: any) => {
    setSelectedTutorForPayout(tutor);
    setPayoutAmount(tutor.pendingPayout > 0 ? tutor.pendingPayout : tutor.totalPayout);
    setPayoutMode("Bank Transfer (NEFT/IMPS)");
    setTransactionRef(`UTR${Date.now().toString().slice(-8)}`);
    setPayoutNotes(`Monthly payout for ${tutor.totalCompletedSessions} completed sessions`);
    setSendReceiptEmail(true);
    setIsPayoutModalOpen(true);
  };

  const handleOpenHistoryModal = (tutor: any) => {
    setSelectedTutorForHistory(tutor);
    setIsHistoryModalOpen(true);
  };

  const handleRecordPayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTutorForPayout) return;

    if (!payoutAmount || Number(payoutAmount) <= 0) {
      toast.error("Please enter a valid payout amount");
      return;
    }

    setIsSubmittingPayout(true);
    try {
      const res = await axios.post(`${API_URL}/dashboard/hr/payouts/record`, {
        tutorId: selectedTutorForPayout.tutorId,
        amount: Number(payoutAmount),
        paymentMode: payoutMode,
        transactionReference: transactionRef,
        periodMonth,
        notes: payoutNotes,
        sendEmail: sendReceiptEmail,
        disbursedBy: user?.email || "HR Finance Manager"
      });

      toast.success(res.data.message || `Payout of ₹${payoutAmount} recorded successfully!`);
      setIsPayoutModalOpen(false);
      setSelectedTutorForPayout(null);
      fetchPayouts();
    } catch (err: any) {
      console.error("Error recording payout:", err);
      toast.error(err.response?.data?.message || "Failed to record payout disbursement");
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  const handleSendSingleReminder = async (tutor: any) => {
    try {
      toast.loading(`Sending bank account setup reminder to ${tutor.tutorName}...`);
      const res = await axios.post(`${API_URL}/dashboard/hr/send-bank-reminder`, {
        tutorId: tutor.tutorId
      });
      toast.dismiss();
      toast.success(`Reminder email sent successfully to ${tutor.email}!`);
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.response?.data?.message || "Failed to send reminder email");
    }
  };

  const handleSendBulkBankReminders = async () => {
    if (!window.confirm("Send automated bank account setup reminders to all tutors with pending earnings who haven't added their bank details?")) {
      return;
    }

    setIsSendingReminders(true);
    try {
      toast.loading("Sending bank account setup reminders...");
      const res = await axios.post(`${API_URL}/dashboard/hr/send-bank-reminder`, {
        tutorId: "all"
      });
      toast.dismiss();
      toast.success(`Dispatched reminders to ${res.data.successCount} tutors!`);
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.response?.data?.message || "Failed to send reminder emails");
    } finally {
      setIsSendingReminders(false);
    }
  };

  const handleDownloadPayoutBatchCSV = () => {
    if (payouts.length === 0) {
      toast.error("No payout data available to export");
      return;
    }

    const batchTutors = payouts.filter(p => p.pendingPayout > 0 && p.hasBankDetails);

    if (batchTutors.length === 0) {
      toast.error("No eligible tutors with pending balance and bank details found for batch transfer");
      return;
    }

    const headers = [
      "Beneficiary Name",
      "Bank Name",
      "Account Number",
      "IFSC Code",
      "Account Type",
      "UPI ID",
      "Payout Amount (INR)",
      "Remarks / Narration",
      "Tutor Email",
      "Tutor Phone"
    ];

    const rows = batchTutors.map(t => {
      const b = t.paymentDetails || {};
      const holderName = `"${(b.accountHolderName || t.tutorName || "").replace(/"/g, '""')}"`;
      const bankName = `"${(b.bankName || "").replace(/"/g, '""')}"`;
      const accNum = `"\t${(b.accountNumber || "").replace(/"/g, '""')}"`;
      const ifsc = `"${(b.ifscCode || "").replace(/"/g, '""')}"`;
      const accType = `"${(b.accountType || "Savings Account").replace(/"/g, '""')}"`;
      const upi = `"${(b.upiId || "").replace(/"/g, '""')}"`;
      const amount = t.pendingPayout;
      const narration = `"Cuvasol Tutor Payout - ${periodMonth}"`;
      const email = `"${(t.email || "").replace(/"/g, '""')}"`;
      const phone = `"\t${(t.phone || "").replace(/"/g, '""')}"`;

      return [holderName, bankName, accNum, ifsc, accType, upi, amount, narration, email, phone].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `tutor_payouts_bank_batch_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Bank batch transfer CSV generated for ${batchTutors.length} tutors!`);
  };

  return (
    <PageLayout>
      <div className="container py-10 max-w-7xl">
        {/* Top Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 text-xs font-bold px-2.5 py-0.5">
                HR & Finance Portal
              </Badge>
              {role === "admin" && (
                <Link to="/dashboard/admin" className="text-xs text-primary hover:underline font-semibold flex items-center gap-1">
                  ← Back to Admin Console
                </Link>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">
              Tutor Payouts & Settlement Ledger
            </h1>
            <p className="text-base text-muted-foreground mt-1.5">
              Review verified tutor bank accounts, calculate 90% net teaching earnings, and process monthly disbursements.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0 self-start md:self-center">
            <Button
              onClick={handleSendBulkBankReminders}
              disabled={isSendingReminders || tutorsMissingBankDetails === 0}
              variant="outline"
              className="h-10 gap-2 border-amber-200 text-amber-800 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-lg shadow-sm font-semibold text-xs"
            >
              <Mail className={`h-4 w-4 ${isSendingReminders ? "animate-bounce" : ""}`} />
              Send Bank Details Reminders ({tutorsMissingBankDetails})
            </Button>

            <Button
              onClick={handleDownloadPayoutBatchCSV}
              disabled={loading || payouts.length === 0}
              className="h-10 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm text-xs"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Bank Batch CSV
            </Button>

            <Button
              onClick={fetchPayouts}
              disabled={loading}
              variant="outline"
              className="h-10 gap-2 border-border hover:bg-secondary/20 rounded-lg shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Top Summary Metrics */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-10">
          {[
            {
              icon: DollarSign,
              label: "Net Earnings (90%)",
              value: `₹${totalNetPayoutsDue}`,
              color: "text-indigo-600 dark:text-indigo-400",
              bg: "bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200/40 dark:border-indigo-900/20"
            },
            {
              icon: Clock,
              label: "Pending to Disburse",
              value: `₹${totalPendingDisbursement}`,
              color: "text-amber-600 dark:text-amber-400",
              bg: "bg-amber-50 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-900/20",
              badge: totalPendingDisbursement > 0 ? "Action Required" : "All Clear"
            },
            {
              icon: CheckCircle2,
              label: "Total Disbursed",
              value: `₹${totalDisbursed}`,
              color: "text-emerald-600 dark:text-emerald-400",
              bg: "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/40 dark:border-emerald-900/20"
            },
            {
              icon: Percent,
              label: "Platform Revenue (10%)",
              value: `₹${totalCommission}`,
              color: "text-teal-600 dark:text-teal-400",
              bg: "bg-teal-50 dark:bg-teal-950/20 border border-teal-200/40 dark:border-teal-900/20"
            },
            {
              icon: Landmark,
              label: "Bank Accounts Ready",
              value: `${tutorsWithBankDetails} / ${payouts.length}`,
              color: "text-sky-600 dark:text-sky-400",
              bg: "bg-sky-50 dark:bg-sky-950/20 border border-sky-200/40 dark:border-sky-900/20",
              sub: tutorsMissingBankDetails > 0 ? `${tutorsMissingBankDetails} Missing Passbook` : "100% Configured"
            }
          ].map(stat => (
            <Card key={stat.label} className="border border-border/50 shadow-md bg-card/60 backdrop-blur-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl shrink-0 ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="min-w-0">
                  {loading ? (
                    <Skeleton className="h-7 w-20 mb-1" />
                  ) : (
                    <p className="text-2xl font-black text-foreground tracking-tight truncate">{stat.value}</p>
                  )}
                  <p className="text-xs font-semibold text-muted-foreground truncate">{stat.label}</p>
                  {stat.badge && (
                    <span className={`inline-block mt-1 text-[9px] font-bold px-1.5 py-0.2 rounded ${
                      totalPendingDisbursement > 0 ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {stat.badge}
                    </span>
                  )}
                  {stat.sub && (
                    <span className="block mt-0.5 text-[10px] text-rose-500 font-bold truncate">{stat.sub}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Payouts Ledger Section */}
        <Card className="shadow-lg border border-border/50 bg-card/60 backdrop-blur-md overflow-hidden">
          <CardHeader className="bg-secondary/15 border-b pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl flex items-center gap-2 font-bold text-foreground">
                  <Landmark className="h-5 w-5 text-emerald-600" /> Tutors Payout & Bank Accounts Ledger
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">
                  Individual tutor balances, bank verification details, session logs, and disbursement history.
                </CardDescription>
              </div>

              {/* Status Filter Chips */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "all", label: "All Tutors", count: payouts.length },
                  { id: "pending", label: "Pending Payout", count: payouts.filter(p => p.pendingPayout > 0).length },
                  { id: "ready", label: "Ready to Pay", count: payouts.filter(p => p.pendingPayout > 0 && p.hasBankDetails).length },
                  { id: "missing_bank", label: "Missing Bank Details", count: tutorsMissingBankDetails },
                  { id: "paid", label: "Settled / Paid", count: payouts.filter(p => p.payoutStatus === "paid").length }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      statusFilter === tab.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary/40 text-muted-foreground hover:bg-secondary/70"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      statusFilter === tab.id ? "bg-white/20 text-white" : "bg-secondary text-foreground"
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="mt-4 relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by tutor name, email, bank name, IFSC..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/70 border-border shadow-sm text-xs h-9"
              />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 space-y-4">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            ) : filteredPayouts.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground bg-secondary/5 border-dashed m-6 rounded-2xl">
                <CreditCard className="mx-auto mb-3 h-14 w-14 opacity-25 text-emerald-600" />
                <h3 className="text-base font-bold text-foreground">No Tutors Match Filter</h3>
                <p className="text-xs text-muted-foreground mt-1">Try resetting the search query or changing the status filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/30 uppercase text-[10px] tracking-wider text-muted-foreground font-bold border-b border-border/40">
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="font-bold h-12">Tutor Profile</TableHead>
                      <TableHead className="font-bold h-12">Payout Bank Account</TableHead>
                      <TableHead className="font-bold h-12 text-center">Sessions</TableHead>
                      <TableHead className="font-bold h-12 text-right">Gross Collected</TableHead>
                      <TableHead className="font-bold h-12 text-right">Commission (10%)</TableHead>
                      <TableHead className="font-bold h-12 text-right">Net Earned (90%)</TableHead>
                      <TableHead className="font-bold h-12 text-right">Pending Balance</TableHead>
                      <TableHead className="font-bold h-12 text-center">Status</TableHead>
                      <TableHead className="font-bold h-12 text-right px-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPayouts.map(tutor => {
                      const isExpanded = expandedTutorId === tutor.tutorId;
                      const bank = tutor.paymentDetails || {};
                      const hasBank = tutor.hasBankDetails;

                      return (
                        <Fragment key={tutor.tutorId}>
                          <TableRow className="hover:bg-secondary/5 transition-colors border-b border-border/40">
                            {/* Expand toggle */}
                            <TableCell className="text-center p-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => setExpandedTutorId(isExpanded ? null : tutor.tutorId)}
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                            </TableCell>

                            {/* Tutor Info */}
                            <TableCell className="py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0 border border-primary/20">
                                  {tutor.tutorName?.charAt(0).toUpperCase() || "T"}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-sm text-foreground flex items-center gap-1.5 truncate">
                                    {tutor.tutorName}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground truncate">{tutor.email}</div>
                                  <div className="text-[10px] text-muted-foreground">{tutor.phone}</div>
                                </div>
                              </div>
                            </TableCell>

                            {/* Bank Account Info */}
                            <TableCell className="py-4">
                              {hasBank ? (
                                <div className="space-y-1">
                                  <div className="font-semibold text-xs text-foreground flex items-center gap-1">
                                    <Building2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span className="truncate max-w-[150px]">{bank.bankName}</span>
                                  </div>
                                  <div className="font-mono text-[11px] text-muted-foreground">
                                    A/C: ••••{bank.accountNumber?.slice(-4)}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[9px] font-mono font-bold bg-secondary/40 border-border/60 uppercase px-1.5 py-0">
                                      {bank.ifscCode}
                                    </Badge>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenBankModal(tutor)}
                                      className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                                    >
                                      View Bank Info
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <Badge variant="destructive" className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-900/40 text-[10px] font-bold">
                                    <AlertTriangle className="h-3 w-3 mr-1" /> Missing Passbook
                                  </Badge>
                                  <div>
                                    <button
                                      type="button"
                                      onClick={() => handleSendSingleReminder(tutor)}
                                      className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                                    >
                                      <Mail className="h-3 w-3" /> Send Email Reminder
                                    </button>
                                  </div>
                                </div>
                              )}
                            </TableCell>

                            {/* Completed Sessions */}
                            <TableCell className="text-center font-bold text-xs py-4">
                              <span className="px-2 py-1 rounded-md bg-secondary/30 border text-foreground">
                                {tutor.totalCompletedSessions || 0}
                              </span>
                            </TableCell>

                            {/* Gross Collected */}
                            <TableCell className="text-right font-medium text-xs text-muted-foreground py-4">
                              ₹{tutor.totalCollected || 0}
                            </TableCell>

                            {/* Commission */}
                            <TableCell className="text-right font-medium text-xs text-teal-600 dark:text-teal-400 py-4">
                              ₹{tutor.totalCommission || 0}
                            </TableCell>

                            {/* Net Payout */}
                            <TableCell className="text-right font-bold text-xs text-indigo-600 dark:text-indigo-400 py-4">
                              ₹{tutor.totalPayout || 0}
                            </TableCell>

                            {/* Pending Balance */}
                            <TableCell className="text-right py-4">
                              <span className={`font-black text-sm ${tutor.pendingPayout > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                                ₹{tutor.pendingPayout || 0}
                              </span>
                              {tutor.totalPaidOut > 0 && (
                                <span className="block text-[10px] text-muted-foreground">
                                  Paid: ₹{tutor.totalPaidOut}
                                </span>
                              )}
                            </TableCell>

                            {/* Status */}
                            <TableCell className="text-center py-4">
                              {tutor.payoutStatus === "paid" ? (
                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-none font-bold text-[10px]">
                                  Settled
                                </Badge>
                              ) : tutor.payoutStatus === "needs_bank_details" ? (
                                <Badge variant="outline" className="bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 text-[10px] font-bold">
                                  Needs Bank A/C
                                </Badge>
                              ) : tutor.payoutStatus === "pending" ? (
                                <Badge className="bg-amber-500 text-white border-none font-bold text-[10px] animate-pulse">
                                  Payout Due
                                </Badge>
                              ) : (
                                <span className="text-[11px] text-muted-foreground font-medium">No Balance</span>
                              )}
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="text-right px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenPayoutModal(tutor)}
                                  disabled={tutor.pendingPayout <= 0}
                                  className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
                                >
                                  Disburse Payout
                                </Button>

                                {tutor.payoutHistory && tutor.payoutHistory.length > 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenHistoryModal(tutor)}
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                    title="View Disbursed Payout History"
                                  >
                                    <History className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* Expandable Class Sessions Audit */}
                          {isExpanded && (
                            <TableRow className="bg-secondary/10 hover:bg-secondary/10 border-b border-border/60">
                              <TableCell colSpan={10} className="p-6">
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between border-b pb-2">
                                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                      <History className="h-4 w-4 text-primary" /> Session-by-Session Earnings Breakdown for {tutor.tutorName}
                                    </h4>
                                    <Badge variant="outline" className="text-xs font-semibold">
                                      Hourly Rate: ₹{tutor.currentRate}/hr
                                    </Badge>
                                  </div>

                                  {tutor.pricingPeriods?.length === 0 ? (
                                    <p className="text-xs text-muted-foreground italic p-3 bg-background rounded-lg border text-center">
                                      No completed paid sessions recorded for this tutor yet.
                                    </p>
                                  ) : (
                                    <div className="space-y-3">
                                      {tutor.pricingPeriods.map((period: any, pIdx: number) => (
                                        <div key={pIdx} className="bg-card p-4 rounded-xl border shadow-sm space-y-3">
                                          <div className="flex flex-wrap justify-between items-center text-xs font-bold text-muted-foreground border-b pb-2">
                                            <span className="text-foreground">Subject: <strong className="text-primary">{period.subject}</strong> (Rate: ₹{period.rate}/hr)</span>
                                            <span>Sessions: <strong className="text-foreground">{period.completedSessions}</strong></span>
                                            <span>Gross: <strong className="text-foreground">₹{period.totalCollected}</strong></span>
                                            <span>Net Payout: <strong className="text-emerald-600">₹{period.tutorPayout}</strong></span>
                                          </div>

                                          <div className="overflow-x-auto rounded-lg border">
                                            <Table>
                                              <TableHeader className="bg-secondary/20 text-[9px] uppercase font-bold text-muted-foreground">
                                                <TableRow>
                                                  <TableHead className="h-8">Student</TableHead>
                                                  <TableHead className="h-8">Plan</TableHead>
                                                  <TableHead className="h-8">Date / Timing</TableHead>
                                                  <TableHead className="h-8 text-center">Sessions Done</TableHead>
                                                  <TableHead className="h-8 text-right">Gross</TableHead>
                                                  <TableHead className="h-8 text-right">Commission (10%)</TableHead>
                                                  <TableHead className="h-8 text-right">Net Tutor Share</TableHead>
                                                </TableRow>
                                              </TableHeader>
                                              <TableBody>
                                                {period.bookings?.map((b: any) => (
                                                  <TableRow key={b.bookingId} className="text-xs">
                                                    <TableCell className="font-semibold">{b.studentName}</TableCell>
                                                    <TableCell><Badge variant="outline" className="text-[10px]">{b.planType}</Badge></TableCell>
                                                    <TableCell className="text-muted-foreground text-[11px]">{b.timing}</TableCell>
                                                    <TableCell className="text-center font-bold">{b.completedSessions} / {b.totalSessions}</TableCell>
                                                    <TableCell className="text-right">₹{b.amountPaid}</TableCell>
                                                    <TableCell className="text-right text-teal-600">₹{Math.round(b.commission)}</TableCell>
                                                    <TableCell className="text-right font-bold text-indigo-600">₹{Math.round(b.netPayout)}</TableCell>
                                                  </TableRow>
                                                ))}
                                              </TableBody>
                                            </Table>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination Controls */}
            {!loading && filteredPayouts.length > 0 && (
              <div className="p-4 border-t border-border/50 bg-secondary/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-medium">
                  <span>
                    Showing <strong className="text-foreground font-bold">{startIndex + 1}</strong> to <strong className="text-foreground font-bold">{Math.min(startIndex + pageSize, filteredPayouts.length)}</strong> of <strong className="text-foreground font-bold">{filteredPayouts.length}</strong> tutors
                  </span>

                  <div className="flex items-center gap-1.5 ml-2 sm:ml-4 border-l pl-3 sm:pl-4 border-border/60">
                    <span className="text-xs text-muted-foreground">Tutors per page:</span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(val) => {
                        setPageSize(Number(val));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="h-8 w-20 bg-background text-xs font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Page Navigation Buttons */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="h-8 w-8 p-0"
                      title="First Page"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-8 w-8 p-0"
                      title="Previous Page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1 px-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || (p >= currentPage - 2 && p <= currentPage + 2))
                        .map((page, idx, arr) => {
                          const prevPage = arr[idx - 1];
                          const showEllipsis = prevPage && page - prevPage > 1;

                          return (
                            <Fragment key={page}>
                              {showEllipsis && <span className="px-1 text-xs text-muted-foreground font-bold">...</span>}
                              <Button
                                size="sm"
                                variant={currentPage === page ? "default" : "outline"}
                                onClick={() => setCurrentPage(page)}
                                className={`h-8 w-8 p-0 text-xs font-bold ${
                                  currentPage === page ? "bg-primary text-primary-foreground shadow-sm" : ""
                                }`}
                              >
                                {page}
                              </Button>
                            </Fragment>
                          );
                        })}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-8 w-8 p-0"
                      title="Next Page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="h-8 w-8 p-0"
                      title="Last Page"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal 1: Bank Account Details Passbook */}
      <Dialog open={isBankModalOpen} onOpenChange={setIsBankModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Landmark className="h-5 w-5 text-emerald-600" /> Tutor Payout Bank Account
            </DialogTitle>
            <DialogDescription>
              Verified bank passbook details for {selectedTutorForBank?.tutorName}.
            </DialogDescription>
          </DialogHeader>

          {selectedTutorForBank?.paymentDetails && (
            <div className="space-y-4 py-3">
              {/* Passbook card design */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Landmark className="h-28 w-28 text-white" />
                </div>

                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-400 block">
                      OFFICIAL PAYOUT ACCOUNT
                    </span>
                    <h3 className="text-lg font-black tracking-wide mt-0.5">
                      {selectedTutorForBank.paymentDetails.bankName || "Bank Name"}
                    </h3>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                    <ShieldCheck className="h-3 w-3 mr-1" /> Verified
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Account Holder Name</span>
                    <span className="text-sm font-bold tracking-wide text-white block">
                      {selectedTutorForBank.paymentDetails.accountHolderName || selectedTutorForBank.tutorName}
                    </span>
                  </div>

                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Account Number</span>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-mono font-bold tracking-wider text-white">
                          {showFullAccountNum
                            ? selectedTutorForBank.paymentDetails.accountNumber
                            : `••••••••${selectedTutorForBank.paymentDetails.accountNumber?.slice(-4)}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowFullAccountNum(!showFullAccountNum)}
                          className="text-slate-400 hover:text-white"
                        >
                          {showFullAccountNum ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block text-right">IFSC Code</span>
                      <span className="text-sm font-mono font-bold text-white block text-right">
                        {selectedTutorForBank.paymentDetails.ifscCode}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-700/60 flex justify-between items-center text-xs text-slate-300">
                    <span>Type: <strong>{selectedTutorForBank.paymentDetails.accountType || "Savings"}</strong></span>
                    {selectedTutorForBank.paymentDetails.upiId && (
                      <span>UPI: <strong>{selectedTutorForBank.paymentDetails.upiId}</strong></span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setIsBankModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal 2: Record Payout Disbursement */}
      <Dialog open={isPayoutModalOpen} onOpenChange={setIsPayoutModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <CreditCard className="h-5 w-5 text-emerald-600" /> Disburse Tutor Payout
            </DialogTitle>
            <DialogDescription>
              Record a bank transfer or UPI payout transaction for {selectedTutorForPayout?.tutorName}.
            </DialogDescription>
          </DialogHeader>

          {selectedTutorForPayout && (
            <form onSubmit={handleRecordPayoutSubmit} className="space-y-4 py-2">
              {/* Beneficiary Quick Preview */}
              <div className="p-3.5 rounded-xl bg-secondary/20 border text-xs space-y-1">
                <div className="flex justify-between font-bold">
                  <span className="text-muted-foreground">Beneficiary:</span>
                  <span className="text-foreground">{selectedTutorForPayout.paymentDetails?.accountHolderName || selectedTutorForPayout.tutorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank & Account:</span>
                  <span className="font-mono text-foreground font-semibold">
                    {selectedTutorForPayout.paymentDetails?.bankName} (••{selectedTutorForPayout.paymentDetails?.accountNumber?.slice(-4)})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IFSC Code:</span>
                  <span className="font-mono text-foreground font-bold">{selectedTutorForPayout.paymentDetails?.ifscCode || "N/A"}</span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="payoutAmount" className="text-xs font-bold uppercase tracking-wider">
                    Payout Amount (₹) <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">₹</span>
                    <Input
                      id="payoutAmount"
                      type="number"
                      min={1}
                      value={payoutAmount}
                      onChange={e => setPayoutAmount(e.target.value)}
                      className="pl-7 font-black text-base bg-background shadow-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="payoutMode" className="text-xs font-bold uppercase tracking-wider">
                    Payment Mode
                  </Label>
                  <Select value={payoutMode} onValueChange={setPayoutMode}>
                    <SelectTrigger id="payoutMode" className="bg-background shadow-sm text-xs">
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank Transfer (NEFT/IMPS)">Bank Transfer (NEFT/IMPS)</SelectItem>
                      <SelectItem value="UPI Transfer">UPI Transfer</SelectItem>
                      <SelectItem value="RazorpayX Payout">RazorpayX Payout</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="transactionRef" className="text-xs font-bold uppercase tracking-wider">
                    Transaction UTR / Ref No
                  </Label>
                  <Input
                    id="transactionRef"
                    placeholder="e.g. UTR12345678"
                    value={transactionRef}
                    onChange={e => setTransactionRef(e.target.value)}
                    className="font-mono text-xs bg-background shadow-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="periodMonth" className="text-xs font-bold uppercase tracking-wider">
                    Settlement Period
                  </Label>
                  <Input
                    id="periodMonth"
                    placeholder="e.g. August 2026"
                    value={periodMonth}
                    onChange={e => setPeriodMonth(e.target.value)}
                    className="text-xs bg-background shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="payoutNotes" className="text-xs font-bold uppercase tracking-wider">
                  HR / Finance Notes (Optional)
                </Label>
                <Textarea
                  id="payoutNotes"
                  placeholder="e.g. Cleared monthly payout for 8 classes"
                  value={payoutNotes}
                  onChange={e => setPayoutNotes(e.target.value)}
                  rows={2}
                  className="text-xs resize-none bg-background shadow-sm"
                />
              </div>

              {/* Email Receipt Option */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50">
                <Checkbox
                  id="sendReceiptEmail"
                  checked={sendReceiptEmail}
                  onCheckedChange={checked => setSendReceiptEmail(checked === true)}
                />
                <Label htmlFor="sendReceiptEmail" className="text-xs text-foreground cursor-pointer font-medium select-none">
                  Send automated payment receipt email to tutor ({selectedTutorForPayout.email})
                </Label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPayoutModalOpen(false)}
                  disabled={isSubmittingPayout}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingPayout}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md px-6"
                >
                  {isSubmittingPayout ? "Recording..." : `Confirm & Disburse ₹${payoutAmount}`}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal 3: Disbursed Payout History */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <History className="h-5 w-5 text-indigo-600" /> Disbursed Payout History
            </DialogTitle>
            <DialogDescription>
              Complete record of all payout disbursements made to {selectedTutorForHistory?.tutorName}.
            </DialogDescription>
          </DialogHeader>

          {selectedTutorForHistory && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader className="bg-secondary/30 text-[10px] uppercase font-bold text-muted-foreground">
                    <TableRow>
                      <TableHead className="h-9">Date</TableHead>
                      <TableHead className="h-9">Period</TableHead>
                      <TableHead className="h-9">Mode</TableHead>
                      <TableHead className="h-9">UTR / Reference</TableHead>
                      <TableHead className="h-9 text-right">Amount Disbursed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedTutorForHistory.payoutHistory?.map((p: any, idx: number) => (
                      <TableRow key={idx} className="text-xs">
                        <TableCell className="font-medium">{new Date(p.disbursedAt).toLocaleDateString()}</TableCell>
                        <TableCell>{p.periodMonth || "N/A"}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{p.paymentMode}</Badge></TableCell>
                        <TableCell className="font-mono text-[11px] font-bold">{p.transactionReference || "N/A"}</TableCell>
                        <TableCell className="text-right font-black text-emerald-600">₹{p.amount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setIsHistoryModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default HRDashboard;
