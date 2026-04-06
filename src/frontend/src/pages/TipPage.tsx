import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Heart,
  Loader2,
  Lock,
  Users,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Tip } from "../backend.d";
import {
  useCreateTip,
  useGetGoal,
  useGetPublicStats,
  useIsStripeConfigured,
} from "../hooks/useQueries";

const PRESET_AMOUNTS = [
  { label: "$5", cents: 500n },
  { label: "$10", cents: 1000n },
  { label: "$25", cents: 2500n },
];

function FloatingCoin({
  style,
  delay,
}: { style: React.CSSProperties; delay: number }) {
  return (
    <div
      className="absolute pointer-events-none select-none text-3xl opacity-15 animate-float"
      style={{
        ...style,
        animationDelay: `${delay}s`,
        animationDuration: `${4 + delay}s`,
      }}
    >
      🪙
    </div>
  );
}

function ConfettiBurst({ active }: { active: boolean }) {
  const [pieces, setPieces] = useState<
    { id: number; x: number; color: string; dur: number; delay: number }[]
  >([]);
  const colors = [
    "oklch(0.82 0.18 75)",
    "oklch(0.78 0.17 55)",
    "oklch(0.72 0.20 45)",
    "oklch(0.85 0.15 90)",
    "oklch(0.68 0.22 35)",
  ];

  useEffect(() => {
    if (!active) return;
    const ps = Array.from({ length: 28 }, (_, i) => ({
      id: Date.now() + i,
      x: 20 + Math.random() * 60,
      color: colors[Math.floor(Math.random() * colors.length)],
      dur: 1.4 + Math.random() * 1.2,
      delay: Math.random() * 0.4,
    }));
    setPieces(ps);
    const t = setTimeout(() => setPieces([]), 3500);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute w-2.5 h-2.5 rounded-sm"
          style={{
            left: `${p.x}%`,
            top: "20%",
            background: p.color,
            animation: `confetti-drift ${p.dur}s ease-in forwards`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function getInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

function formatAmount(cents: bigint): string {
  const dollars = Number(cents) / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

function GoalProgressSection() {
  const { data: goalCents, isLoading: goalLoading } = useGetGoal();
  const { data: stats, isLoading: statsLoading } = useGetPublicStats();

  if (goalLoading || statsLoading) {
    return (
      <div className="card-warm rounded-2xl p-6 shadow-card mb-6 animate-pulse">
        <div className="h-4 bg-warm-600/40 rounded w-1/3 mb-4" />
        <div className="h-3 bg-warm-600/40 rounded-full mb-3" />
        <div className="h-3 bg-warm-600/40 rounded w-1/2" />
      </div>
    );
  }

  if (!goalCents || goalCents === 0n) return null;

  const totalCents = stats?.totalAmountCents ?? 0n;
  const percent = Math.min(
    100,
    Math.round((Number(totalCents) / Number(goalCents)) * 100),
  );
  const totalDollars = Number(totalCents) / 100;
  const goalDollars = Number(goalCents) / 100;
  const tipCount = stats?.tipCount ?? 0n;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="card-warm rounded-2xl p-6 shadow-card mb-6"
      data-ocid="goal.card"
    >
      <p className="text-sm font-semibold text-foreground mb-3">
        Help me reach{" "}
        <span className="text-amber-glow">
          ${goalDollars % 1 === 0 ? goalDollars : goalDollars.toFixed(2)}!
        </span>
      </p>
      <div
        className="relative h-3 rounded-full bg-warm-600/50 overflow-hidden mb-3"
        role="progressbar"
        tabIndex={0}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        data-ocid="goal.panel"
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, oklch(0.72 0.20 55), oklch(0.82 0.22 75))",
          }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          <span className="text-amber-soft font-semibold">
            ${totalDollars % 1 === 0 ? totalDollars : totalDollars.toFixed(2)}
          </span>{" "}
          raised of{" "}
          <span className="font-medium text-foreground">
            ${goalDollars % 1 === 0 ? goalDollars : goalDollars.toFixed(2)}
          </span>{" "}
          goal
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {Number(tipCount)} supporter{Number(tipCount) !== 1 ? "s" : ""}
        </span>
      </div>
    </motion.div>
  );
}

function RecentSupportersSection() {
  const { data: stats, isLoading } = useGetPublicStats();

  if (isLoading) {
    return (
      <div className="card-warm rounded-2xl p-6 shadow-card mb-6 animate-pulse">
        <div className="h-4 bg-warm-600/40 rounded w-1/3 mb-4" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-warm-600/40 rounded-full" />
            <div className="flex-1">
              <div className="h-3 bg-warm-600/40 rounded w-1/4 mb-1.5" />
              <div className="h-2.5 bg-warm-600/30 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const recentTips: Tip[] = stats?.recentTips?.slice(0, 5) ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="card-warm rounded-2xl p-6 shadow-card mb-6"
      data-ocid="supporters.card"
    >
      <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
        Recent Supporters 💛
      </h3>
      {recentTips.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-6 text-center"
          data-ocid="supporters.empty_state"
        >
          <div className="text-3xl mb-2">🫙</div>
          <p className="text-muted-foreground text-sm">
            Be the first to support!
          </p>
        </div>
      ) : (
        <ul className="space-y-3" data-ocid="supporters.list">
          {recentTips.map((tip, i) => (
            <motion.li
              key={`${tip.timestamp}-${i}`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.07 }}
              className="flex items-center gap-3"
              data-ocid={`supporters.item.${i + 1}`}
            >
              <Avatar className="w-9 h-9 flex-shrink-0">
                <AvatarFallback
                  className="text-sm font-bold text-warm-900"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.82 0.18 75), oklch(0.72 0.20 55))",
                  }}
                >
                  {getInitial(tip.sender || "")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {tip.sender?.trim() || "Anonymous"}
                  </span>
                  <span className="text-sm font-bold text-amber-glow flex-shrink-0">
                    {formatAmount(tip.amount)}
                  </span>
                </div>
                {tip.message?.trim() && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {tip.message.trim()}
                  </p>
                )}
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

interface TipPageProps {
  onNavigate: (path: string) => void;
}

export default function TipPage({ onNavigate }: TipPageProps) {
  const { data: stripeConfigured, isLoading: stripeLoading } =
    useIsStripeConfigured();
  const createTip = useCreateTip();

  const [selectedAmount, setSelectedAmount] = useState<bigint | null>(1000n);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "canceled">("idle");
  const [confetti, setConfetti] = useState(false);

  // Check URL params on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      setStatus("success");
      setConfetti(true);
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("canceled") === "true") {
      setStatus("canceled");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const getAmountCents = (): bigint | null => {
    if (isCustom) {
      const val = Number.parseFloat(customAmount);
      if (Number.isNaN(val) || val <= 0) return null;
      return BigInt(Math.round(val * 100));
    }
    return selectedAmount;
  };

  const handleSendTip = async () => {
    if (!stripeConfigured) {
      toast.error("Stripe is not configured yet.");
      return;
    }
    const amountCents = getAmountCents();
    if (!amountCents || amountCents <= 0n) {
      toast.error("Please select or enter a valid amount.");
      return;
    }
    const base = window.location.href.split("?")[0];
    const successUrl = `${base}?success=true`;
    const cancelUrl = `${base}?canceled=true`;
    try {
      const session = await createTip.mutateAsync({
        amount: amountCents,
        currency: "usd",
        message: message.trim(),
        sender: name.trim(),
        successUrl,
        cancelUrl,
      });
      if (!session?.url) {
        toast.error("Could not start checkout. Please try again.");
        return;
      }
      window.location.href = session.url;
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    }
  };

  const amountLabel = () => {
    const cents = getAmountCents();
    if (!cents) return "Send Tip";
    return `Send $${(Number(cents) / 100).toFixed(cents % 100n === 0n ? 0 : 2)} Tip`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-warm-500/40 backdrop-blur-md bg-background/80">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🫙</span>
            <span className="font-display text-xl font-bold text-foreground">
              Tip Jar
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground border border-warm-500/40 rounded-full px-3 py-1.5">
            <Lock className="w-3 h-3" />
            <span>Powered by Stripe</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        {/* Stripe not configured */}
        <AnimatePresence>
          {!stripeLoading && stripeConfigured === false && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full max-w-md mb-6 rounded-2xl border border-amber-deep/40 bg-amber-deep/10 px-5 py-4 text-sm text-amber-soft text-center"
              data-ocid="stripe.error_state"
            >
              ⚠️ Payments aren't set up yet. Check back soon!
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating decorations */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <FloatingCoin style={{ top: "15%", left: "8%" }} delay={0} />
          <FloatingCoin style={{ top: "30%", right: "6%" }} delay={1.5} />
          <FloatingCoin style={{ bottom: "25%", left: "5%" }} delay={0.8} />
          <FloatingCoin style={{ bottom: "15%", right: "10%" }} delay={2.2} />
          <FloatingCoin style={{ top: "55%", left: "3%" }} delay={3.1} />
          <FloatingCoin style={{ top: "70%", right: "4%" }} delay={1.0} />
        </div>

        <AnimatePresence mode="wait">
          {status === "success" ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative flex flex-col items-center gap-5 text-center max-w-sm"
              data-ocid="tip.success_state"
            >
              <ConfettiBurst active={confetti} />
              <div className="w-24 h-24 rounded-full bg-amber-glow/20 border-2 border-amber-glow flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-amber-glow" />
              </div>
              <h2 className="font-display text-3xl font-bold text-gradient-amber">
                Thank you! 🎉
              </h2>
              <p className="text-muted-foreground">
                Your tip was sent successfully. You're wonderful!
              </p>
              <Button
                onClick={() => setStatus("idle")}
                className="mt-2 rounded-full btn-amber text-warm-900 font-semibold"
                data-ocid="tip.secondary_button"
              >
                Send another tip
              </Button>
            </motion.div>
          ) : status === "canceled" ? (
            <motion.div
              key="canceled"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-5 text-center max-w-sm"
              data-ocid="tip.error_state"
            >
              <div className="w-24 h-24 rounded-full bg-destructive/10 border-2 border-destructive/50 flex items-center justify-center">
                <XCircle className="w-12 h-12 text-destructive" />
              </div>
              <h2 className="font-display text-3xl font-bold text-foreground">
                No worries!
              </h2>
              <p className="text-muted-foreground">
                Payment was canceled. You can try again whenever you're ready.
              </p>
              <Button
                onClick={() => setStatus("idle")}
                className="mt-2 rounded-full btn-amber text-warm-900 font-semibold"
                data-ocid="tip.secondary_button"
              >
                Try again
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-md"
            >
              {/* Goal Progress Bar */}
              <GoalProgressSection />

              {/* Recent Supporters */}
              <RecentSupportersSection />

              {/* Hero text */}
              <div className="text-center mb-10">
                <motion.div
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="inline-flex items-center gap-1.5 text-amber-glow text-sm font-semibold mb-4 bg-amber-glow/10 border border-amber-glow/20 rounded-full px-4 py-1.5">
                    <Heart className="w-3.5 h-3.5" />
                    <span>Show your appreciation</span>
                  </div>
                  <h1 className="font-display text-5xl md:text-6xl font-bold leading-tight mb-4">
                    <span className="text-gradient-warm">Send me</span>
                    <br />
                    <span className="text-gradient-amber">a tip! 🫙</span>
                  </h1>
                  <p className="text-muted-foreground text-base max-w-xs mx-auto">
                    If I've helped you out, a small tip means the world to me.
                  </p>
                </motion.div>
              </div>

              {/* Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="card-warm rounded-3xl p-7 shadow-card"
              >
                {/* Amount selection */}
                <div className="mb-6">
                  <p className="text-sm font-semibold text-foreground mb-3">
                    Choose an amount
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {PRESET_AMOUNTS.map(({ label, cents }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => {
                          setSelectedAmount(cents);
                          setIsCustom(false);
                          setCustomAmount("");
                        }}
                        className={`amount-pill rounded-2xl py-3 text-center font-semibold text-sm transition-all cursor-pointer ${
                          !isCustom && selectedAmount === cents
                            ? "amount-pill-active text-amber-soft"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        data-ocid="tip.toggle"
                      >
                        {label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustom(true);
                        setSelectedAmount(null);
                      }}
                      className={`amount-pill rounded-2xl py-3 text-center font-semibold text-sm transition-all cursor-pointer ${
                        isCustom
                          ? "amount-pill-active text-amber-soft"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      data-ocid="tip.toggle"
                    >
                      Custom
                    </button>
                  </div>

                  <AnimatePresence>
                    {isCustom && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mt-3"
                      >
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                            $
                          </span>
                          <Input
                            type="number"
                            min="1"
                            step="0.01"
                            placeholder="0.00"
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                            className="pl-8 rounded-xl bg-warm-700/60 border-warm-500 focus:border-amber-glow focus:ring-amber-glow/30"
                            data-ocid="tip.input"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Name */}
                <div className="mb-4">
                  <Label
                    htmlFor="tip-name"
                    className="text-sm font-semibold text-foreground mb-2 block"
                  >
                    Your name{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="tip-name"
                    placeholder="e.g. Alex"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-xl bg-warm-700/60 border-warm-500 focus:border-amber-glow focus:ring-amber-glow/30"
                    data-ocid="tip.input"
                  />
                </div>

                {/* Message */}
                <div className="mb-6">
                  <Label
                    htmlFor="tip-message"
                    className="text-sm font-semibold text-foreground mb-2 block"
                  >
                    Message{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </Label>
                  <Textarea
                    id="tip-message"
                    placeholder="Keep up the great work! ✨"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    className="rounded-xl bg-warm-700/60 border-warm-500 focus:border-amber-glow focus:ring-amber-glow/30 resize-none"
                    data-ocid="tip.textarea"
                  />
                </div>

                {/* Submit */}
                <button
                  type="button"
                  onClick={handleSendTip}
                  disabled={
                    createTip.isPending ||
                    stripeLoading ||
                    stripeConfigured === false ||
                    (isCustom &&
                      (!customAmount || Number.parseFloat(customAmount) <= 0))
                  }
                  className="w-full btn-amber animate-glow-pulse rounded-2xl py-4 text-warm-900 font-display font-bold text-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:animate-none transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-glow/40"
                  data-ocid="tip.submit_button"
                >
                  {createTip.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Preparing checkout…
                    </span>
                  ) : (
                    amountLabel()
                  )}
                </button>

                <p className="mt-3 text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3" />
                  Secure checkout via Stripe · No account needed
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-warm-500/40 py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>🫙</span>
            <span className="font-display font-bold text-foreground">
              Tip Jar
            </span>
          </div>
          <p>
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
          </p>
          <button
            type="button"
            onClick={() => onNavigate("/admin")}
            className="text-muted-foreground/50 hover:text-muted-foreground transition-colors text-xs"
            data-ocid="nav.link"
          >
            Admin
          </button>
        </div>
      </footer>
    </div>
  );
}
