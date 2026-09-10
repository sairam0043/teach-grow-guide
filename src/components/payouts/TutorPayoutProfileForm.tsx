import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import API_URL from "@/config/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, ShieldCheck, AlertCircle, Lock, CheckCircle2, Clock } from "lucide-react";

/**
 * Where a tutor enters the bank and tax details used for monthly payouts.
 *
 * Separate from the existing "Payment Details" tab, which writes
 * tutor.paymentDetails and is what the HR dashboard reads today. This one
 * writes tutor.payoutProfile: it adds the tax identity automated transfers
 * need, stores the account number encrypted, and runs through a verification
 * state machine rather than a single confirmed flag.
 */

interface Props {
  tutorId: string;
}

type ProfileStatus =
  | "not_submitted" | "pending_verification" | "verification_failed"
  | "pending_approval" | "verified" | "rejected";

interface PayoutProfile {
  legalName: string;
  pan: string;
  dateOfBirth: string | null;
  gstin: string;
  accountHolderName: string;
  accountMasked: string;
  ifsc: string;
  accountType: string;
  vpa: string;
  status: ProfileStatus;
  verifiedNameAtBank: string;
  verificationFailureReason: string;
  rejectionReason: string;
  termsAcceptedRate: number | null;
}

const BLANK = {
  legalName: "", pan: "", dateOfBirth: "", gstin: "",
  accountHolderName: "", accountNumber: "", confirmAccountNumber: "",
  ifsc: "", accountType: "savings", vpa: "", acceptTerms: false,
};

// What each state means to the tutor, in their terms rather than the system's.
const STATUS_COPY: Record<ProfileStatus, { label: string; tone: string; icon: typeof Clock; blurb: string }> = {
  not_submitted: {
    label: "Not submitted", tone: "bg-muted text-muted-foreground", icon: AlertCircle,
    blurb: "Add your bank details so you can be paid.",
  },
  pending_verification: {
    label: "Checking your account", tone: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300", icon: Clock,
    blurb: "We send ₹1 to confirm the account exists. This usually takes a few minutes.",
  },
  verification_failed: {
    label: "Account check failed", tone: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300", icon: AlertCircle,
    blurb: "Your bank rejected the test transfer. Please check the account number and IFSC.",
  },
  pending_approval: {
    label: "Awaiting review", tone: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300", icon: Clock,
    blurb: "Your account checked out. Someone on our team reviews it before your first payment.",
  },
  verified: {
    label: "Verified", tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300", icon: CheckCircle2,
    blurb: "You are set up to receive payments.",
  },
  rejected: {
    label: "Not accepted", tone: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300", icon: AlertCircle,
    blurb: "We could not accept these details.",
  },
};

