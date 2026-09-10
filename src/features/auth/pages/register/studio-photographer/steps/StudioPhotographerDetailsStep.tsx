import { useState } from "react";
import "./StudioPhotographerDetailsStep.css";

export interface StudioPhotographerDetailsData {
  yearsExperience: string;
  specializations: string[];
  equipment: string;
}

interface StudioPhotographerDetailsStepProps {
  initialData: StudioPhotographerDetailsData;
  onBack: () => void;
  onContinue: (data: StudioPhotographerDetailsData) => void;
}

const SPECIALIZATION_OPTIONS = [
  "Wedding Photography",
  "Portrait Photography",
  "Candid Photography",
  "Event Photography",
  "Product Photography",
];

export default function StudioPhotographerDetailsStep({
  initialData,
  onBack,
  onContinue,
}: StudioPhotographerDetailsStepProps) {
  const [data, setData] = useState<StudioPhotographerDetailsData>(initialData);

  const updateDetails = (patch: Partial<StudioPhotographerDetailsData>) =>
    setData((prev) => ({ ...prev, ...patch }));

  const toggleSpecialization = (spec: string) => {
    setData((prev) => {
      const next = prev.specializations.includes(spec)
        ? prev.specializations.filter((s) => s !== spec)
        : [...prev.specializations, spec];
      return { ...prev, specializations: next };
    });
  };

  return (
    <>
      <div className="studio-form-section-header">
        <h2 className="studio-form-section-title">Photography Details</h2>
        <p className="studio-form-section-subtitle">Share your photography background</p>
      </div>
      <div className="studio-form-divider" />

      <div className="studio-form-grid">
        <div className="studio-form-field">
          <label className="studio-field-label">Years of Experience</label>
          <input
            className="studio-input"
            value={data.yearsExperience}
            onChange={(e) => updateDetails({ yearsExperience: e.target.value })}
            placeholder="e.g. 1–3 years"
          />
        </div>
        <div className="studio-form-field studio-form-field--full">
          <label className="studio-field-label">Equipment</label>
          <input
            className="studio-input"
            value={data.equipment}
            onChange={(e) => updateDetails({ equipment: e.target.value })}
            placeholder="e.g. Sony A7 IV, 24-70mm f2.8"
          />
        </div>
        <div className="studio-form-field studio-form-field--full">
          <label className="studio-field-label">
            Specializations
            {data.specializations.length > 0 ? (
              <span className="studio-spec-count">{data.specializations.length} selected</span>
            ) : null}
          </label>
          <div className="studio-spec-chip-row">
            {SPECIALIZATION_OPTIONS.map((spec) => {
              const selected = data.specializations.includes(spec);
              return (
                <button
                  type="button"
                  key={spec}
                  className={`studio-spec-chip ${selected ? "studio-spec-chip--selected" : ""}`}
                  aria-pressed={selected}
                  onClick={() => toggleSpecialization(spec)}
                >
                  {spec}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="studio-form-actions">
        <button type="button" className="studio-btn-secondary" onClick={onBack}>
          Back
        </button>
        <div className="studio-form-actions-right">
          <button type="button" className="studio-btn-primary" onClick={() => onContinue(data)}>
            Continue
          </button>
        </div>
      </div>
    </>
  );
}