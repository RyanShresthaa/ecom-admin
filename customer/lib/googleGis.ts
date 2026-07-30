/**
 * Google Identity Services (GIS) helpers for Sign in with Google (ID token).
 */

export type GoogleCredentialResponse = {
  credential?: string;
  select_by?: string;
};

type GoogleAccountsId = {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    context?: 'signin' | 'signup' | 'use';
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: 'standard' | 'icon';
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      logo_alignment?: 'left' | 'center';
      width?: number | string;
    },
  ) => void;
  prompt: (momentListener?: (notification: {
    isNotDisplayed: () => boolean;
    isSkippedMoment: () => boolean;
    isDismissedMoment: () => boolean;
  }) => void) => void;
  cancel: () => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId;
      };
    };
  }
}

const SCRIPT_ID = 'google-gsi-client';

export function getGoogleClientId(): string {
  return (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '').trim();
}

export function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google sign-in is only available in the browser'));
  }
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Failed to load Google sign-in')),
        { once: true },
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google sign-in'));
    document.head.appendChild(script);
  });
}

/** Render the official Google button into `parent` (often overlaid on a custom-styled control). */
export async function renderGoogleButton(
  parent: HTMLElement,
  opts: {
    clientId: string;
    text: 'signin_with' | 'signup_with';
    onCredential: (credential: string) => void;
    onError?: (message: string) => void;
  },
): Promise<void> {
  await loadGoogleIdentityScript();
  if (!window.google?.accounts?.id) {
    throw new Error('Google sign-in failed to initialize');
  }

  parent.innerHTML = '';

  window.google.accounts.id.initialize({
    client_id: opts.clientId,
    callback: (response) => {
      if (response.credential) {
        opts.onCredential(response.credential);
      } else {
        opts.onError?.('Google did not return a credential');
      }
    },
    auto_select: false,
    cancel_on_tap_outside: true,
    context: opts.text === 'signup_with' ? 'signup' : 'signin',
  });

  const width = Math.max(240, Math.floor(parent.getBoundingClientRect().width || 320));

  window.google.accounts.id.renderButton(parent, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: opts.text,
    shape: 'pill',
    width,
  });
}
