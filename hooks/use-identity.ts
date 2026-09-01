import { createContext, useContext } from "react";
import type { User } from "@/types";

export interface IdentityValue {
  address: string | null;
  jwt: string | null;
  user: User | null;
  isConnected: boolean;
  isConnecting: boolean;
  isAuthenticating: boolean;
  connect: () => void;
  disconnect: () => void;
  updateProfile: (patch: { name?: string; email?: string; image?: string }) => Promise<void>;
}

export const Identity = createContext<IdentityValue | null>(null);

export function useIdentity(): IdentityValue {
  const value = useContext(Identity);
  if (!value) throw new Error("useIdentity must be used within an IdentityProvider");
  return value;
}
