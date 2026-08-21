const API_BASE = "http://localhost:4000";

export async function sendOtpApi({ email }: { email: string }) {
  const res = await fetch(`${API_BASE}/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || "Failed to send OTP");
  }
  return data;
}

export async function verifyOtpApi({ email, otp }: { email: string; otp: string }) {
  const res = await fetch(`${API_BASE}/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || "Invalid OTP");
  }
  return data; // { user, token }
}