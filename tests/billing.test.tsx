import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BillingPlansModal } from '../src/components/BillingPlansModal';
import { SidebarMenu } from '../src/components/SidebarMenu';
import { AppTab } from '../src/types';

describe('billing plan catalog', () => {
  it('shows the confirmed prices and only established plan benefits', () => {
    const markup = renderToStaticMarkup(
      <BillingPlansModal
        isOpen
        isAuthenticated
        isPremiumActive={false}
        onClose={() => undefined}
        onSignIn={async () => undefined}
      />,
    );

    expect(markup).toContain('Free');
    expect(markup).toContain('Premium mensual');
    expect(markup).toContain('€5.99');
    expect(markup).toContain('Premium anual');
    expect(markup).toContain('€60');
    expect(markup).toContain('Premium de por vida');
    expect(markup).toContain('€210');
    expect(markup).toContain('Hasta 3 rutinas');
    expect(markup).toContain('Sincronización en la nube');
    expect(markup).toContain('Acceso Premium permanente');
    expect(markup).not.toContain('Rutinas ilimitadas');
  });

  it('prompts guests to authenticate before they choose a paid plan', () => {
    const markup = renderToStaticMarkup(
      <BillingPlansModal
        isOpen
        isAuthenticated={false}
        isPremiumActive={false}
        onClose={() => undefined}
        onSignIn={async () => undefined}
      />,
    );

    expect(markup).toContain('Inicia sesión para continuar con Premium');
    expect(markup).toContain('Continuar con Google');
  });
});

describe('account menu billing entry point', () => {
  it('keeps the account section in the dark neon design and Spanish UI', () => {
    const markup = renderToStaticMarkup(
      <SidebarMenu
        isOpen
        onClose={() => undefined}
        activeTab={AppTab.ROUTINES}
        onSelectTab={() => undefined}
        routinesCount={0}
        catalogCount={0}
        rmCount={0}
        historyCount={0}
        onOpenBackup={() => undefined}
        onOpenBillingPlans={() => undefined}
        isAuthenticated={false}
        userEmail={null}
        isPremiumActive={false}
        isEntitlementLoading={false}
        isSigningIn={false}
        premiumExpiry={null}
        error={null}
        onSignIn={async () => undefined}
        onSignOut={async () => undefined}
      />,
    );

    expect(markup).toContain('aria-label="Cuenta"');
    expect(markup).toContain('bg-[#121214]');
    expect(markup).not.toContain('bg-zinc-50');
    expect(markup).toContain('Continuar con Google');
    expect(markup).toContain('Ver planes');
  });
});
