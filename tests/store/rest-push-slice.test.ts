import { describe, expect, it } from 'vitest';
import { createAppStore } from '../../src/store/appStore';
import { selectPersistedData } from '../../src/store/selectors';

describe('rest push store slice', () => {
  it('keeps push state transient and merges lifecycle updates', () => {
    const store = createAppStore();
    expect(store.getState().restPush).toEqual({
      support: 'unsupported',
      permission: 'unsupported',
      endpoint: null,
      subscription: null,
      armed: false,
      error: null,
    });
    expect(selectPersistedData(store.getState())).not.toHaveProperty('restPush');

    store.getState().setRestPushState({
      support: 'available',
      permission: 'granted',
      endpoint: 'https://push.example.test/endpoint',
    });
    expect(store.getState().restPush).toEqual({
      support: 'available',
      permission: 'granted',
      endpoint: 'https://push.example.test/endpoint',
      subscription: null,
      armed: false,
      error: null,
    });
  });
});
