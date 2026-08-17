"use client";

import { Check, Inbox, Target } from "lucide-react";
import { useRef, useState } from "react";
import { completeOnboarding } from "./actions";

const steps = ["Profile", "Preferences", "Workflow"] as const;

export function OnboardingWizard({ email }: { email: string }) {
  const [step, setStep] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const continueToNext = () => {
    const panel = formRef.current?.querySelector<HTMLElement>(`[data-step="${step}"]`);
    const fields = panel?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select") ?? [];
    for (const field of fields) {
      if (!field.reportValidity()) return;
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <form ref={formRef} action={completeOnboarding} className="onboarding-form wizard-form">
      <div className="wizard-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>
        {steps.map((label, index) => <div className={`wizard-progress-item ${index <= step ? "active" : ""}`} key={label}><span>{index < step ? <Check /> : index + 1}</span><b>{label}</b></div>)}
      </div>

      <section className="wizard-panel" data-step="0" hidden={step !== 0}>
        <div className="onboarding-copy"><div className="wizard-time">About 2 minutes</div><h1>Start with what you’re aiming for</h1><p>We’ll use this to make your empty workspace useful from the first job you add. Nothing here is public.</p></div>
        <div className="form-section"><h2>Your professional profile</h2><p>Just enough context to identify your workspace and shape future recommendations.</p><div className="field-grid"><div className="field"><label htmlFor="fullName">Full name</label><input className="input" id="fullName" name="fullName" required autoComplete="name" /></div><div className="field"><label htmlFor="headline">Professional headline</label><input className="input" id="headline" name="headline" required placeholder="Product-minded full-stack engineer" /></div></div><div className="field"><label htmlFor="summary">Short summary <span className="muted">(optional)</span></label><textarea className="textarea" id="summary" name="summary" placeholder="What kind of work do you do best?" /></div><p className="field-note">Signed in as {email}</p></div>
      </section>

      <section className="wizard-panel" data-step="1" hidden={step !== 1}>
        <div className="onboarding-copy"><h1>Define a good opportunity</h1><p>Preferences help you review jobs consistently. They don’t hide anything or make decisions for you.</p></div>
        <div className="form-section"><h2>Search preferences</h2><p>Separate multiple entries with commas.</p><div className="field"><label htmlFor="targetTitles">Target roles</label><input className="input" id="targetTitles" name="targetTitles" required placeholder="Product Engineer, Full-Stack Engineer" /><span className="field-hint">Add the titles you would genuinely consider next.</span></div><div className="field"><label htmlFor="technologies">Preferred technologies</label><input className="input" id="technologies" name="technologies" placeholder="TypeScript, React, PostgreSQL" /></div><div className="field-grid"><div className="field"><label htmlFor="remotePreference">Remote preference</label><select className="input" id="remotePreference" name="remotePreference" defaultValue="preferred"><option value="required">Remote required</option><option value="preferred">Remote preferred</option><option value="flexible">Flexible</option></select></div><div className="field"><label htmlFor="minimumCompensation">Minimum annual compensation</label><input className="input" id="minimumCompensation" name="minimumCompensation" type="number" min="0" placeholder="50000" /></div></div><div className="field"><label htmlFor="locations">Allowed locations</label><input className="input" id="locations" name="locations" placeholder="Worldwide, APAC, Philippines" /></div></div>
      </section>

      <section className="wizard-panel" data-step="2" hidden={step !== 2}>
        <div className="onboarding-copy"><h1>Your workspace starts with one decision</h1><p>Add a promising job, review it in your Inbox, then track it only when it deserves your attention.</p></div>
        <div className="workflow-preview" aria-label="Roleway workflow">
          <div><span><Inbox /></span><div><b>Add a job</b><p>Capture a listing without committing it to your pipeline.</p></div></div>
          <div><span><Check /></span><div><b>Review the Inbox</b><p>Track, keep for later, or dismiss. You remain in control.</p></div></div>
          <div><span><Target /></span><div><b>Move the Opportunity forward</b><p>Give it one next action, then keep every task and note attached.</p></div></div>
        </div>
        <div className="tour-preview-note"><strong>A short product tour comes next.</strong><span>Four quick pointers, then you’ll add your first real job.</span></div>
      </section>

      <div className="onboarding-actions wizard-actions">
        {step > 0 ? <button className="button ghost" type="button" onClick={() => setStep((current) => current - 1)}>Back</button> : <span className="muted small">Private by default · Editable later</span>}
        {step < steps.length - 1 ? <button className="button primary" type="button" onClick={continueToNext}>Continue</button> : <button className="button primary" type="submit">Open my workspace</button>}
      </div>
    </form>
  );
}
