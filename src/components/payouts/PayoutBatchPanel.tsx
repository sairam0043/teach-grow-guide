import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import API_URL from "@/config/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, RefreshCw, CheckCircle2, AlertTriangle, PauseCircle, Calculator, Info,
} from "lucide-react";

/**
 * Month-end payout batch: calculate, review, release.
 *
 * Deliberately three separate actions rather than one button. Preview writes
 * nothing. Generate writes ledger rows but moves no money. Approve is the
 * decision point, and even that does not transfer anything yet because no
 * payment provider is connected.
 */

type PayoutStatus =
  | "pending_approval" | "approved" | "processing"
  | "paid" | "failed" | "cancelled" | "on_hold";

interface PayoutRow {
  _id: string;
  tutorName: string;
  tutorEmail: string;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
  unconfirmedAmount: number;
  sessionCount: number;
  status: PayoutStatus;
  holdReason?: string;
  destinationSnapshot?: { accountLast4?: string; ifsc?: string };
}

interface Totals {
  gross: number; commission: number; net: number;
  unconfirmed: number; sessions: number; onHold: number;
}

const STATUS_TONE: Record<PayoutStatus, string> = {
  pending_approval: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  processing: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  paid: "bg-emerald-600 text-white",
  failed: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  cancelled: "bg-muted text-muted-foreground",
  on_hold: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
};

const STATUS_LABEL: Record<PayoutStatus, string> = {
  pending_approval: "Awaiting approval",
  approved: "Approved",
  processing: "Processing",
  paid: "Paid",
  failed: "Failed",
  cancelled: "Cancelled",
  on_hold: "On hold",
};

const rupees = (n: number) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Last 12 months, newest first, as YYYY-MM. */
function recentPeriods(count = 12): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

const periodLabel = (p: string) => {
  const [y, m] = p.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
};

