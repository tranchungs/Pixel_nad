"use client";
import { useState, useEffect } from "react";
import { Chat } from "react-together";
import { MessageSquare, X } from "lucide-react";
import { useConnectedUsers, useNicknames } from "react-together";
import { useWallets } from "@privy-io/react-auth";

export default function ChatGame() {
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useNicknames();
  const walelts = useWallets();

  useEffect(() => {
    if (!walelts.ready || !walelts.wallets[0]) return;

    const address = walelts.wallets[0].address as `0x${string}`;
    const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
    setNickname(shortAddress);
  }, [walelts.ready, walelts.wallets, nickname, setNickname]);
  return (
    <div className="relative">
      {/* Toggle Button */}
      <div className="flex justify-center mt-2">
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 text-white shadow-md"
        >
          {open ? <X size={20} /> : <MessageSquare size={20} />}
        </button>
      </div>

      {/* Chat Popup */}
      {open && (
        <div className="absolute left-[110%] top-0 w-80 h-[400px] bg-zinc-900 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden border border-zinc-700">
          {/* Header */}
          <div className="bg-zinc-800 px-4 py-2 border-b border-zinc-700 flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Team Chat</span>
            <button
              onClick={() => setOpen(false)}
              className="text-zinc-400 hover:text-red-500"
            >
              <X size={18} />
            </button>
          </div>

          {/* Chat content */}
          <div className="flex-1 overflow-hidden">
            <Chat
              rtKey={process.env.NEXT_PUBLIC_RT_KEY || "fallback-chat"}
              chatName="Team Chat"
            />
          </div>
        </div>
      )}
    </div>
  );
}
