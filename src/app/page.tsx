"use client";
import { useLogin, usePrivy, useWallets } from "@privy-io/react-auth";
import { monadTestnet } from "viem/chains";
import Game from "@/components/GameCanvas";

export default function Auth() {
  const { ready, authenticated } = usePrivy();
  const { login } = useLogin();
  const { wallets } = useWallets();
  const disableLogin = !ready || authenticated;

  const handleLoginAndInitTogether = async () => {
    try {
      await login({
        loginMethods: ["wallet"],
        walletChainType: "ethereum-and-solana",
        disableSignup: false,
      });
      const wallet = wallets[0];
      if (wallet) {
        await wallet.switchChain(monadTestnet.id);
      }
    } catch (err) {
      console.error("Login or chain switch failed:", err);
    }
  };
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#0e0f14] text-white flex items-center justify-center">
        <div className="max-w-sm w-full px-6 py-10 bg-[#1a1c23] rounded-3xl text-center space-y-6 shadow-lg">
          <h1 className="text-lg font-semibold">Pixel Monad</h1>
          <p className="text-sm text-gray-400">
            Pixel Monad is a blank canvas 500x500px where users transform
            pixels.
          </p>

          {/* Pixel preview box */}
          <div className="mx-auto w-[110px] h-[110px] grid grid-cols-10 grid-rows-10 gap-[1px] bg-black p-[2px]">
            {Array.from({ length: 100 }).map((_, i) => {
              const x = i % 10;
              const y = Math.floor(i / 10);

              // vẽ khung ngoài hình kim cương kiểu Monad
              const filled =
                (x === 4 && (y === 1 || y === 8)) ||
                (x === 5 && (y === 1 || y === 8)) ||
                (x === 3 && (y === 2 || y === 7)) ||
                (x === 6 && (y === 2 || y === 7)) ||
                (x === 2 && (y === 3 || y === 6)) ||
                (x === 7 && (y === 3 || y === 6)) ||
                (x === 1 && (y === 4 || y === 5)) ||
                (x === 8 && (y === 4 || y === 5));

              // vùng rỗng bên trong (lỗ trong biểu tượng Monad)
              const hole = x >= 3 && x <= 6 && y >= 3 && y <= 6;

              return (
                <div
                  key={i}
                  className={`w-[8px] h-[8px] rounded-[1px] ${
                    filled && !hole ? "bg-white" : "bg-[#111]"
                  }`}
                />
              );
            })}
          </div>

          {/* Instructions */}
          <div className="text-left text-sm text-gray-300 space-y-3">
            <p>
              <span className="font-bold">1.</span> You can put some pixels on
              it, but you have to wait to continue.
            </p>
            <p>
              <span className="font-bold">2.</span> Get rewarded in ◼ for
              repainting and owning pixels.
            </p>
            <p>
              <span className="font-bold">3.</span> Be creative. Enjoy.
            </p>
          </div>

          {/* Login Button */}
          <button
            disabled={disableLogin}
            onClick={handleLoginAndInitTogether}
            className="w-full py-3 rounded-xl font-bold text-black text-sm bg-gradient-to-r from-[#8f6ef2] to-[#6ec4f2] hover:opacity-90 transition disabled:opacity-40"
          >
            Let’s Gooooooo!
          </button>
        </div>
      </div>
    );
  } else {
    return <Game></Game>;
  }
}
