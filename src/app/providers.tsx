"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { PropsWithChildren } from "react";
import { useMemo } from "react";
import { ReactTogether } from "react-together";
import { monadTestnet } from "viem/chains";
import { addRpcUrlOverrideToChain } from "@privy-io/chains";

export function Providers({ children }: PropsWithChildren) {
  const mainnetOverride = addRpcUrlOverrideToChain(
    monadTestnet,
    "https://testnet-rpc.monad.xyz"
  );
  return (
    <PrivyProvider
      appId="cmd4f5ai701bdky0mlghn1gr5" // 👉 thay bằng appId của bạn
      config={{
        embeddedWallets: {
          createOnLogin: "all-users",
        },
        supportedChains: [mainnetOverride],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
