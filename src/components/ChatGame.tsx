"use client";
import { useState, useEffect, useRef } from "react";
import { useChat, useNicknames, useConnectedUsers } from "react-together";
import { MessageSquare, X, Users, Send } from "lucide-react";
import { useWallets } from "@privy-io/react-auth";

export default function ChatGame() {
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useNicknames();
  const [input, setInput] = useState("");

  // ✨ SỬ DỤNG useChat HOOK THAY VÌ <Chat> COMPONENT
  const { messages, sendMessage } = useChat("pixel-board-chat");
  const [, , allNicknames] = useNicknames();
  const connectedUsers = useConnectedUsers();
  const wallets = useWallets();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Set nickname từ wallet address
  useEffect(() => {
    if (!wallets.ready || !wallets.wallets[0]) return;
    const address = wallets.wallets[0].address as `0x${string}`;
    const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
    setNickname(shortAddress);
  }, [wallets.ready, wallets.wallets, setNickname]);

  // Auto scroll to bottom when new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when open
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSendMessage = () => {
    if (input.trim()) {
      sendMessage(input.trim());
      setInput("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const currentUser = connectedUsers.find((u) => u.isYou);

  return (
    <div className="relative">
      {/* Toggle Button */}
      <div className="flex justify-center mt-2">
        <button
          onClick={() => setOpen(!open)}
          className={`p-3 rounded-full transition-all duration-300 shadow-lg relative ${
            open
              ? "bg-blue-600 hover:bg-blue-700 text-white scale-110"
              : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white"
          }`}
        >
          {open ? <X size={20} /> : <MessageSquare size={20} />}

          {/* Unread message indicator */}
          {!open && messages.length > 0 && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          )}
        </button>
      </div>

      {/* Chat Popup */}
      {open && (
        <div className="absolute left-[110%] top-0 w-80 h-[500px] bg-gradient-to-b from-zinc-900 to-zinc-950 rounded-xl shadow-2xl z-40 flex flex-col border border-zinc-600 overflow-hidden backdrop-blur-sm">
          {/* Header */}
          <div className="bg-gradient-to-r from-zinc-800 to-zinc-700 px-4 py-3 flex items-center justify-between border-b border-zinc-600">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-blue-400" />
              <span className="text-sm font-semibold text-white">
                Pixel Chat
              </span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">
                {connectedUsers.length} online
              </span>
              <button
                onClick={() => setOpen(false)}
                className="text-zinc-400 hover:text-red-400 transition-colors p-1 hover:bg-zinc-600 rounded"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-zinc-600 scrollbar-track-transparent">
            {messages.length === 0 ? (
              <div className="text-center text-zinc-500 py-8">
                <MessageSquare size={48} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs">Start the conversation!</p>
              </div>
            ) : (
              <>
                {messages.map((msg, index) => {
                  const isOwn = msg.senderId === currentUser?.userId;
                  const senderName = allNicknames[msg.senderId] || msg.senderId;
                  const prevMsg = messages[index - 1];
                  const isGrouped =
                    prevMsg &&
                    prevMsg.senderId === msg.senderId &&
                    msg.sentAt - prevMsg.sentAt < 60000; // Within 1 minute

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${
                        isOwn ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div className={`max-w-[70%] ${isOwn ? "order-1" : ""}`}>
                        {/* Sender name & time (only if not grouped) */}
                        {!isGrouped && (
                          <div
                            className={`text-xs mb-1 flex items-center gap-2 ${
                              isOwn
                                ? "justify-end text-blue-300"
                                : "justify-start text-zinc-400"
                            }`}
                          >
                            {!isOwn && (
                              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                {senderName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="font-medium">
                              {isOwn ? "You" : senderName}
                            </span>
                            <span className="text-zinc-500">
                              {formatTime(msg.sentAt)}
                            </span>
                          </div>
                        )}

                        {/* Message bubble */}
                        <div
                          className={`px-3 py-2 rounded-2xl relative ${
                            isOwn
                              ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                              : "bg-zinc-700 text-zinc-100 border border-zinc-600"
                          } ${
                            !isGrouped
                              ? isOwn
                                ? "rounded-tr-md"
                                : "rounded-tl-md"
                              : ""
                          }`}
                        >
                          <div className="text-sm leading-relaxed">
                            {msg.message}
                          </div>

                          {/* Message tail */}
                          {!isGrouped && (
                            <div
                              className={`absolute top-0 w-3 h-3 ${
                                isOwn
                                  ? "right-0 bg-blue-600 rounded-bl-full -mr-1"
                                  : "left-0 bg-zinc-700 rounded-br-full -ml-1"
                              }`}
                            ></div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-zinc-800/50 border-t border-zinc-700/50">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 bg-white text-black placeholder-gray-500 px-3 py-2 rounded-full border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                maxLength={500}
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim()}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white p-2 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <Send size={16} />
              </button>
            </div>

            {/* Footer info */}
            <div className="flex items-center justify-between mt-2 text-xs text-zinc-500">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span>{connectedUsers.length} online</span>
              </div>
              <span>Press Enter to send</span>
            </div>
          </div>
        </div>
      )}

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .scrollbar-thin {
          scrollbar-width: thin;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background-color: #52525b;
          border-radius: 2px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background-color: #71717a;
        }
      `}</style>
    </div>
  );
}
