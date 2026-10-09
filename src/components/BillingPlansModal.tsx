import React from 'react';
import { X } from 'lucide-react';
import type { BillingPlan } from '../services/billing';

interface BillingPlansModalProps {
  isOpen: boolean;
  isAuthenticated: boolean;
  isPremiumActive: boolean;
  onClose: () => void;
  onSignIn: () => Promise<void>;
}

const premiumPlans: {
  id: BillingPlan;
  title: string;
  price: string;
  period: string;
  description: string;
}[] = [
  {
    id: 'monthly',
    title: 'Premium mensual',
    price: '€5.99',
    period: 'al mes',
    description: 'Sincronización en la nube',
  },
  {
    id: 'annual',
    title: 'Premium anual',
    price: '€60',
    period: 'al año',
    description: 'Sincronización en la nube',
  },
  {
    id: 'lifetime',
    title: 'Premium de por vida',
    price: '€210',
    period: 'pago único',
    description: 'Acceso Premium permanente y sincronización en la nube',
  },
];

export const BillingPlansModal: React.FC<BillingPlansModalProps> = ({
  isOpen,
  isAuthenticated,
  isPremiumActive,
  onClose,
  onSignIn,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-6"
      onClick={onClose}
    >
      <section
        aria-labelledby="billing-plans-title"
        aria-modal="true"
        className="max-h-[92dvh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-white/10 bg-[#121214] text-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/[0.08] bg-[#121214]/95 p-4 backdrop-blur sm:p-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00FF87]">
              Planes WorkoutLog
            </p>
            <h2
              className="mt-1 text-xl font-black tracking-tight sm:text-2xl"
              id="billing-plans-title"
            >
              Entrena a tu manera
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Elige el plan que mejor encaje contigo.
            </p>
          </div>
          <button
            aria-label="Cerrar planes"
            className="rounded-xl border border-white/10 bg-zinc-900 p-2 text-zinc-400 transition-all hover:border-[#00FF87]/40 hover:text-white active:scale-95"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>

        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
          <article className="flex flex-col rounded-2xl border border-white/10 bg-[#0D0D0D] p-4">
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Free
              </p>
              <p className="mt-3 text-3xl font-black tracking-tight text-white">
                Gratis
              </p>
              <p className="mt-3 rounded-xl border border-white/[0.08] bg-zinc-900/70 px-3 py-2 text-xs font-semibold text-zinc-300">
                Hasta 3 rutinas
              </p>
              <p className="mt-2 rounded-xl border border-white/[0.08] bg-zinc-900/70 px-3 py-2 text-xs font-semibold text-zinc-300">
                Datos en este dispositivo
              </p>
            </div>
            <span className="mt-4 rounded-xl border border-white/10 px-3 py-2 text-center text-xs font-bold text-zinc-400">
              Plan gratuito
            </span>
          </article>

          {premiumPlans.map((plan) => (
            <article
              className={`relative flex flex-col rounded-2xl border bg-[#0D0D0D] p-4 ${
                plan.id === 'annual'
                  ? 'border-[#00FF87]/50 shadow-[0_0_20px_rgba(0,255,135,0.08)]'
                  : 'border-white/10'
              }`}
              key={plan.id}
            >
              {plan.id === 'annual' && (
                <span className="absolute -top-2.5 right-4 rounded-full bg-[#00FF87] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-black shadow-[0_0_12px_rgba(0,255,135,0.3)]">
                  Premium
                </span>
              )}
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  {plan.title}
                </p>
                <p className="mt-3 text-3xl font-black tracking-tight text-white">
                  {plan.price}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-zinc-500">
                  {plan.period}
                </p>
                <p className="mt-3 rounded-xl border border-[#00FF87]/15 bg-[#00FF87]/[0.06] px-3 py-2 text-xs font-semibold text-zinc-200">
                  {plan.description}
                </p>
              </div>
              <span
                className={`mt-4 rounded-xl px-3 py-2 text-center text-xs font-bold ${
                  isPremiumActive
                    ? 'border border-[#00FF87]/30 bg-[#00FF87]/10 text-[#00FF87]'
                    : 'border border-white/10 text-zinc-400'
                }`}
              >
                {isPremiumActive ? 'Premium activo' : 'Plan Premium'}
              </span>
            </article>
          ))}
        </div>

        {!isAuthenticated && (
          <footer className="mx-4 mb-4 rounded-2xl border border-[#00FF87]/20 bg-[#00FF87]/[0.06] p-4 sm:mx-6 sm:mb-6">
            <p className="text-sm font-bold text-white">
              Inicia sesión para continuar con Premium
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              Tu cuenta permite asociar tu suscripción y sincronizar tus datos.
            </p>
            <button
              className="mt-3 w-full rounded-xl bg-[#00FF87] px-4 py-2.5 text-xs font-black text-black shadow-[0_0_14px_rgba(0,255,135,0.18)] transition-all hover:brightness-110 active:scale-[0.98] sm:w-auto"
              onClick={() => void onSignIn()}
              type="button"
            >
              Continuar con Google
            </button>
          </footer>
        )}
      </section>
    </div>
  );
};
