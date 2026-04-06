import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  DollarSign,
  Loader2,
  Lock,
  Settings,
  Target,
  TrendingUp,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetAllTips,
  useGetGoal,
  useGetTotalTipsAmount,
  useIsCallerAdmin,
  useIsStripeConfigured,
  useSetGoal,
  useSetStripeConfiguration,
} from "../hooks/useQueries";

function formatDate(nanoseconds: bigint): string {
  const ms = Number(nanoseconds / 1_000_000n);
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    completed: "bg-green-900/40 text-green-300 border-green-700/50",
    pending: "bg-amber-900/40 text-amber-300 border-amber-700/50",
    failed: "bg-red-900/40 text-red-300 border-red-700/50",
  };
  const cls =
    variants[status.toLowerCase()] ??
    "bg-muted/40 text-muted-foreground border-border";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}
    >
      {status}
    </span>
  );
}

interface AdminPageProps {
  onNavigate: (path: string) => void;
}

export default function AdminPage({ onNavigate }: AdminPageProps) {
  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const isAuthenticated = !!identity;

  const { data: isAdmin, isLoading: adminLoading } = useIsCallerAdmin();
  const { data: allTips, isLoading: tipsLoading } = useGetAllTips();
  const { data: totalCents, isLoading: totalLoading } = useGetTotalTipsAmount();
  const { data: stripeConfigured } = useIsStripeConfigured();
  const { data: currentGoalCents } = useGetGoal();
  const setStripeConfig = useSetStripeConfiguration();
  const setGoalMutation = useSetGoal();

  const [secretKey, setSecretKey] = useState("");
  const [allowedCountries, setAllowedCountries] = useState("US");
  const [showStripeForm, setShowStripeForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalDollars, setGoalDollars] = useState("");

  const handleAuth = async () => {
    if (isAuthenticated) {
      await clear();
      queryClient.clear();
    } else {
      try {
        await login();
      } catch (err: any) {
        console.error("Login error:", err);
      }
    }
  };

  const handleSaveStripe = async () => {
    if (!secretKey.trim()) {
      toast.error("Please enter your Stripe secret key.");
      return;
    }
    const countries = allowedCountries
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
    if (countries.length === 0) {
      toast.error("Please enter at least one allowed country.");
      return;
    }
    try {
      await setStripeConfig.mutateAsync({
        secretKey: secretKey.trim(),
        allowedCountries: countries,
      });
      toast.success("Stripe configured successfully! 🎉");
      setSecretKey("");
      setShowStripeForm(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save Stripe configuration.");
    }
  };

  const handleSaveGoal = async () => {
    const val = Number.parseFloat(goalDollars);
    if (Number.isNaN(val) || val < 1) {
      toast.error("Please enter a valid goal amount (at least $1).");
      return;
    }
    try {
      await setGoalMutation.mutateAsync(BigInt(Math.round(val * 100)));
      toast.success("Fundraising goal updated! 🎯");
      setGoalDollars("");
      setShowGoalForm(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update goal.");
    }
  };

  const totalDollars = totalCents
    ? (Number(totalCents) / 100).toFixed(2)
    : "0.00";

  const currentGoalDisplay =
    currentGoalCents && currentGoalCents > 0n
      ? `$${(Number(currentGoalCents) / 100).toFixed(Number(currentGoalCents) % 100 === 0 ? 0 : 2)}`
      : "Not set";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-warm-500/40 backdrop-blur-md bg-background/80">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate("/")}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
              data-ocid="nav.link"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <span className="text-warm-400">/</span>
            <div className="flex items-center gap-2">
              <span className="text-xl">🫙</span>
              <span className="font-display font-bold text-foreground">
                Admin Dashboard
              </span>
            </div>
          </div>
          <Button
            onClick={handleAuth}
            disabled={loginStatus === "logging-in"}
            variant={isAuthenticated ? "outline" : "default"}
            className={`rounded-full text-sm ${
              isAuthenticated
                ? "border-warm-400 text-muted-foreground hover:text-foreground"
                : "btn-amber text-warm-900 border-0"
            }`}
            data-ocid="admin.primary_button"
          >
            {loginStatus === "logging-in" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Logging in…
              </>
            ) : isAuthenticated ? (
              "Logout"
            ) : (
              "Login"
            )}
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12">
        {!isAuthenticated ? (
          /* Not logged in */
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-32 text-center"
            data-ocid="admin.card"
          >
            <div className="w-20 h-20 rounded-full bg-amber-glow/10 border border-amber-glow/30 flex items-center justify-center mb-6">
              <Lock className="w-8 h-8 text-amber-glow" />
            </div>
            <h2 className="font-display text-3xl font-bold text-foreground mb-3">
              Admin Access
            </h2>
            <p className="text-muted-foreground mb-8 max-w-sm">
              Log in with Internet Identity to manage your tip jar and configure
              Stripe payments.
            </p>
            <Button
              onClick={handleAuth}
              disabled={loginStatus === "logging-in"}
              className="btn-amber text-warm-900 border-0 rounded-full px-8 py-5 font-semibold text-base"
              data-ocid="admin.submit_button"
            >
              {loginStatus === "logging-in" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Logging in…
                </>
              ) : (
                "Login to Admin"
              )}
            </Button>
          </motion.div>
        ) : adminLoading ? (
          <div
            className="flex items-center justify-center py-32"
            data-ocid="admin.loading_state"
          >
            <Loader2 className="w-8 h-8 animate-spin text-amber-glow" />
          </div>
        ) : !isAdmin ? (
          /* Not admin */
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-32 text-center"
            data-ocid="admin.error_state"
          >
            <div className="w-20 h-20 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center mb-6">
              <Lock className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="font-display text-3xl font-bold text-foreground mb-3">
              Access Denied
            </h2>
            <p className="text-muted-foreground">
              You don't have admin privileges for this tip jar.
            </p>
          </motion.div>
        ) : (
          /* Admin dashboard */
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="font-display text-3xl font-bold text-gradient-amber mb-1">
                Dashboard
              </h1>
              <p className="text-muted-foreground text-sm">
                Manage your tip jar and view earnings.
              </p>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <div
                className="card-warm rounded-2xl p-6 shadow-card flex items-center gap-4"
                data-ocid="admin.card"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-glow/15 border border-amber-glow/30 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-amber-glow" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">
                    Total Earned
                  </p>
                  {totalLoading ? (
                    <div className="h-8 w-24 bg-warm-600/40 rounded animate-pulse" />
                  ) : (
                    <p className="font-display text-3xl font-bold text-gradient-amber">
                      ${totalDollars}
                    </p>
                  )}
                </div>
              </div>
              <div
                className="card-warm rounded-2xl p-6 shadow-card flex items-center gap-4"
                data-ocid="admin.card"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-glow/15 border border-amber-glow/30 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-amber-glow" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">
                    Total Tips
                  </p>
                  {tipsLoading ? (
                    <div className="h-8 w-16 bg-warm-600/40 rounded animate-pulse" />
                  ) : (
                    <p className="font-display text-3xl font-bold text-gradient-amber">
                      {allTips?.length ?? 0}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Fundraising Goal */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="card-warm rounded-2xl p-6 shadow-card"
              data-ocid="admin.card"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-glow/15 border border-amber-glow/30 flex items-center justify-center">
                    <Target className="w-5 h-5 text-amber-glow" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-foreground">
                      Fundraising Goal
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Current goal:{" "}
                      <span className="text-amber-soft font-semibold">
                        {currentGoalDisplay}
                      </span>
                    </p>
                  </div>
                </div>
                {currentGoalCents && currentGoalCents > 0n ? (
                  <div className="flex items-center gap-1.5 text-green-400 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Active</span>
                  </div>
                ) : (
                  <Badge className="bg-amber-glow/20 text-amber-soft border-amber-glow/30 text-xs">
                    Not set
                  </Badge>
                )}
              </div>

              <AnimatePresence mode="wait">
                {!showGoalForm ? (
                  <motion.div
                    key="goal-button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Button
                      onClick={() => {
                        setShowGoalForm(true);
                        if (currentGoalCents && currentGoalCents > 0n) {
                          setGoalDollars(
                            (Number(currentGoalCents) / 100).toString(),
                          );
                        }
                      }}
                      variant="outline"
                      className="border-warm-400 text-foreground hover:bg-warm-600/40 rounded-xl"
                      data-ocid="admin.edit_button"
                    >
                      {currentGoalCents && currentGoalCents > 0n
                        ? "Update Goal"
                        : "Set Goal"}
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="goal-form"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-4 pt-1">
                      <div>
                        <Label
                          htmlFor="goal-amount"
                          className="text-sm font-semibold text-foreground mb-2 block"
                        >
                          Goal Amount (USD)
                        </Label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                            $
                          </span>
                          <Input
                            id="goal-amount"
                            type="number"
                            min="1"
                            step="1"
                            placeholder="100"
                            value={goalDollars}
                            onChange={(e) => setGoalDollars(e.target.value)}
                            className="pl-8 rounded-xl bg-warm-700/60 border-warm-500 focus:border-amber-glow focus:ring-amber-glow/30"
                            data-ocid="admin.input"
                          />
                        </div>
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          This goal will appear as a progress bar on your public
                          tip page.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onClick={handleSaveGoal}
                          disabled={setGoalMutation.isPending}
                          className="btn-amber text-warm-900 border-0 rounded-xl font-semibold"
                          data-ocid="admin.save_button"
                        >
                          {setGoalMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving…
                            </>
                          ) : (
                            "Save Goal"
                          )}
                        </Button>
                        <Button
                          onClick={() => {
                            setShowGoalForm(false);
                            setGoalDollars("");
                          }}
                          variant="outline"
                          className="border-warm-400 rounded-xl"
                          data-ocid="admin.cancel_button"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Stripe Configuration */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card-warm rounded-2xl p-6 shadow-card"
              data-ocid="admin.card"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-glow/15 border border-amber-glow/30 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-amber-glow" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-foreground">
                      Stripe Configuration
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {stripeConfigured
                        ? "Payments are active"
                        : "Configure to accept payments"}
                    </p>
                  </div>
                </div>
                {stripeConfigured ? (
                  <div className="flex items-center gap-1.5 text-green-400 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Active</span>
                  </div>
                ) : (
                  <Badge className="bg-amber-glow/20 text-amber-soft border-amber-glow/30 text-xs">
                    Not configured
                  </Badge>
                )}
              </div>

              {!showStripeForm ? (
                <Button
                  onClick={() => setShowStripeForm(true)}
                  variant="outline"
                  className="border-warm-400 text-foreground hover:bg-warm-600/40 rounded-xl"
                  data-ocid="admin.edit_button"
                >
                  {stripeConfigured ? "Update Stripe Keys" : "Configure Stripe"}
                </Button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor="stripe-key"
                      className="text-sm font-semibold text-foreground mb-2 block"
                    >
                      Stripe Secret Key
                    </Label>
                    <Input
                      id="stripe-key"
                      type="password"
                      placeholder="sk_live_..."
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                      className="rounded-xl bg-warm-700/60 border-warm-500 focus:border-amber-glow focus:ring-amber-glow/30"
                      data-ocid="admin.input"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="allowed-countries"
                      className="text-sm font-semibold text-foreground mb-2 block"
                    >
                      Allowed Countries
                    </Label>
                    <Input
                      id="allowed-countries"
                      placeholder="US, CA, GB"
                      value={allowedCountries}
                      onChange={(e) => setAllowedCountries(e.target.value)}
                      className="rounded-xl bg-warm-700/60 border-warm-500 focus:border-amber-glow focus:ring-amber-glow/30"
                      data-ocid="admin.input"
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Comma-separated country codes (e.g. US, CA, GB)
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleSaveStripe}
                      disabled={setStripeConfig.isPending}
                      className="btn-amber text-warm-900 border-0 rounded-xl font-semibold"
                      data-ocid="admin.save_button"
                    >
                      {setStripeConfig.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                          Saving…
                        </>
                      ) : (
                        "Save Configuration"
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowStripeForm(false);
                        setSecretKey("");
                      }}
                      variant="outline"
                      className="border-warm-400 rounded-xl"
                      data-ocid="admin.cancel_button"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Tips Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card-warm rounded-2xl shadow-card overflow-hidden"
              data-ocid="admin.table"
            >
              <div className="px-6 py-5 border-b border-warm-500/40">
                <h2 className="font-display font-bold text-foreground">
                  All Tips
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {allTips?.length ?? 0} tips received
                </p>
              </div>
              {tipsLoading ? (
                <div
                  className="p-8 flex items-center justify-center"
                  data-ocid="admin.loading_state"
                >
                  <Loader2 className="w-6 h-6 animate-spin text-amber-glow" />
                </div>
              ) : !allTips || allTips.length === 0 ? (
                <div
                  className="p-12 text-center text-muted-foreground"
                  data-ocid="admin.empty_state"
                >
                  <div className="text-4xl mb-3">🫙</div>
                  <p className="font-medium">No tips yet</p>
                  <p className="text-sm mt-1">
                    Share your tip jar link to start receiving tips!
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-warm-500/40 hover:bg-transparent">
                      <TableHead className="text-muted-foreground font-semibold">
                        #
                      </TableHead>
                      <TableHead className="text-muted-foreground font-semibold">
                        Sender
                      </TableHead>
                      <TableHead className="text-muted-foreground font-semibold">
                        Message
                      </TableHead>
                      <TableHead className="text-muted-foreground font-semibold">
                        Amount
                      </TableHead>
                      <TableHead className="text-muted-foreground font-semibold">
                        Date
                      </TableHead>
                      <TableHead className="text-muted-foreground font-semibold">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allTips.map((tip, i) => (
                      <TableRow
                        key={`${tip.createdAt}-${i}`}
                        className="border-warm-500/30 hover:bg-warm-700/20 transition-colors"
                        data-ocid={`admin.row.item.${i + 1}`}
                      >
                        <TableCell className="text-muted-foreground text-sm">
                          {i + 1}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {tip.sender || (
                            <span className="text-muted-foreground italic">
                              Anonymous
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[200px]">
                          <span className="line-clamp-1">
                            {tip.message || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="font-semibold text-amber-soft">
                          ${(Number(tip.amount) / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(tip.createdAt)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={tip.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </motion.div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-warm-500/40 py-6 mt-auto">
        <div className="max-w-5xl mx-auto px-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()}. Built with{" "}
          <span className="text-amber-glow">♥</span> using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-glow hover:underline"
          >
            caffeine.ai
          </a>
        </div>
      </footer>
    </div>
  );
}
