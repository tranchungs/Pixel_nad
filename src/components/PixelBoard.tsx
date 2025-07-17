"use client";

import { useRef, useEffect, useState } from "react";
import { useStateTogether } from "react-together";
import { useWallets, useSendTransaction } from "@privy-io/react-auth";
import { encodeFunctionData, parseAbi } from "viem";
import { monadTestnet } from "viem/chains";
import TransactionToast from "./TransactionToast";
import { createPublicClient, http } from "viem";
import BoomEffect from "./BoomEffect";
import ChatGame from "./ChatGame";
const CANVAS_SIZE = 500;
const INITIAL_SCALE = 8;
const MIN_SCALE = 3;

const COLORS = [
  "#E46E6E",
  "#FFD635",
  "#7EED56",
  "#00CCC0",
  "#51E9F4",
  "#94B3FF",
  "#E4ABFF",
  "#FF99AA",
  "#FFB470",
  "#FFFFFF",
  "#BE0039",
  "#FF9600",
  "#00CC78",
  "#009EAA",
  "#3690EA",
  "#6A5CFF",
  "#B44AC0",
  "#FF3881",
  "#9C6926",
  "#898D90",
  "#6D001A",
  "#BF4300",
  "#00A368",
  "#00756F",
  "#2450A4",
  "#493AC1",
  "#811E9F",
  "#A00357",
  "#6D482F",
  "#000000",
];
const CONTRACT_ADDRESS = "0x822e5088E9dDc9B94f1Fcd619610c0F874a2c406";
const CONTRACT_ABI = parseAbi([
  "event AreaBombed(address indexed user, uint256 x, uint256 y, uint256 radius)",
  "function bombs(address user) external view returns (uint256)",
  "function bombPrice() view returns (uint256)",
  "function buyBomb() external payable",
  "function bombArea(uint256 centerX, uint256 centerY, uint256 radius) external",
  "function placePixel(uint256 x, uint256 y, string color) external",
]);

