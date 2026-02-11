import crypto from "node:crypto";

type CaptchaCategory = "math" | "text" | "logic" | "pattern";

type CaptchaQuestion = {
  id: number;
  prompt: string;
  answer: string;
  category: CaptchaCategory;
};

type CaptchaTokenPayload = {
  questionId: number;
  email: string;
  issuedAt: number;
  expiresAt: number;
};

type AttemptState = {
  failedAttempts: number;
  lockedUntil: number | null;
};

export type CaptchaChallenge = {
  question: string;
  token: string;
  remainingAttempts: number;
};

export type CaptchaVerificationResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
      challenge: CaptchaChallenge | null;
      lockedUntil: number | null;
    };

export type CaptchaChallengeResult =
  | {
      ok: true;
      challenge: CaptchaChallenge;
    }
  | {
      ok: false;
      error: string;
      challenge: null;
      lockedUntil: number | null;
    };

const CAPTCHA_EXPIRY_MS = 5 * 60 * 1000;
const CAPTCHA_LOCK_MS = 5 * 60 * 1000;
const CAPTCHA_MAX_ATTEMPTS = 3;
const CAPTCHA_SUCCESS_COOLDOWN_MS = 5 * 60 * 1000;

const CAPTCHA_QUESTIONS: CaptchaQuestion[] = [
  { id: 1, prompt: "Calculate: (7 * 3) + 8", answer: "29", category: "math" },
  { id: 2, prompt: "What is 25% of 80?", answer: "20", category: "math" },
  { id: 3, prompt: "Solve: 50 - (12 + 7)", answer: "31", category: "math" },
  { id: 4, prompt: "What is 6^2 + 4?", answer: "40", category: "math" },
  { id: 5, prompt: "Calculate: (15 / 3) * 7", answer: "35", category: "math" },
  { id: 6, prompt: "Remove vowels from 'portfolio'", answer: "prtfl", category: "text" },
  {
    id: 7,
    prompt: "Type 'developer' backwards + '123'",
    answer: "repoleved123",
    category: "text",
  },
  {
    id: 8,
    prompt: "First 3 + last 3 of 'javascript'",
    answer: "javipt",
    category: "text",
  },
  {
    id: 9,
    prompt: "Replace 'a' with '1' in 'rayfa'",
    answer: "r1yf1",
    category: "text",
  },
  {
    id: 10,
    prompt: "How many sides does a hexagon have?",
    answer: "6",
    category: "logic",
  },
  {
    id: 11,
    prompt: "If today is Monday, what day is 3 days later?",
    answer: "Thursday",
    category: "logic",
  },
  {
    id: 12,
    prompt: "What is the 5th letter of the alphabet?",
    answer: "e",
    category: "logic",
  },
  {
    id: 13,
    prompt: "Spell 'hello' in reverse, CAPITALIZED",
    answer: "OLLEH",
    category: "logic",
  },
  {
    id: 14,
    prompt: "Continue: 1, 1, 2, 3, 5, 8, ?",
    answer: "13",
    category: "pattern",
  },
  {
    id: 15,
    prompt: "Missing: 2, 6, 12, 20, ?, 42",
    answer: "30",
    category: "pattern",
  },
];

const globalForCaptcha = globalThis as unknown as {
  __captchaAttemptMap?: Map<string, AttemptState>;
  __captchaCooldownMap?: Map<string, number>;
};

const attemptMap =
  globalForCaptcha.__captchaAttemptMap ??
  (globalForCaptcha.__captchaAttemptMap = new Map<string, AttemptState>());

const cooldownMap =
  globalForCaptcha.__captchaCooldownMap ??
  (globalForCaptcha.__captchaCooldownMap = new Map<string, number>());

const getSecret = () =>
  process.env.CAPTCHA_TOKEN_SECRET ||
  process.env.RESEND_API_KEY ||
  "dev-captcha-secret-change-this";

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const createSignature = (value: string) => {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("base64url");
};

const encodePayload = (payload: CaptchaTokenPayload) => {
  const raw = JSON.stringify(payload);
  const payloadPart = Buffer.from(raw, "utf8").toString("base64url");
  const signaturePart = createSignature(payloadPart);
  return `${payloadPart}.${signaturePart}`;
};

