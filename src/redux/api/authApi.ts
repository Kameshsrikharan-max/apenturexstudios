
const MOCK_DELAY_MS = 700;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms)); 
}

function makeToken(email) {
  return btoa(`${email}:${Date.now()}:${Math.random().toString(36).slice(2)}`);
}

function nameFromEmail(email) {
  const prefix = email.split("@")[0];
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

export async function loginApi({ identifier: email }) {
  await delay(MOCK_DELAY_MS);

  if (!email) {
    throw new Error("Email is required");
  }

  if (!EMAIL_REGEX.test(email)) {
    throw new Error("Please enter a valid email address");
  }

  const user = { name: nameFromEmail(email), email };
  const token = makeToken(email);

  return { user, token };
}

export async function signupApi({ name, identifier: email }) {
  await delay(MOCK_DELAY_MS);

  if (!email) {
    throw new Error("Email is required");
  }

  if (!EMAIL_REGEX.test(email)) {
    throw new Error("Please enter a valid email address");
  }

  const user = { name: name || nameFromEmail(email), email };
  const token = makeToken(email);

  return { user, token };
}