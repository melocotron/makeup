"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { BookingSuccess } from "./booking-success";
import { StepConfirm, type ConfirmData } from "./step-confirm";
import { StepCustomer, type CustomerInput } from "./step-customer";
import { StepDatetime, type SlotData } from "./step-datetime";
import { StepService, type ServiceOption } from "./step-service";
import { WizardStepper, buildWizardHref, parseStepFromParams } from "./wizard-stepper";

import { createAppointmentAction } from "@/server/booking/actions";

export function BookingWizard({ services }: { services: ServiceOption[] }) {
  const t = useTranslations("booking");
  const router = useRouter();
  const searchParams = useSearchParams();
  const step = parseStepFromParams(searchParams);

  const serviceId = searchParams.get("serviceId") ?? "";
  const date = searchParams.get("date") ?? "";
  const slot = searchParams.get("slot") ?? "";

  const selectedService = services.find((s) => s.id === serviceId);

  // Customer form state lives only in memory (step 3 → 4 → submit)
  const [customer, setCustomer] = useState<CustomerInput | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  // If on step > 1 without required params, redirect to step 1
  useEffect(() => {
    if (step === 2 && !serviceId) router.replace(buildWizardHref({ step: 1 }));
    if ((step === 3 || step === 4) && (!serviceId || !date || !slot)) {
      router.replace(
        buildWizardHref({ step: 2, serviceId }),
      );
    }
  }, [step, serviceId, date, slot, router]);

  if (successId !== null) {
    return <BookingSuccess appointmentId={successId} />;
  }

  function navigate(params: Parameters<typeof buildWizardHref>[0]) {
    router.push(buildWizardHref(params));
  }

  async function handleConfirm() {
    if (!selectedService || !customer || !date || !slot) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createAppointmentAction({
        serviceId: selectedService.id,
        date,
        time: slot,
        customer,
      });
      if (result.ok) {
        setSuccessId(result.data.appointmentId);
      } else {
        setSubmitError(result.error);
      }
    } catch (err) {
      setSubmitError(t("errors.generic"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8">
      <WizardStepper current={step} />

      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
        {step === 1 && (
          <StepService
            services={services}
            onSelect={(id) => navigate({ step: 2, serviceId: id })}
            backHref="/"
          />
        )}

        {step === 2 && selectedService && (
          <StepDatetime
            serviceId={selectedService.id}
            serviceName={selectedService.name}
            onConfirm={(d, s) =>
              navigate({
                step: 3,
                serviceId: selectedService.id,
                date: d,
                slot: s.displayTime,
              })
            }
            onBack={() => navigate({ step: 1 })}
          />
        )}

        {step === 3 && selectedService && (
          <StepCustomer
            initial={customer ?? undefined}
            onSubmit={(data) => {
              setCustomer(data);
              navigate({
                step: 4,
                serviceId: selectedService.id,
                date,
                slot,
              });
            }}
            onBack={() =>
              navigate({
                step: 2,
                serviceId: selectedService.id,
              })
            }
            submitting={false}
            error={null}
          />
        )}

        {step === 4 && selectedService && customer && (
          <StepConfirm
            data={
              {
                serviceName: selectedService.name,
                date,
                slotDisplay: slot,
                durationMin: selectedService.durationMin,
                customer,
              } satisfies ConfirmData
            }
            onConfirm={handleConfirm}
            onBack={() =>
              navigate({
                step: 3,
                serviceId: selectedService.id,
                date,
                slot,
              })
            }
            submitting={submitting}
            error={submitError}
          />
        )}
      </div>
    </div>
  );
}

// Re-export for type usage
export type { ServiceOption, SlotData };