const decodePayload = (token: string): CaptchaTokenPayload | null => {
  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) {
    return null;
  }

  const expected = createSignature(payloadPart);
  const providedBuffer = Buffer.from(signaturePart);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const json = Buffer.from(payloadPart, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as CaptchaTokenPayload;
    if (
      typeof parsed.questionId !== "number" ||
      typeof parsed.email !== "string" ||
      typeof parsed.issuedAt !== "number" ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const getAttemptState = (email: string): AttemptState => {
  const key = normalizeEmail(email);
  const existing = attemptMap.get(key);
  if (existing) {
    if (existing.lockedUntil && existing.lockedUntil <= Date.now()) {
      const reset: AttemptState = { failedAttempts: 0, lockedUntil: null };
      attemptMap.set(key, reset);
      return reset;
    }
    return existing;
  }

  const state: AttemptState = { failedAttempts: 0, lockedUntil: null };
  attemptMap.set(key, state);
  return state;
};

const setAttemptState = (email: string, state: AttemptState) => {
  attemptMap.set(normalizeEmail(email), state);
};

const clearAttempts = (email: string) => {
  attemptMap.delete(normalizeEmail(email));
};

const getSendCooldown = (email: string): number | null => {
  const key = normalizeEmail(email);
  const cooldownUntil = cooldownMap.get(key);
  if (!cooldownUntil) {
    return null;
  }

  if (cooldownUntil <= Date.now()) {
    cooldownMap.delete(key);
    return null;
  }

  return cooldownUntil;
};

export const registerSuccessfulSend = (email: string) => {
  cooldownMap.set(normalizeEmail(email), Date.now() + CAPTCHA_SUCCESS_COOLDOWN_MS);
};

const pickQuestion = (excludeId?: number): CaptchaQuestion => {
  const source =
    typeof excludeId === "number"
      ? CAPTCHA_QUESTIONS.filter((question) => question.id !== excludeId)
      : CAPTCHA_QUESTIONS;
  const index = crypto.randomInt(0, source.length);
  return source[index];
};

const getChallengeInternal = (email: string, excludeQuestionId?: number): CaptchaChallenge => {
  const state = getAttemptState(email);
  const question = pickQuestion(excludeQuestionId);

  const now = Date.now();
  const payload: CaptchaTokenPayload = {
    questionId: question.id,
    email: normalizeEmail(email),
    issuedAt: now,
    expiresAt: now + CAPTCHA_EXPIRY_MS,
  };

  return {
    question: question.prompt,
    token: encodePayload(payload),
    remainingAttempts: Math.max(0, CAPTCHA_MAX_ATTEMPTS - state.failedAttempts),
  };
};

const registerFailure = (email: string) => {
  const state = getAttemptState(email);
  const nextFailed = state.failedAttempts + 1;

  if (nextFailed >= CAPTCHA_MAX_ATTEMPTS) {
    const lockedUntil = Date.now() + CAPTCHA_LOCK_MS;
    setAttemptState(email, {
      failedAttempts: CAPTCHA_MAX_ATTEMPTS,
      lockedUntil,
    });

    return {
      lockedUntil,
      isLocked: true,
    };
  }

  setAttemptState(email, {
    failedAttempts: nextFailed,
    lockedUntil: null,
  });

  return {
    lockedUntil: null,
    isLocked: false,
  };
};

export const getCaptchaChallenge = (email: string): CaptchaChallengeResult => {
  const cooldownUntil = getSendCooldown(email);
  if (cooldownUntil) {
    return {
      ok: false,
      error: "You just sent a message. Please wait before sending another one.",
      challenge: null,
      lockedUntil: cooldownUntil,
    };
  }

  const state = getAttemptState(email);

  if (state.lockedUntil && state.lockedUntil > Date.now()) {
    return {
      ok: false,
      error: "Too many failed attempts. Please wait before trying again.",
      challenge: null,
      lockedUntil: state.lockedUntil,
    };
  }

  return {
    ok: true,
    challenge: getChallengeInternal(email),
  };
};

export const verifyCaptchaAnswer = (
  email: string,
  token: string,
  answer: string
): CaptchaVerificationResult => {
  const cooldownUntil = getSendCooldown(email);
  if (cooldownUntil) {
    return {
      ok: false,
      error: "You just sent a message. Please wait before sending another one.",
      challenge: null,
      lockedUntil: cooldownUntil,
    };
  }

  const state = getAttemptState(email);

  if (state.lockedUntil && state.lockedUntil > Date.now()) {
    return {
      ok: false,
      error: "Too many failed attempts. Please wait before trying again.",
      challenge: null,
      lockedUntil: state.lockedUntil,
    };
  }

  const parsed = decodePayload(token);
  if (!parsed) {
    const failure = registerFailure(email);
    if (failure.isLocked) {
      return {
        ok: false,
        error: "Too many failed attempts. Please wait before trying again.",
        challenge: null,
        lockedUntil: failure.lockedUntil,
      };
    }

    return {
      ok: false,
      error: "Verification failed. Please solve a new challenge.",
      challenge: getChallengeInternal(email),
      lockedUntil: null,
    };
  }

  if (parsed.email !== normalizeEmail(email) || parsed.expiresAt <= Date.now()) {
    const failure = registerFailure(email);
    if (failure.isLocked) {
      return {
        ok: false,
        error: "Too many failed attempts. Please wait before trying again.",
        challenge: null,
        lockedUntil: failure.lockedUntil,
      };
    }

    return {
      ok: false,
      error: "Challenge expired. A new one was generated.",
      challenge: getChallengeInternal(email, parsed.questionId),
      lockedUntil: null,
    };
  }

  const question = CAPTCHA_QUESTIONS.find((item) => item.id === parsed.questionId);
  if (!question) {
    const failure = registerFailure(email);
    if (failure.isLocked) {
      return {
        ok: false,
        error: "Too many failed attempts. Please wait before trying again.",
        challenge: null,
        lockedUntil: failure.lockedUntil,
      };
    }

    return {
      ok: false,
      error: "Verification failed. Please solve a new challenge.",
      challenge: getChallengeInternal(email),
      lockedUntil: null,
    };
  }

  if (answer.trim() !== question.answer) {
    const failure = registerFailure(email);
    if (failure.isLocked) {
      return {
        ok: false,
        error: "Too many failed attempts. Please wait before trying again.",
        challenge: null,
        lockedUntil: failure.lockedUntil,
      };
    }

    return {
      ok: false,
      error: "Incorrect answer. A new challenge is ready.",
      challenge: getChallengeInternal(email, question.id),
      lockedUntil: null,
    };
  }

  clearAttempts(email);
  return {
    ok: true,
  };
};
