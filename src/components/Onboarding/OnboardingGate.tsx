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

function OnboardingGate({ children }) {
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

  if (!completed) {
    return (
      <OnboardingModal
        prefill={{
          name: user?.name || "",
          email,
          phone: user?.phone || "",
        }}
        onComplete={handleComplete}
      />
    );
  }

  return children;
}

export default OnboardingGate;