export default function PixelBoard() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pixelUpdates, setPixelUpdates] = useStateTogether<
    Record<string, string>
  >("pixelUpdates", {});
  const [selectedColor, setSelectedColor] = useStateTogether(
    "selectedColor",
    "#ff0"
  );
  const client = createPublicClient({
    chain: monadTestnet,
    transport: http(),
  });

  const { sendTransaction } = useSendTransaction();
  const walelts = useWallets();
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [isOnchain, setIsOnchain] = useState(true);
  const [scale, setScale] = useState(INITIAL_SCALE);
  const [offset, setOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [hoverPixel, setHoverPixel] = useState<{ x: number; y: number } | null>(
    null
  );
  const [selectedPixel, setSelectedPixel] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [booms, setBooms] = useState<
    { x: number; y: number; radius: number; id: number }[]
  >([]);
  const [overlayImg, setOverlayImg] = useState<HTMLImageElement | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0.4);
  const [overlayOffset, setOverlayOffset] = useState({ x: 5, y: 5 });
  const draggingOverlay = useRef(false);

  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const canvasSize = { width: 550, height: 550 };

  const getColor = (x: number, y: number): string => {
    const key = `${x},${y}`;
    return pixelUpdates[key] || "#111";
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    const startX = Math.max(0, Math.floor(offset.x));
    const startY = Math.max(0, Math.floor(offset.y));
    const endX = Math.min(
      CANVAS_SIZE,
      Math.ceil(offset.x + canvasSize.width / scale)
    );
    const endY = Math.min(
      CANVAS_SIZE,
      Math.ceil(offset.y + canvasSize.height / scale)
    );

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const cx = Math.floor((x - offset.x) * scale);
        const cy = Math.floor((y - offset.y) * scale);

        ctx.fillStyle = getColor(x, y);
        ctx.fillRect(cx, cy, scale, scale);

        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.lineWidth = 1;
        ctx.strokeRect(cx + 0.5, cy + 0.5, scale - 1, scale - 1);
      }
    }

    if (overlayImg) {
      ctx.globalAlpha = overlayOpacity;
      ctx.drawImage(
        overlayImg,
        (overlayOffset.x - offset.x) * scale,
        (overlayOffset.y - offset.y) * scale,
        25 * scale,
        25 * scale
      );
      ctx.globalAlpha = 1;
    }

    if (hoverPixel && scale >= 2) {
      const { x, y } = hoverPixel;
      const hx = (x - offset.x) * scale;
      const hy = (y - offset.y) * scale;

      ctx.strokeStyle = "white";
      ctx.lineWidth = 1;
      ctx.strokeRect(hx + 0.5, hy + 0.5, scale - 1, scale - 1);

      ctx.beginPath();
      ctx.moveTo(hx + scale / 2, hy - 10);
      ctx.lineTo(hx + scale / 2 - 5, hy - 2);
      ctx.lineTo(hx + scale / 2 + 5, hy - 2);
      ctx.closePath();
      ctx.fillStyle = "yellow";
      ctx.fill();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    draw(ctx);
  }, [
    scale,
    offset.x,
    offset.y,
    hoverPixel?.x,
    hoverPixel?.y,
    selectedPixel?.x,
    selectedPixel?.y,
    pixelUpdates,
    overlayImg,
    overlayOpacity,
    overlayOffset,
  ]);
  useEffect(() => {
    const unwatch = client.watchContractEvent({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      eventName: "AreaBombed",
      onLogs: (logs) => {
        for (const log of logs) {
          const { x, y, radius } = log.args;
          setBooms((prev) => [
            ...prev,
            {
              x: Number(x),
              y: Number(y),
              radius: Number(radius),
              id: Date.now(),
            },
          ]);
        }
      },
    });
    return () => unwatch();
  }, []);
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const px = Math.floor(x / scale + offset.x);
    const py = Math.floor(y / scale + offset.y);
    if (px >= 0 && py >= 0 && px < CANVAS_SIZE && py < CANVAS_SIZE) {
      setHoverPixel((prev) =>
        !prev || prev.x !== px || prev.y !== py ? { x: px, y: py } : prev
      );
    } else {
      setHoverPixel(null);
    }

    if (dragging.current) {
      const dx = (lastMouse.current.x - e.clientX) / scale;
      const dy = (lastMouse.current.y - e.clientY) / scale;
      const newOffsetX = Math.max(
        0,
        Math.min(CANVAS_SIZE - canvasSize.width / scale, offset.x + dx)
      );
      const newOffsetY = Math.max(
        0,
        Math.min(CANVAS_SIZE - canvasSize.height / scale, offset.y + dy)
      );
      setOffset({ x: newOffsetX, y: newOffsetY });
      lastMouse.current = { x: e.clientX, y: e.clientY };
    } else if (draggingOverlay.current && overlayImg) {
      const dx = (e.clientX - lastMouse.current.x) / scale;
      const dy = (e.clientY - lastMouse.current.y) / scale;
      setOverlayOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      lastMouse.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (overlayImg && hoverPixel) {
      const withinOverlay =
        hoverPixel.x >= overlayOffset.x &&
        hoverPixel.x < overlayOffset.x + 25 &&
        hoverPixel.y >= overlayOffset.y &&
        hoverPixel.y < overlayOffset.y + 25;
      if (withinOverlay) {
        draggingOverlay.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        return;
      }
    }
    dragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    dragging.current = false;
    draggingOverlay.current = false;
    if (hoverPixel) setSelectedPixel({ x: hoverPixel.x, y: hoverPixel.y });
  };

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldX = mouseX / scale + offset.x;
    const worldY = mouseY / scale + offset.y;

    const delta = e.deltaY > 0 ? -1 : 1;
    const newScale = Math.max(MIN_SCALE, Math.min(40, scale + delta));

    const newOffsetX = Math.max(
      0,
      Math.min(
        CANVAS_SIZE - canvasSize.width / newScale,
        worldX - mouseX / newScale
      )
    );
    const newOffsetY = Math.max(
      0,
      Math.min(
        CANVAS_SIZE - canvasSize.height / newScale,
        worldY - mouseY / newScale
      )
    );

    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [scale, offset]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 25;
        canvas.height = 25;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 25, 25);
        const previewImg = new Image();
        previewImg.src = canvas.toDataURL();
        previewImg.onload = () => setOverlayImg(previewImg);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };
  useEffect(() => {
    const timer = setInterval(() => {
      setBooms((prev) => prev.filter((b) => Date.now() - b.id < 800));
    }, 3000);
    return () => clearInterval(timer);
  }, []);
  const handleColorClick = async (color: string) => {
    setSelectedColor(color);
    if (selectedPixel) {
      const key = `${selectedPixel.x},${selectedPixel.y}`;
      const injectedWallet = walelts.wallets.find(
        (wallet) => wallet.connectorType === "injected"
      );
      if (isOnchain) {
        await injectedWallet!.switchChain(monadTestnet.id);
        const data = encodeFunctionData({
          abi: CONTRACT_ABI,
          functionName: "placePixel",
          args: [
            BigInt(selectedPixel.x),
            BigInt(selectedPixel.y),
            selectedColor,
          ],
        });
        try {
          const hash = await sendTransaction(
            {
              to: CONTRACT_ADDRESS,
              data,
            },
            { address: injectedWallet!.address }
          );
          const shortHash = `${hash.hash.slice(0, 6)}...${hash.hash.slice(-4)}`;
          setPixelUpdates({ ...pixelUpdates, [key]: color });
          setToast({
            message: `Pixel placed tx: ${shortHash}`,
            type: "success",
          });
        } catch (err) {
          setToast({ message: "Transaction failed!", type: "error" });
        }
      } else {
        setPixelUpdates({ ...pixelUpdates, [key]: color });
      }
    }
  };
  const handleThrowBoom = async () => {
    const bombCount = await client.readContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "bombs",
      args: [walelts.wallets[0].address as `0x${string}`],
    });
    const injectedWallet = walelts.wallets.find(
      (wallet) => wallet.connectorType === "injected"
    );
    if (Number(bombCount) > 0 && selectedPixel) {
      await injectedWallet!.switchChain(monadTestnet.id);
      const data = encodeFunctionData({
        abi: CONTRACT_ABI,
        functionName: "bombArea",
        args: [BigInt(selectedPixel.x), BigInt(selectedPixel.y), BigInt(3)],
      });
      try {
        const hash = await sendTransaction(
          {
            to: CONTRACT_ADDRESS,
            data,
          },
          { address: injectedWallet!.address }
        );
        setTimeout(() => {
          const updates: Record<string, string> = {};
          for (let dx = -3; dx <= 3; dx++) {
            for (let dy = -3; dy <= 3; dy++) {
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist <= 3) {
                const px = selectedPixel.x + dx;
                const py = selectedPixel.y + dy;
                const key = `${px},${py}`;
                updates[key] = "#111"; // màu gốc
              }
            }
          }
          setPixelUpdates((prev) => ({ ...prev, ...updates }));
        }, 4000);
        const shortHash = `${hash.hash.slice(0, 6)}...${hash.hash.slice(-4)}`;
        setToast({ message: `Pixel placed tx: ${shortHash}`, type: "success" });
      } catch (error) {
        setToast({ message: "Transaction failed!", type: "error" });
      }
    } else {
      setToast({ message: "You don't have BOOM", type: "error" });
    }
  };
  const handleBuyBomb = async () => {
    if (!walelts.ready) return;
    const injectedWallet = walelts.wallets.find(
      (wallet) => wallet.connectorType === "injected"
    );
    await injectedWallet!.switchChain(monadTestnet.id);
    const price: bigint = await client.readContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "bombPrice",
    });
    const data = encodeFunctionData({
      abi: CONTRACT_ABI,
      functionName: "buyBomb",
      args: [],
    });
    try {
      const hash = await sendTransaction(
        {
          to: CONTRACT_ADDRESS,
          value: price,
          data,
        },
        { address: injectedWallet!.address }
      );
      const shortHash = `${hash.hash.slice(0, 6)}...${hash.hash.slice(-4)}`;
      setToast({ message: `Buy BOOM tx: ${shortHash}`, type: "success" });
    } catch (error) {
      setToast({ message: "Transaction failed!", type: "error" });
    }
  };
  return (
    <div className="flex flex-row items-start justify-center h-screen bg-[#111] text-white p-4 gap-4">
      <div className="relative">
        <div className="flex justify-center mb-4">
          <button
            onClick={() => setIsOnchain(!isOnchain)}
            className={`flex items-center px-4 py-2 rounded-full border transition-all duration-300 text-sm font-medium shadow-md
            ${
              isOnchain
                ? "bg-green-600 text-white border-green-700 hover:bg-green-700"
                : "bg-gray-700 text-gray-200 border-gray-600 hover:bg-gray-600"
            }
          `}
          >
            {isOnchain ? "Onchain Mode" : "Offchain Mode"}
          </button>
        </div>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          className="border border-gray-700 cursor-crosshair"
        />
        {booms.map((b) => (
          <BoomEffect
            key={b.id}
            x={b.x}
            y={b.y}
            radius={b.radius}
            scale={scale}
            offset={offset}
          />
        ))}
        {hoverPixel && (
          <div className="absolute top-0 left-0 ml-2 text-sm bg-black p-1 rounded">
            X: {hoverPixel.x}, Y: {hoverPixel.y}
          </div>
        )}
        <div className="grid grid-cols-15 gap-1 mt-2 justify-center">
          {COLORS.map((color) => (
            <div
              key={color}
              className="w-8 h-8 rounded cursor-pointer border border-white"
              style={{ backgroundColor: color }}
              onClick={() => handleColorClick(color)}
            ></div>
          ))}
        </div>
        <input
          type="range"
          min={1}
          max={40}
          value={scale}
          onChange={(e) => setScale(Number(e.target.value))}
          className="mt-2 w-full"
        />
      </div>
      <div className="w-16 flex flex-col items-center gap-2 relative">
        <label
          htmlFor="upload"
          className="w-15 h-15 rounded bg-gray-700 flex items-center justify-center text-xl cursor-pointer overflow-hidden"
        >
          {overlayImg ? (
            <img
              src={overlayImg.src}
              alt="overlay"
              className="w-full h-full object-cover"
            />
          ) : (
            "+"
          )}
        </label>
        <input
          id="upload"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        {overlayImg && (
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={overlayOpacity}
            onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
            className="w-full"
          />
        )}
        <button
          onClick={handleBuyBomb}
          className="px-3 py-2 bg-green-700 rounded text-sm"
        >
          Buy Bomb
        </button>
        <button
          onClick={handleThrowBoom}
          className="px-3 py-2 bg-red-700 rounded text-sm"
        >
          Throw Bomb
        </button>
        <ChatGame /> {/* 👈 Thêm component toggle ở đây */}
      </div>

      {toast && (
        <TransactionToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