const TutorPayoutProfileForm = ({ tutorId }: Props) => {
  const [form, setForm] = useState({ ...BLANK });
  const [profile, setProfile] = useState<PayoutProfile | null>(null);
  const [commissionRate, setCommissionRate] = useState(0.1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!tutorId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/payouts/tutor/${tutorId}/profile`);
        if (cancelled) return;
        setProfile(res.data.profile);
        setCommissionRate(res.data.commissionRate ?? 0.1);
        const p = res.data.profile;
        if (p?.status && p.status !== "not_submitted") {
          setForm((f) => ({
            ...f,
            legalName: p.legalName || "",
            pan: p.pan || "",
            dateOfBirth: p.dateOfBirth ? String(p.dateOfBirth).slice(0, 10) : "",
            gstin: p.gstin || "",
            accountHolderName: p.accountHolderName || "",
            ifsc: p.ifsc || "",
            accountType: p.accountType || "savings",
            vpa: p.vpa || "",
          }));
        } else {
          setEditing(true);
        }
      } catch {
        if (!cancelled) toast.error("Could not load your payout details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tutorId]);

  const set = (k: keyof typeof BLANK) => (v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async (confirmReplace = false) => {
    setErrors([]);
    setSaving(true);
    try {
      const res = await axios.post(`${API_URL}/payouts/tutor/${tutorId}/profile`, {
        ...form, confirmReplace,
      });
      setProfile(res.data.profile);
      setEditing(false);
      setForm((f) => ({ ...f, accountNumber: "", confirmAccountNumber: "" }));
      toast.success(res.data.message);
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.requiresConfirmation) {
        // Replacing a verified account is the classic payday-fraud route, so
        // it takes a deliberate second step rather than a silent overwrite.
        if (window.confirm(
          "These details are already verified. Replacing them means your account is checked and approved again before your next payment. Continue?"
        )) {
          setSaving(false);
          return submit(true);
        }
      } else if (Array.isArray(data?.errors)) {
        setErrors(data.errors);
        toast.error(data.message || "Please check the highlighted fields.");
      } else {
        toast.error(data?.message || "Could not save your details.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading your payout details…
      </div>
    );
  }

  const status = (profile?.status || "not_submitted") as ProfileStatus;
  const copy = STATUS_COPY[status];
  const StatusIcon = copy.icon;
  const locked = !editing && status !== "not_submitted";

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5 text-emerald-600" /> Payout details
              </CardTitle>
              <CardDescription className="mt-1">
                Where we send your monthly payment. We keep {Math.round(commissionRate * 100)}% and
                you receive {Math.round((1 - commissionRate) * 100)}% of what students paid for the
                classes you delivered.
              </CardDescription>
            </div>
            <Badge className={`${copy.tone} border-0 gap-1.5 px-3 py-1`}>
              <StatusIcon className="h-3.5 w-3.5" /> {copy.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">{copy.blurb}</p>

          {status === "verification_failed" && profile?.verificationFailureReason && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {profile.verificationFailureReason}
            </p>
          )}
          {status === "rejected" && profile?.rejectionReason && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              <strong>Reason:</strong> {profile.rejectionReason}
            </p>
          )}

          {locked ? (
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <Field label="Legal name" value={profile?.legalName} />
              <Field label="PAN" value={profile?.pan} />
              <Field label="Account holder" value={profile?.accountHolderName} />
              <Field label="Account number" value={profile?.accountMasked} />
              <Field label="IFSC" value={profile?.ifsc} />
              <Field label="Account type" value={profile?.accountType} />
              {profile?.vpa ? <Field label="UPI ID" value={profile.vpa} /> : null}
              {profile?.verifiedNameAtBank
                ? <Field label="Name your bank holds" value={profile.verifiedNameAtBank} />
                : null}
              <div className="sm:col-span-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  Change these details
                </Button>
              </div>
            </div>
          ) : (
            <form
              className="space-y-5"
              onSubmit={(e) => { e.preventDefault(); submit(); }}
            >
              {errors.length > 0 && (
                <ul className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 space-y-1 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                  {errors.map((e) => <li key={e}>• {e}</li>)}
                </ul>
              )}

              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Identity</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Row id="legalName" label="Legal name (as on PAN)" required>
                    <Input id="legalName" value={form.legalName}
                      onChange={(e) => set("legalName")(e.target.value)}
                      placeholder="As printed on your PAN card" />
                  </Row>
                  <Row id="pan" label="PAN number" required hint="Format ABCDE1234F">
                    <Input id="pan" value={form.pan} maxLength={10}
                      onChange={(e) => set("pan")(e.target.value.toUpperCase())}
                      placeholder="ABCDE1234F" className="uppercase" />
                  </Row>
                  <Row id="dob" label="Date of birth">
                    <Input id="dob" type="date" value={form.dateOfBirth}
                      onChange={(e) => set("dateOfBirth")(e.target.value)} />
                  </Row>
                  <Row id="gstin" label="GSTIN" hint="Only if you are GST registered">
                    <Input id="gstin" value={form.gstin} maxLength={15}
                      onChange={(e) => set("gstin")(e.target.value.toUpperCase())}
                      placeholder="Leave blank if not registered" className="uppercase" />
                  </Row>
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bank account</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Row id="holder" label="Account holder name" required
                       hint="Exactly as your bank has it, not your display name">
                    <Input id="holder" value={form.accountHolderName}
                      onChange={(e) => set("accountHolderName")(e.target.value)} />
                  </Row>
                  <Row id="ifsc" label="IFSC code" required hint="The 5th character is always a zero">
                    <Input id="ifsc" value={form.ifsc} maxLength={11}
                      onChange={(e) => set("ifsc")(e.target.value.toUpperCase())}
                      placeholder="HDFC0001234" className="uppercase" />
                  </Row>
                  <Row id="acct" label="Account number" required>
                    <Input id="acct" value={form.accountNumber} inputMode="numeric"
                      onChange={(e) => set("accountNumber")(e.target.value.replace(/\D/g, ""))}
                      placeholder="9 to 18 digits" />
                  </Row>
                  <Row id="acct2" label="Confirm account number" required>
                    <Input id="acct2" value={form.confirmAccountNumber} inputMode="numeric"
                      onPaste={(e) => e.preventDefault()}
                      onChange={(e) => set("confirmAccountNumber")(e.target.value.replace(/\D/g, ""))}
                      placeholder="Type it again" />
                  </Row>
                  <Row id="type" label="Account type" required>
                    <Select value={form.accountType} onValueChange={(v) => set("accountType")(v)}>
                      <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="current">Current</SelectItem>
                      </SelectContent>
                    </Select>
                  </Row>
                  <Row id="vpa" label="UPI ID" hint="Optional">
                    <Input id="vpa" value={form.vpa}
                      onChange={(e) => set("vpa")(e.target.value.toLowerCase())}
                      placeholder="yourname@bank" />
                  </Row>
                </div>
              </section>

              <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
                <Checkbox checked={form.acceptTerms}
                  onCheckedChange={(v) => set("acceptTerms")(Boolean(v))} className="mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  I accept the platform commission of{" "}
                  <strong className="text-foreground">{Math.round(commissionRate * 100)}%</strong>{" "}
                  and the payout terms. I confirm these bank details are mine and are correct.
                </span>
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {status === "not_submitted" ? "Submit details" : "Save changes"}
                </Button>
                {status !== "not_submitted" && (
                  <Button type="button" variant="ghost" onClick={() => { setEditing(false); setErrors([]); }}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          )}

          <p className="flex items-start gap-2 border-t pt-4 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            Your account number is stored encrypted and is never shown in full again — only the
            last four digits. Cuvasol staff will never ask you for these details over chat or email.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

const Field = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <span className="block text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
    <span className="font-medium text-foreground">{value || "—"}</span>
  </div>
);

const Row = ({ id, label, required, hint, children }: {
  id: string; label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <Label htmlFor={id}>
      {label} {required && <span className="text-red-500">*</span>}
    </Label>
    {children}
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

export default TutorPayoutProfileForm;
