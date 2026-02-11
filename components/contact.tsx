"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { generateCaptcha } from "@/actions/generateCaptcha";
import { sendEmail } from "@/actions/sendEmail";
import { useSectionInView } from "@/lib/hooks";
import CaptchaModal from "./captcha-modal";
import SectionHeading from "./section-heading";

type ContactSnapshot = {
  senderEmail: string;
  message: string;
};

type CaptchaChallengeState = {
  question: string;
  token: string;
  remainingAttempts: number;
};

export default function Contact() {
  const { ref } = useSectionInView("Contact");
  const formRef = useRef<HTMLFormElement>(null);

  const [snapshot, setSnapshot] = useState<ContactSnapshot | null>(null);
  const [challenge, setChallenge] = useState<CaptchaChallengeState | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [isCaptchaOpen, setIsCaptchaOpen] = useState(false);
  const [isPreparingCaptcha, setIsPreparingCaptcha] = useState(false);
  const [isVerifyingCaptcha, setIsVerifyingCaptcha] = useState(false);
  const [isCaptchaSuccess, setIsCaptchaSuccess] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockSeconds, setLockSeconds] = useState<number | null>(null);

  const loadChallenge = useCallback(async (senderEmail: string) => {
    const result = await generateCaptcha(senderEmail);
    if ("error" in result) {
      setChallenge(null);
      setCaptchaError(result.error);
      setLockedUntil(result.lockedUntil);
      return {
        ok: false as const,
        error: result.error,
      };
    }

    setChallenge(result.challenge);
    setCaptchaError(null);
    setLockedUntil(null);
    setLockSeconds(null);
    return {
      ok: true as const,
    };
  }, []);

  useEffect(() => {
    if (!lockedUntil || !isCaptchaOpen || !snapshot) {
      return;
    }

    const tick = async () => {
      const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
      setLockSeconds(remaining);
      if (remaining > 0) {
        return;
      }

      setLockedUntil(null);
      setLockSeconds(null);
      await loadChallenge(snapshot.senderEmail);
      setCaptchaAnswer("");
    };

    void tick();
    const interval = setInterval(() => {
      void tick();
    }, 1000);

    return () => clearInterval(interval);
  }, [lockedUntil, isCaptchaOpen, snapshot, loadChallenge]);

  const handleOpenCaptcha: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (isPreparingCaptcha || isVerifyingCaptcha) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const senderEmail = String(formData.get("senderEmail") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();

    if (!senderEmail || !message) {
      toast.error("Please complete email and message before verification.");
      return;
    }

    setSnapshot({ senderEmail, message });
    setCaptchaAnswer("");
    setCaptchaError(null);
    setIsCaptchaSuccess(false);
    setIsPreparingCaptcha(true);

    const loaded = await loadChallenge(senderEmail);
    setIsPreparingCaptcha(false);

    if (!loaded.ok) {
      toast.error(loaded.error);
      return;
    }

    setIsCaptchaOpen(true);
  };

  const handleCaptchaSubmit = async () => {
    if (!snapshot || !challenge || isVerifyingCaptcha || isCaptchaSuccess) {
      return;
    }

    setIsVerifyingCaptcha(true);
    const payload = new FormData();
    payload.append("senderEmail", snapshot.senderEmail);
    payload.append("message", snapshot.message);
    payload.append("captchaToken", challenge.token);
    payload.append("captchaAnswer", captchaAnswer);

    const result = await sendEmail(payload);
    setIsVerifyingCaptcha(false);

    if (result.error) {
      setCaptchaError(result.error);
      setCaptchaAnswer("");

      if (result.lockedUntil) {
        setLockedUntil(result.lockedUntil);
      }

      if (result.captchaChallenge) {
        setChallenge(result.captchaChallenge);
      }

      return;
    }

    setCaptchaError(null);
    setIsCaptchaSuccess(true);
    toast.success("Email sent successfully!");

    window.setTimeout(() => {
      setIsCaptchaOpen(false);
      setIsCaptchaSuccess(false);
      setChallenge(null);
      setCaptchaAnswer("");
      setSnapshot(null);
      setLockedUntil(null);
      setLockSeconds(null);
      formRef.current?.reset();
    }, 1150);
  };

  return (
    <motion.section
      id="contact"
      ref={ref}
      className="mb-20 w-[min(100%,38rem)] text-center sm:mb-28"
      initial={{
        opacity: 0,
      }}
      whileInView={{
        opacity: 1,
      }}
      transition={{
        duration: 1,
      }}
      viewport={{
        once: true,
      }}
    >
      <SectionHeading>Contact me</SectionHeading>

      <form ref={formRef} className="mt-10 flex flex-col dark:text-black" onSubmit={handleOpenCaptcha}>
        <input
          className="h-14 rounded-lg borderBlack px-4 transition-all dark:bg-white dark:bg-opacity-80 dark:outline-none dark:focus:bg-opacity-100"
          name="senderEmail"
          type="email"
          required
          maxLength={500}
          placeholder="Your email"
          disabled={isPreparingCaptcha || isVerifyingCaptcha}
        />
        <textarea
          className="my-3 h-52 rounded-lg borderBlack p-4 transition-all dark:bg-white dark:bg-opacity-80 dark:outline-none dark:focus:bg-opacity-100"
          name="message"
          placeholder="Your message"
          required
          maxLength={5000}
          disabled={isPreparingCaptcha || isVerifyingCaptcha}
        />
        <button
          type="submit"
          disabled={isPreparingCaptcha || isVerifyingCaptcha}
          className="group flex h-[3rem] w-[11rem] items-center justify-center self-center rounded-full bg-gray-900 text-white outline-none transition-all focus:scale-110 hover:scale-110 hover:bg-gray-950 active:scale-105 disabled:scale-100 disabled:bg-opacity-65 dark:bg-white dark:bg-opacity-10"
        >
          {isPreparingCaptcha ? "Preparing check..." : "Send message"}
        </button>
      </form>

      <CaptchaModal
        isOpen={isCaptchaOpen && !!challenge}
        question={challenge?.question ?? ""}
        answer={captchaAnswer}
        remainingAttempts={challenge?.remainingAttempts ?? 0}
        lockSeconds={lockSeconds}
        error={captchaError}
        isSubmitting={isVerifyingCaptcha}
        isSuccess={isCaptchaSuccess}
        onAnswerChange={setCaptchaAnswer}
        onSubmit={handleCaptchaSubmit}
      />
    </motion.section>
  );
}
