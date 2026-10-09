import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { BillingPlansModal } from '../src/components/BillingPlansModal';
import { SidebarMenu } from '../src/components/SidebarMenu';
import { AppTab } from '../src/types';

type ButtonElement = React.ReactElement<{
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}>;

function findButtons(node: React.ReactNode): ButtonElement[] {
  if (!React.isValidElement(node)) return [];
  const element = node as React.ReactElement<{ children?: React.ReactNode }>;
  const button = element.type === 'button' ? [element as ButtonElement] : [];
  return [
    ...button,
    ...React.Children.toArray(element.props.children).flatMap(findButtons),
  ];
}

function textContent(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (!React.isValidElement(node)) return '';
  const element = node as React.ReactElement<{ children?: React.ReactNode }>;
  return React.Children.toArray(element.props.children).map(textContent).join('');
}

describe('billing plan catalog', () => {
  it('shows the confirmed prices and only established plan benefits', () => {
    const markup = renderToStaticMarkup(
      <BillingPlansModal
        isOpen
        isAuthenticated
        isPremiumActive={false}
        isEntitlementLoading={false}
        isBillingLoading={false}
        billingError={null}
        returnStatus={null}
        onClose={() => undefined}
        onSignIn={async () => undefined}
        onCheckout={async () => undefined}
        onRefreshEntitlement={async () => undefined}
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
        isEntitlementLoading={false}
        isBillingLoading={false}
        billingError={null}
        returnStatus={null}
        onClose={() => undefined}
        onSignIn={async () => undefined}
        onCheckout={async () => undefined}
        onRefreshEntitlement={async () => undefined}
      />,
    );

    expect(markup).toContain('Inicia sesión para continuar con Premium');
    expect(markup).toContain('Continuar con Google');
  });

  it('does not treat a successful Checkout redirect as proof of Premium', () => {
    const markup = renderToStaticMarkup(
      <BillingPlansModal
        isOpen
        isAuthenticated
        isPremiumActive={false}
        isEntitlementLoading={false}
        isBillingLoading={false}
        billingError={null}
        returnStatus="success"
        onClose={() => undefined}
        onSignIn={async () => undefined}
        onCheckout={async () => undefined}
        onRefreshEntitlement={async () => undefined}
      />,
    );

    expect(markup).toContain('La vuelta de Stripe no confirma el pago');
    expect(markup).toContain('Actualizar estado');
    expect(markup).not.toContain('Premium activo confirmado');
  });

  it('shows cancellation feedback without granting Premium', () => {
    const markup = renderToStaticMarkup(
      <BillingPlansModal
        isOpen
        isAuthenticated
        isPremiumActive={false}
        isEntitlementLoading={false}
        isBillingLoading={false}
        billingError={null}
        returnStatus="cancel"
        onClose={() => undefined}
        onSignIn={async () => undefined}
        onCheckout={async () => undefined}
        onRefreshEntitlement={async () => undefined}
      />,
    );

    expect(markup).toContain('No completaste el proceso de pago');
    expect(markup).not.toContain('Premium activo confirmado');
  });

  it('sends the selected plan to the checkout action', async () => {
    const onCheckout = vi.fn(async () => undefined);
    const tree = BillingPlansModal({
      isOpen: true,
      isAuthenticated: true,
      isPremiumActive: false,
      isEntitlementLoading: false,
      isBillingLoading: false,
      billingError: null,
      returnStatus: null,
      onClose: () => undefined,
      onSignIn: async () => undefined,
      onCheckout,
      onRefreshEntitlement: async () => undefined,
    }) as React.ReactNode;
    const checkoutButtons = findButtons(tree).filter(
      (button) => textContent(button.props.children) === 'Elegir plan',
    );

    for (const button of checkoutButtons) {
      button.props.onClick?.({} as React.MouseEvent<HTMLButtonElement>);
    }

    expect(checkoutButtons).toHaveLength(3);
    expect(onCheckout.mock.calls).toEqual([
      ['monthly'],
      ['annual'],
      ['lifetime'],
    ]);
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
