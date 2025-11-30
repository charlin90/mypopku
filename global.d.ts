declare module '@clerk/clerk-react' {
  import * as React from 'react';

  export interface ClerkProviderProps {
    publishableKey: string;
    afterSignOutUrl?: string;
    children?: React.ReactNode;
  }
  export const ClerkProvider: React.FC<ClerkProviderProps>;

  export const SignedIn: React.FC<{ children?: React.ReactNode }>;
  export const SignedOut: React.FC<{ children?: React.ReactNode }>;

  export interface SignInButtonProps {
    mode?: 'modal' | 'redirect';
    children?: React.ReactNode;
    className?: string;
  }
  export const SignInButton: React.FC<SignInButtonProps>;

  export interface UserButtonProps {
    afterSignOutUrl?: string;
    appearance?: any;
    userProfileMode?: 'modal' | 'navigation';
    userProfileUrl?: string;
  }
  export const UserButton: React.FC<UserButtonProps>;
  
  export function useUser(): {
    isLoaded: boolean;
    isSignedIn: boolean;
    user: any;
  };

  export function useAuth(): {
    isLoaded: boolean;
    userId: string | null;
    sessionId: string | null;
    getToken: (options?: any) => Promise<string | null>;
    signOut: () => Promise<void>;
  };
}
