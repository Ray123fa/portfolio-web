"use server";

import React from "react";
import { Resend } from "resend";
import { validateString, getErrorMessage } from "@/lib/utils";
import ContactFormEmail from "@/email/contact-form-email";
import { registerSuccessfulSend, verifyCaptchaAnswer } from "@/lib/captcha";

const resend = new Resend(process.env.RESEND_API_KEY);

type SendEmailResult = {
  data?: unknown;
  error: string | null;
  captchaChallenge: {
    question: string;
    token: string;
    remainingAttempts: number;
  } | null;
  lockedUntil: number | null;
};

const fail = (
  error: string,
  captchaChallenge: SendEmailResult["captchaChallenge"] = null,
  lockedUntil: number | null = null
): SendEmailResult => ({
  error,
  captchaChallenge,
  lockedUntil,
});

export const sendEmail = async (formData: FormData): Promise<SendEmailResult> => {
  const senderEmail = formData.get("senderEmail");
  const message = formData.get("message");
  const captchaAnswer = formData.get("captchaAnswer");
  const captchaToken = formData.get("captchaToken");

  // simple server-side validation
  if (!validateString(senderEmail, 500)) {
    return fail("Invalid sender email");
  }
  if (!validateString(message, 5000)) {
    return fail("Invalid message");
  }
  if (!validateString(captchaAnswer, 100)) {
    return fail("Captcha answer is required.");
  }
  if (!validateString(captchaToken, 5000)) {
    return fail("Captcha challenge is missing. Please retry.");
  }

  const verification = verifyCaptchaAnswer(senderEmail, captchaToken, captchaAnswer);
  if (!verification.ok) {
    return fail(verification.error, verification.challenge, verification.lockedUntil);
  }

  let data;
  try {
    data = await resend.emails.send({
      from: "Rayfa Portfolio <noreply@rayfa.my.id>",
      to: "contact@rayfa.my.id",
      subject: "Message from contact form",
      replyTo: senderEmail,
      react: React.createElement(ContactFormEmail, {
        message: message,
        senderEmail: senderEmail,
      }),
    });
    registerSuccessfulSend(senderEmail);
  } catch (error: unknown) {
    return fail(getErrorMessage(error));
  }

  return {
    data,
    error: null,
    captchaChallenge: null,
    lockedUntil: null,
  };
};
