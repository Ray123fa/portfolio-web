import crypto from "node:crypto";

type CaptchaTokenPayload = {
  answerHash: string;
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

// ---------------------------------------------------------------------------
// Dynamic question generators
// Each returns { prompt, answer } with a randomly generated math problem
// ---------------------------------------------------------------------------

type QuestionGenerator = () => { prompt: string; answer: string };

const generators: QuestionGenerator[] = [
  // (a * b) + c
  () => {
    const a = crypto.randomInt(2, 13);
    const b = crypto.randomInt(2, 13);
    const c = crypto.randomInt(1, 20);
    return { prompt: `Calculate: (${a} * ${b}) + ${c}`, answer: String(a * b + c) };
  },
  // a + b - c  (ensure positive result)
  () => {
    const a = crypto.randomInt(20, 100);
    const b = crypto.randomInt(1, 50);
    const c = crypto.randomInt(1, Math.min(a + b - 1, 50));
    return { prompt: `Solve: ${a} + ${b} - ${c}`, answer: String(a + b - c) };
  },
  // percentage: what is X% of Y
  () => {
    const pcts = [10, 20, 25, 50] as const;
    const pct = pcts[crypto.randomInt(0, pcts.length)];
    const base = crypto.randomInt(2, 21) * (100 / pct); // ensure integer result
    return { prompt: `What is ${pct}% of ${base}?`, answer: String((pct / 100) * base) };
  },
  // a^2 + b
  () => {
    const a = crypto.randomInt(2, 10);
    const b = crypto.randomInt(1, 20);
    return { prompt: `What is ${a}^2 + ${b}?`, answer: String(a * a + b) };
  },
  // (a / b) * c  (ensure clean division)
  () => {
    const b = crypto.randomInt(2, 10);
    const quotient = crypto.randomInt(2, 10);
    const a = b * quotient;
    const c = crypto.randomInt(2, 10);
    return { prompt: `Calculate: (${a} / ${b}) * ${c}`, answer: String(quotient * c) };
  },
  // a * b
  () => {
    const a = crypto.randomInt(3, 15);
    const b = crypto.randomInt(3, 15);
    return { prompt: `What is ${a} x ${b}?`, answer: String(a * b) };
  },
  // a - b + c
  () => {
    const a = crypto.randomInt(50, 100);
    const b = crypto.randomInt(1, 40);
    const c = crypto.randomInt(1, 30);
    return { prompt: `Calculate: ${a} - ${b} + ${c}`, answer: String(a - b + c) };
  },
];

function generateQuestion(): { prompt: string; answer: string } {
  const gen = generators[crypto.randomInt(0, generators.length)];
  return gen();
}

// ---------------------------------------------------------------------------
// In-memory state (rate limiting)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

const getSecret = () => {
  const secret = process.env.CAPTCHA_TOKEN_SECRET;
  if (!secret) {
    throw new Error(
      "Missing CAPTCHA_TOKEN_SECRET environment variable. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return secret;
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const hashAnswer = (answer: string) =>
  crypto.createHash("sha256").update(answer.trim().toLowerCase()).digest("hex");

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
      typeof parsed.answerHash !== "string" ||
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

// ---------------------------------------------------------------------------
// Attempt tracking
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Challenge creation
// ---------------------------------------------------------------------------

const getChallengeInternal = (email: string): CaptchaChallenge => {
  const state = getAttemptState(email);
  const { prompt, answer } = generateQuestion();

  const now = Date.now();
  const payload: CaptchaTokenPayload = {
    answerHash: hashAnswer(answer),
    email: normalizeEmail(email),
    issuedAt: now,
    expiresAt: now + CAPTCHA_EXPIRY_MS,
  };

  return {
    question: prompt,
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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

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
      challenge: getChallengeInternal(email),
      lockedUntil: null,
    };
  }

  // Compare answer hash (case-insensitive, trimmed)
  if (hashAnswer(answer) !== parsed.answerHash) {
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
      challenge: getChallengeInternal(email),
      lockedUntil: null,
    };
  }

  clearAttempts(email);
  return {
    ok: true,
  };
};
