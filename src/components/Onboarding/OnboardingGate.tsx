import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import OnboardingModal from "./OnboardingModal";


const loadLS = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

const saveLS = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    
  }
};

const onboardingKey = (email) => `axsOnboardingComplete_${email}`;
const onboardingDataKey = (email) => `axsOnboardingData_${email}`;


const splitToArray = (str) =>
  (str || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);


function buildProfileFromOnboarding(formData) {
  const { basic, studio } = formData;
  const nameParts = (basic.name || "").trim().split(/\s+/);

  return {
    firstName: nameParts[0] || "",
    lastName: nameParts.slice(1).join(" ") || "",
    email: basic.email || "",
    phone: basic.phone || "",
    address: studio.address || basic.address || "",
    city: studio.city || "",
    state: studio.state || "",
    country: studio.country || "",
    postalCode: studio.postalCode || "",
  };
}


function buildStudioFromOnboarding(formData) {
  const { studio, portfolio } = formData;

  return {
    studioName: studio.studioName || "",
    phoneNumber: studio.phone || "",
    address: studio.address || "",
    city: studio.city || "",
    state: studio.state || "",
    country: studio.country || "",
    postalCode: studio.postalCode || "",
    about: portfolio.about || "",
    services: splitToArray(portfolio.services),
    specializations: splitToArray(portfolio.specialization),
  };
}

type OnboardingGateProps = {
  children: React.ReactNode;
  /**
   * Called when the user taps "Back to login" inside the onboarding modal.
   * Wire this to your real logout/auth-reset action from the parent
   * (e.g. dispatch(logout()) or setIsAuthenticated(false)) for a clean flow.
   * If not supplied, a safe fallback clears the local auth flag and reloads.
   */
  onBackToLogin?: () => void;
};

function OnboardingGate({ children, onBackToLogin }: OnboardingGateProps) {
  const { user } = useSelector((state: any) => state.auth);
  const email = user?.email || "guest@apenturexstudios.com";

  const [completed, setCompleted] = useState(() =>
    loadLS(onboardingKey(email), false)
  );

  
  useEffect(() => {
    setCompleted(loadLS(onboardingKey(email), false));
  }, [email]);

  const handleComplete = (formData) => {
    saveLS(onboardingDataKey(email), formData);
    saveLS(onboardingKey(email), true);

    
    saveLS("axsProfile", buildProfileFromOnboarding(formData));
    saveLS("axsKycVerified", true);
    saveLS("axsKycData", {
      docType: formData.kyc.docType,
      vals: formData.kyc.vals,
    });

    
    saveLS("axsStudio", buildStudioFromOnboarding(formData));

    setCompleted(true);
  };

  const handleBack = () => {
    if (onBackToLogin) {
      onBackToLogin();
      return;
    }
    // Fallback: clear the local session flag and reload so the app falls
    // back to its login screen. Pass onBackToLogin from the parent to
    // replace this with your actual logout dispatch.
    try {
      localStorage.removeItem("axsAuthToken");
      localStorage.removeItem("axsCurrentUser");
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  if (!completed) {
    return (
      <OnboardingModal
        prefill={{
          name: user?.name || "",
          email,
          phone: user?.phone || "",
        }}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    );
  }

  return children;
}

export default OnboardingGate;