const PayoutBatchPanel = ({ actorEmail = "staff" }: { actorEmail?: string }) => {
  const periods = useMemo(() => recentPeriods(), []);
  const [period, setPeriod] = useState(periods[1] ?? periods[0]); // default: last month
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<"generate" | "approve" | null>(null);
  const [generated, setGenerated] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  const loadBatch = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/payouts/staff/batch/${p}`);
      const saved = res.data.batch || [];

      if (saved.length > 0) {
        setRows(saved);
        setTotals(res.data.totals || null);
        setGenerated(true);
        setIsPreview(false);
      } else {
        // Nothing generated yet for this month. Fall back to the live
        // calculation so the month's activity is visible straight away.
        const pv = await axios.get(`${API_URL}/payouts/staff/preview/${p}`);
        setRows((pv.data.rows || []).map((r: any, i: number) => ({ ...r, _id: r.tutorId || String(i) })));
        setTotals(pv.data.totals || null);
        setGenerated(false);
        setIsPreview((pv.data.rows || []).length > 0);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not load the batch.");
      setRows([]); setTotals(null); setGenerated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBatch(period); }, [period, loadBatch]);

  const preview = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/payouts/staff/preview/${period}`);
      setRows((res.data.rows || []).map((r: any, i: number) => ({ ...r, _id: r.tutorId || String(i) })));
      setTotals(res.data.totals);
      setGenerated(false);
      setIsPreview(true);
      toast.success(`Previewed ${res.data.count} tutor(s). Nothing was saved.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Preview failed.");
    } finally {
      setLoading(false);
    }
  };

  const generate = async () => {
    setBusy("generate");
    try {
      const res = await axios.post(`${API_URL}/payouts/staff/generate/${period}`);
      setRows(res.data.batch || []);
      setTotals(res.data.totals);
      setGenerated(true);
      setIsPreview(false);
      const { created, refreshed, skipped } = res.data;
      toast.success(
        `${created} created, ${refreshed} updated` +
        (skipped?.length ? `, ${skipped.length} left alone (already settled)` : "")
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not generate the batch.");
    } finally {
      setBusy(null);
    }
  };

  const approve = async () => {
    const pending = rows.filter((r) => r.status === "pending_approval");
    if (!pending.length) return toast.info("Nothing is awaiting approval in this month.");
    const total = pending.reduce((a, r) => a + r.netAmount, 0);
    if (!window.confirm(
      `Approve ${pending.length} payment(s) totalling ${rupees(total)} for ${periodLabel(period)}?\n\n` +
      `This records the approval. No money is transferred — no payment provider is connected yet.`
    )) return;

    setBusy("approve");
    try {
      const res = await axios.post(`${API_URL}/payouts/staff/batch/${period}/approve`, {
        approvedBy: actorEmail,
      });
      setRows(res.data.batch || []);
      setTotals(res.data.totals);
      toast.success(`${res.data.approved} payment(s) approved.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not approve the batch.");
    } finally {
      setBusy(null);
    }
  };

  const pendingCount = rows.filter((r) => r.status === "pending_approval").length;
  const heldCount = rows.filter((r) => r.status === "on_hold").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-emerald-600" /> Monthly payout batch
            </CardTitle>
            <CardDescription className="mt-1">
              Calculate what each tutor earned, review it, then release. Approving records the
              decision — it does not send money.
            </CardDescription>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {periods.map((p) => (
                <SelectItem key={p} value={p}>{periodLabel(p)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={preview} disabled={loading || !!busy}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Preview (saves nothing)
          </Button>
          <Button variant="outline" size="sm" onClick={generate} disabled={loading || !!busy}>
            {busy === "generate" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Generate batch
          </Button>
          <Button size="sm" onClick={approve} disabled={loading || !!busy || !generated || !pendingCount}>
            {busy === "approve" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Approve {pendingCount || ""} payment{pendingCount === 1 ? "" : "s"}
          </Button>
        </div>

        {totals && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Collected for delivered classes" value={rupees(totals.gross)} />
            <Stat label="Platform share" value={rupees(totals.commission)} />
            <Stat label="Payable to tutors" value={rupees(totals.net)} accent />
            <Stat label="Held back — unconfirmed" value={rupees(totals.unconfirmed)} warn={totals.unconfirmed > 0} />
          </div>
        )}

        {isPreview && (
          <p className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              These are <strong>calculated figures, not saved</strong>. No batch has been generated
              for {periodLabel(period)} yet. Click <strong>Generate batch</strong> to record them
              before they can be approved.
            </span>
          </p>
        )}

        {totals && totals.unconfirmed > 0 && (
          <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              <strong>{rupees(totals.unconfirmed)}</strong> is not included above. Those classes
              were paid for and their scheduled time has passed, but nobody marked them as
              delivered — so they are held rather than paid. Confirm or cancel them, then
              regenerate.
            </span>
          </p>
        )}

        {heldCount > 0 && (
          <p className="flex items-start gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-900 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-200">
            <PauseCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{heldCount} tutor(s) are on hold, usually because their bank details are not
            verified yet. They stay on hold and are paid in a later run.</span>
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-14 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Working…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-dashed py-14 text-center text-muted-foreground">
            <Info className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-foreground">Nothing for {periodLabel(period)}</p>
            <p className="text-sm">No tutor delivered a paid class in this month, or the batch has not been generated.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tutor</TableHead>
                  <TableHead className="text-right">Classes</TableHead>
                  <TableHead className="text-right">Collected</TableHead>
                  <TableHead className="text-right">Platform</TableHead>
                  <TableHead className="text-right">Tutor receives</TableHead>
                  <TableHead className="text-right">Held</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r._id}>
                    <TableCell>
                      <div className="font-medium">{r.tutorName}</div>
                      <div className="text-xs text-muted-foreground">{r.tutorEmail}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.sessionCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{rupees(r.grossAmount)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {rupees(r.commissionAmount)}
                      <span className="ml-1 text-xs">({Math.round((r.commissionRate ?? 0) * 100)}%)</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{rupees(r.netAmount)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.unconfirmedAmount > 0
                        ? <span className="text-amber-700 dark:text-amber-400">{rupees(r.unconfirmedAmount)}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.destinationSnapshot?.accountLast4
                        ? <>••••{r.destinationSnapshot.accountLast4}<br />{r.destinationSnapshot.ifsc}</>
                        : "Not set"}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${STATUS_TONE[r.status] || ""} border-0 whitespace-nowrap`}>
                        {STATUS_LABEL[r.status] || r.status}
                      </Badge>
                      {r.holdReason && (
                        <div className="mt-1 text-xs text-muted-foreground max-w-[180px]">{r.holdReason}</div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <p className="border-t pt-4 text-xs text-muted-foreground">
          Regenerating a month recalculates rows that are still awaiting approval and leaves
          anything already approved or paid untouched, so it is safe to run more than once.
        </p>
      </CardContent>
    </Card>
  );
};

const Stat = ({ label, value, accent, warn }: {
  label: string; value: string; accent?: boolean; warn?: boolean;
}) => (
  <div className="rounded-lg border bg-card p-4">
    <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
    <span className={`mt-1 block text-2xl font-bold tabular-nums ${
      accent ? "text-emerald-600" : warn ? "text-amber-600" : "text-foreground"}`}>
      {value}
    </span>
  </div>
);

export default PayoutBatchPanel;
