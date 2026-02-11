"use server";

import { getCaptchaChallenge } from "@/lib/captcha";
import { validateString } from "@/lib/utils";

type GenerateCaptchaResult =
  | {
      challenge: {
        question: string;
        token: string;
        remainingAttempts: number;
      };
    }
  | {
      error: string;
      lockedUntil: number | null;
    };

export async function generateCaptcha(senderEmail: string): Promise<GenerateCaptchaResult> {
  if (!validateString(senderEmail, 500) || !senderEmail.includes("@")) {
    return {
      error: "Please provide a valid email before solving the challenge.",
      lockedUntil: null,
    };
  }

  const challengeResult = getCaptchaChallenge(senderEmail);
  if (!challengeResult.ok) {
    return {
      error: challengeResult.error,
      lockedUntil: challengeResult.lockedUntil,
    };
  }

  return {
    challenge: challengeResult.challenge,
  };
}
