"use client";

import { AnimatePresence, motion } from "framer-motion";

type CaptchaModalProps = {
  isOpen: boolean;
  question: string;
  answer: string;
  remainingAttempts: number;
  lockSeconds: number | null;
  error: string | null;
  isSubmitting: boolean;
  isSuccess: boolean;
  onAnswerChange: (value: string) => void;
  onSubmit: () => void;
};

export default function CaptchaModal({
  isOpen,
  question,
  answer,
  remainingAttempts,
  lockSeconds,
  error,
  isSubmitting,
  isSuccess,
  onAnswerChange,
  onSubmit,
}: CaptchaModalProps) {
  const isLocked = typeof lockSeconds === "number" && lockSeconds > 0;

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/65 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Human verification"
        >
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-[#0e162a] text-slate-100 shadow-[0_24px_80px_rgba(8,15,35,0.55)]"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 230, damping: 24 }}
          >
            <div className="pointer-events-none absolute -right-20 -top-16 h-48 w-48 rounded-full bg-cyan-300/20 blur-3xl" />
            <div className="pointer-events-none absolute -left-16 -bottom-20 h-52 w-52 rounded-full bg-emerald-300/20 blur-3xl" />

            <div className="relative border-b border-slate-700/70 px-6 py-4">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-cyan-200/90">
                Human checkpoint
              </p>
              <h3 className="mt-2 text-xl font-semibold text-white">Solve the puzzle before sending</h3>
            </div>

            <div className="relative space-y-4 px-6 py-6">
              {isSuccess ? (
                <motion.div
                  className="rounded-xl border border-emerald-300/30 bg-emerald-500/15 px-4 py-5 text-center"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <motion.div
                    className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-400 text-lg font-bold text-slate-900"
                    initial={{ rotate: -20, scale: 0.8 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ duration: 0.35 }}
                  >
                    ✓
                  </motion.div>
                  <p className="text-sm font-medium text-emerald-100">Verified. Sending your message...</p>
                </motion.div>
              ) : (
                <>
                  <div className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Challenge</p>
                    <p className="mt-2 font-mono text-lg leading-7 text-cyan-100">{question}</p>
                  </div>

                  <div>
                    <input
                      className="h-12 w-full rounded-lg border border-slate-600 bg-slate-950/60 px-4 text-base text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30 disabled:cursor-not-allowed disabled:opacity-60"
                      value={answer}
                      onChange={(event) => onAnswerChange(event.target.value)}
                      placeholder="Type exact answer"
                      autoComplete="off"
                      disabled={isSubmitting || isLocked}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          onSubmit();
                        }
                      }}
                    />
                    <p className="mt-2 text-xs text-slate-400">
                      Attempts left: <span className="font-semibold text-cyan-200">{remainingAttempts}</span>
                    </p>
                  </div>

                  {error ? (
                    <motion.p
                      className="rounded-md border border-rose-300/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-100"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      {error}
                    </motion.p>
                  ) : null}

                  {isLocked ? (
                    <p className="text-xs uppercase tracking-[0.2em] text-amber-200">
                      Please wait {lockSeconds}s before trying again.
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={onSubmit}
                    disabled={isSubmitting || isLocked || answer.length === 0}
                    className="group flex h-12 w-full items-center justify-center rounded-lg border border-cyan-300/40 bg-cyan-400/15 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Checking..." : "Verify and send"}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
