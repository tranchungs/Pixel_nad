"use client";

import { useRef, useEffect, useState } from "react";
import { useStateTogether } from "react-together";
import { useWallets, useSendTransaction } from "@privy-io/react-auth";
import { encodeFunctionData, parseAbi } from "viem";
import { myCustomChain } from "./MyCustomChain";
import TransactionToast from "./TransactionToast";
import { createPublicClient, http } from "viem";
import BoomEffect from "./BoomEffect";
import ChatGame from "./ChatGame";
import { getPinataService } from "./pinataService";
import BombTargetHighlight from "./BombTargetHighlight";

const CANVAS_SIZE = 500;
const INITIAL_SCALE = 16;
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

const CONTRACT_ADDRESS = "0x3242dF3a643acf223127911599C8050299df59EF";
const CONTRACT_ABI = parseAbi([
  "event AreaBombed(address indexed user, uint256 x, uint256 y, uint256 radius)",
  "function bombs(address user) external view returns (uint256)",
  "function bombPrice() view returns (uint256)",
  "function buyBomb() external payable",
  "function bombArea(uint256 centerX, uint256 centerY, uint256 radius) external",
  "function placePixel(uint256 x, uint256 y, string color) external",
  "function mintNFT(string memory tokenURI) external returns (uint256)",
  "event NFTMinted(address indexed to, uint256 tokenId, string tokenURI)",
]);

export default function PixelBoard() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const highlightCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pixelUpdates, setPixelUpdates] = useStateTogether<
    Record<string, string>
  >("pixelUpdates", {});
  const [selectedColor, setSelectedColor] = useStateTogether(
    "selectedColor",
    "#ff0"
  );

  const client = createPublicClient({
    chain: myCustomChain,
    transport: http(),
  });
  const pinata = getPinataService();
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
  // HightLight
  const [targetHighlights, setTargetHighlights] = useState<
    Array<{
      x: number;
      y: number;
      radius: number;
      id: number;
    }>
  >([]);
  // NFT States
  const [isSelectingNFTArea, setIsSelectingNFTArea] = useState(false);
  const [nftSelectionStart, setNftSelectionStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [nftSelectionEnd, setNftSelectionEnd] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectedNFTArea, setSelectedNFTArea] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [nftImage, setNftImage] = useState<string | null>(null);

  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const canvasSize = { width: 550, height: 550 };

  // ✅ NEW: Check if interactions should be disabled
  const isInteractionDisabled =
    targetHighlights.length > 0 || isSelectingNFTArea;

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

    // Draw pixels
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

    // Draw overlay image
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

    // Draw NFT selection area while selecting
    if (isSelectingNFTArea && nftSelectionStart && nftSelectionEnd) {
      const minX = Math.min(nftSelectionStart.x, nftSelectionEnd.x);
      const minY = Math.min(nftSelectionStart.y, nftSelectionEnd.y);
      const maxX = Math.max(nftSelectionStart.x, nftSelectionEnd.x);
      const maxY = Math.max(nftSelectionStart.y, nftSelectionEnd.y);

      const screenX = (minX - offset.x) * scale;
      const screenY = (minY - offset.y) * scale;
      const screenWidth = (maxX - minX + 1) * scale;
      const screenHeight = (maxY - minY + 1) * scale;

      // Draw semi-transparent yellow background
      ctx.fillStyle = "rgba(255, 214, 53, 0.3)";
      ctx.fillRect(screenX, screenY, screenWidth, screenHeight);

      // Draw thick yellow border
      ctx.strokeStyle = "#FFD635";
      ctx.lineWidth = 3;
      ctx.strokeRect(screenX, screenY, screenWidth, screenHeight);

      // Draw dashed white border inside
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = "#FFF";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        screenX + 2,
        screenY + 2,
        screenWidth - 4,
        screenHeight - 4
      );
      ctx.setLineDash([]); // Reset line dash

      // Show selection size
      ctx.fillStyle = "#FFD635";
      ctx.font = "12px Arial";
      const width = maxX - minX + 1;
      const height = maxY - minY + 1;
      ctx.fillText(`${width}×${height}`, screenX, screenY - 5);
    }

    // Draw confirmed NFT area
    if (selectedNFTArea && !isSelectingNFTArea) {
      const screenX = (selectedNFTArea.x - offset.x) * scale;
      const screenY = (selectedNFTArea.y - offset.y) * scale;
      const screenWidth = selectedNFTArea.width * scale;
      const screenHeight = selectedNFTArea.height * scale;

      // Draw yellow border
      ctx.strokeStyle = "#FFD635";
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX, screenY, screenWidth, screenHeight);

      // Draw corner indicators
      const cornerSize = 8;
      ctx.fillStyle = "#FFD635";

      // Four corners
      ctx.fillRect(
        screenX - cornerSize / 2,
        screenY - cornerSize / 2,
        cornerSize,
        cornerSize
      );
      ctx.fillRect(
        screenX + screenWidth - cornerSize / 2,
        screenY - cornerSize / 2,
        cornerSize,
        cornerSize
      );
      ctx.fillRect(
        screenX - cornerSize / 2,
        screenY + screenHeight - cornerSize / 2,
        cornerSize,
        cornerSize
      );
      ctx.fillRect(
        screenX + screenWidth - cornerSize / 2,
        screenY + screenHeight - cornerSize / 2,
        cornerSize,
        cornerSize
      );

      // Add "NFT AREA" text
      ctx.fillStyle = "#FFD635";
      ctx.font = "12px Arial";
      ctx.fillText("NFT AREA", screenX, screenY - 5);
    }

    // Draw hover pixel (only when not selecting NFT and not targeting bomb)
    if (
      hoverPixel &&
      scale >= 2 &&
      !isSelectingNFTArea &&
      targetHighlights.length === 0
    ) {
      const { x, y } = hoverPixel;
      const hx = (x - offset.x) * scale;
      const hy = (y - offset.y) * scale;
      console.log("Hover pixel draw:", { x, y, hx, hy, scale, offset });
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
    isSelectingNFTArea,
    nftSelectionStart,
    nftSelectionEnd,
    selectedNFTArea,
    targetHighlights.length, // ✅ Add dependency to re-render when targeting
  ]);

  useEffect(() => {
    // ✅ Early return nếu wallet chưa ready
    if (!walelts.ready) return;

    const injectedWallet = walelts.wallets.find(
      (wallet) => wallet.connectorType === "injected"
    );

    // ✅ Nếu không tìm thấy wallet thì return
    if (!injectedWallet) return;

    console.log(
      "Setting up event listener with wallet:",
      injectedWallet.address
    );

    const unwatch = client.watchContractEvent({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      eventName: "AreaBombed",
      onLogs: (logs) => {
        for (const log of logs) {
          const { x, y, radius } = log.args;

          // ✅ CHECK nếu là wallet của mình thì skip boom effect
          const isMyBomb = log.args?.user == injectedWallet.address;

          console.log("isMyBomb:", isMyBomb);
          console.log("Event user:", log.args?.user);
          console.log("My address:", injectedWallet.address);

          if (!isMyBomb) {
            setBooms((prev) => [
              ...prev,
              {
                x: Number(x),
                y: Number(y),
                radius: Number(radius),
                id: Date.now(),
                duration: 2,
              },
            ]);
          }

          // ✅ LUÔN sync pixels (quan trọng cho multiplayer)
          const updates: Record<string, string> = {};
          const centerX = Number(x);
          const centerY = Number(y);
          const bombRadius = Number(radius);

          for (let dx = -bombRadius; dx <= bombRadius; dx++) {
            for (let dy = -bombRadius; dy <= bombRadius; dy++) {
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist <= bombRadius) {
                const px = centerX + dx;
                const py = centerY + dy;
                const key = `${px},${py}`;
                updates[key] = "#111";
              }
            }
          }

          setPixelUpdates((prev) => ({ ...prev, ...updates }));
        }
      },
    });

    return () => unwatch();
  }, [walelts.ready]); // ✅ Dependency: re-run khi wallet ready

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

      // Update NFT selection end point while dragging
      if (isSelectingNFTArea && nftSelectionStart) {
        setNftSelectionEnd({ x: px, y: py });
      }
    } else {
      setHoverPixel(null);
    }

    // ✅ DISABLE canvas dragging when targeting bomb or selecting NFT
    if (dragging.current && !isInteractionDisabled) {
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
    } else if (
      draggingOverlay.current &&
      overlayImg &&
      !isInteractionDisabled
    ) {
      const dx = (e.clientX - lastMouse.current.x) / scale;
      const dy = (e.clientY - lastMouse.current.y) / scale;
      setOverlayOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      lastMouse.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // ✅ DISABLE all interactions when targeting bomb
    if (targetHighlights.length > 0) {
      return;
    }

    if (isSelectingNFTArea && hoverPixel) {
      // Start NFT area selection
      setNftSelectionStart({ x: hoverPixel.x, y: hoverPixel.y });
      setNftSelectionEnd({ x: hoverPixel.x, y: hoverPixel.y });
      return;
    }

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

    if (!isSelectingNFTArea) {
      dragging.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    if (isSelectingNFTArea && nftSelectionStart && nftSelectionEnd) {
      // Confirm NFT area selection
      const startX = Math.min(nftSelectionStart.x, nftSelectionEnd.x);
      const startY = Math.min(nftSelectionStart.y, nftSelectionEnd.y);
      const width = Math.abs(nftSelectionEnd.x - nftSelectionStart.x) + 1;
      const height = Math.abs(nftSelectionEnd.y - nftSelectionStart.y) + 1;

      setSelectedNFTArea({ x: startX, y: startY, width, height });
      setIsSelectingNFTArea(false);
      setNftSelectionStart(null);
      setNftSelectionEnd(null);

      // Generate NFT image
      generateNFTImage(startX, startY, width, height);

      setToast({
        message: `NFT area selected: ${width}×${height} pixels. Click Mint NFT again to create!`,
        type: "success",
      });
      return;
    }

    dragging.current = false;
    draggingOverlay.current = false;

    // ✅ ONLY allow pixel selection when not targeting bomb
    if (hoverPixel && !isSelectingNFTArea && targetHighlights.length === 0) {
      setSelectedPixel({ x: hoverPixel.x, y: hoverPixel.y });
    }
  };

  const handleWheel = (e: WheelEvent) => {
    // ✅ DISABLE zoom when targeting bomb or selecting NFT
    if (isInteractionDisabled) {
      e.preventDefault();
      return;
    }

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
  }, [scale, offset, isInteractionDisabled]); // ✅ Add dependency

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
        await injectedWallet!.switchChain(myCustomChain.id);
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
    const injectedWallet = walelts.wallets.find(
      (wallet) => wallet.connectorType === "injected"
    );

    if (!injectedWallet) {
      setToast({ message: "Wallet not found", type: "error" });
      return;
    }

    if (!selectedPixel) {
      setToast({ message: "Please select a pixel first", type: "error" });
      return;
    }
    const targetId = Date.now();
    try {
      const bombCount = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "bombs",
        args: [injectedWallet.address as `0x${string}`],
      });

      if (Number(bombCount) === 0) {
        setToast({ message: "You don't have any BOOM", type: "error" });
        return;
      }

      await injectedWallet.switchChain(myCustomChain.id);

      const data = encodeFunctionData({
        abi: CONTRACT_ABI,
        functionName: "bombArea",
        args: [BigInt(selectedPixel.x), BigInt(selectedPixel.y), BigInt(3)],
      });

      setTargetHighlights((prev) => [
        ...prev,
        {
          x: selectedPixel.x,
          y: selectedPixel.y,
          radius: 3,
          id: targetId,
        },
      ]);
      const hash = await sendTransaction(
        {
          to: CONTRACT_ADDRESS,
          data,
        },
        { address: injectedWallet.address }
      );
      // ✅ TRANSACTION SUCCESS → BOOM NGAY!
      setTargetHighlights((prev) => prev.filter((t) => t.id !== targetId));
      setBooms((prev) => [
        ...prev,
        {
          x: selectedPixel.x,
          y: selectedPixel.y,
          radius: 3,
          id: Date.now(),
          duration: 5, // ← Có thể chỉnh thời gian nổ
        },
      ]);
      const shortHash = `${hash.hash.slice(0, 6)}...${hash.hash.slice(-4)}`;
      setToast({
        message: `💥 BOOM! Transaction: ${shortHash}`,
        type: "success",
      });
      // 🎯 CLEAR PIXELS IMMEDIATELY for better UX
      const updates: Record<string, string> = {};
      for (let dx = -3; dx <= 3; dx++) {
        for (let dy = -3; dy <= 3; dy++) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= 3) {
            const px = selectedPixel.x + dx;
            const py = selectedPixel.y + dy;
            const key = `${px},${py}`;
            updates[key] = "#111"; // Clear to background color
          }
        }
      }

      // Apply immediately for instant feedback
      setPixelUpdates((prev) => ({ ...prev, ...updates }));
    } catch (error) {
      console.error("Bomb transaction failed:", error);
      setToast({ message: "Transaction failed!", type: "error" });
      setTargetHighlights((prev) => prev.filter((t) => t.id !== targetId));
      // 🔄 ROLLBACK pixels if transaction fails
      // You might want to store original state and restore it here
    }
  };

  const handleBuyBomb = async () => {
    if (!walelts.ready) return;
    const injectedWallet = walelts.wallets.find(
      (wallet) => wallet.connectorType === "injected"
    );
    await injectedWallet!.switchChain(myCustomChain.id);
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

  // Generate NFT image from selected area
  const generateNFTImage = (
    startX: number,
    startY: number,
    width: number,
    height: number
  ) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size (scale up for better quality)
    const pixelSize = 10;
    canvas.width = width * pixelSize;
    canvas.height = height * pixelSize;

    // Draw the selected area
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const color = getColor(startX + x, startY + y);
        ctx.fillStyle = color;
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }

    // Convert to data URL
    const dataURL = canvas.toDataURL("image/png");
    setNftImage(dataURL);
  };

  // Cancel NFT selection
  const cancelNFTSelection = () => {
    setIsSelectingNFTArea(false);
    setNftSelectionStart(null);
    setNftSelectionEnd(null);
    setSelectedNFTArea(null);
    setNftImage(null);
  };

  // Main NFT minting function
  const handleMintNFT = async () => {
    if (!walelts.ready) return;
    const injectedWallet = walelts.wallets.find(
      (wallet) => wallet.connectorType === "injected"
    );
    if (!selectedNFTArea || !nftImage) {
      // Start area selection mode
      setIsSelectingNFTArea(true);
      setSelectedNFTArea(null);
      setNftImage(null);
      setToast({
        message: "🎨 Click and drag to select an area for NFT minting",
        type: "success",
      });
      return;
    }

    // For now, just show success message with image data
    try {
      // Create metadata
      const metadata = {
        name: `Pixel Art`,
        description: `Pixel art created on canvas at coordinates (${selectedNFTArea.x}, ${selectedNFTArea.y})`,
        image: nftImage,
        attributes: [
          {
            trait_type: "Width",
            value: selectedNFTArea.width,
          },
          {
            trait_type: "Height",
            value: selectedNFTArea.height,
          },
          {
            trait_type: "X Position",
            value: selectedNFTArea.x,
          },
          {
            trait_type: "Y Position",
            value: selectedNFTArea.y,
          },
        ],
      };

      const result = await pinata.uploadCompleteNFT(nftImage, metadata);
      console.log(result);
      setToast({
        message: `✅ NFT prepared! ${selectedNFTArea.width}×${selectedNFTArea.height} pixels ready to mint`,
        type: "success",
      });
      const data = encodeFunctionData({
        abi: CONTRACT_ABI,
        functionName: "mintNFT",
        args: [result.metadataIPFS],
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
        setToast({ message: `Mint NFT tx: ${shortHash}`, type: "success" });
      } catch (error) {
        setToast({ message: "Transaction failed!", type: "error" });
      }
      // Reset selection
      setSelectedNFTArea(null);
      setNftImage(null);
    } catch (error) {
      console.error("NFT preparation failed:", error);
      setToast({ message: "NFT preparation failed!", type: "error" });
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

        {/* ✅ Show interaction disabled status */}
        {targetHighlights.length > 0 && (
          <div className="mb-2 p-2 bg-red-900 border border-red-600 rounded text-sm text-center">
            🎯 <strong>Targeting Mode</strong> - Canvas interactions disabled
          </div>
        )}

        {/* NFT Selection Status */}
        {(isSelectingNFTArea || selectedNFTArea) && (
          <div className="mb-2 p-2 bg-yellow-900 border border-yellow-600 rounded text-sm">
            {isSelectingNFTArea ? (
              <div className="flex justify-between items-center">
                <span>🎨 Selecting NFT area... Click and drag!</span>
                <button
                  onClick={cancelNFTSelection}
                  className="ml-2 px-2 py-1 bg-red-600 rounded text-xs hover:bg-red-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <span>
                  ✅ Area selected: {selectedNFTArea?.width}×
                  {selectedNFTArea?.height} pixels
                </span>
                <button
                  onClick={cancelNFTSelection}
                  className="ml-2 px-2 py-1 bg-gray-600 rounded text-xs hover:bg-gray-700"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        )}

        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          className={`border border-gray-700 ${
            isSelectingNFTArea
              ? "cursor-crosshair"
              : targetHighlights.length > 0
              ? "cursor-not-allowed"
              : "cursor-crosshair"
          }`}
        />
        {/* ✅ TARGET HIGHLIGHTS - THÊM VÀO ĐÂY */}
        <canvas
          ref={highlightCanvasRef}
          width={500}
          height={500}
          className="absolute left-0 top-0 z-20 pointer-events-none"
        />
        {targetHighlights.map((target) => (
          <BombTargetHighlight
            key={target.id}
            x={target.x}
            y={target.y}
            radius={target.radius}
            scale={scale}
            offset={offset}
            isActive={true}
            canvasRef={canvasRef} // ← Pass canvas ref
            onCancel={() => {
              setTargetHighlights((prev) =>
                prev.filter((t) => t.id !== target.id)
              );
            }}
          />
        ))}
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
          <div className="absolute top-0 left-0 ml-2 text-sm bg-black bg-opacity-75 p-1 rounded">
            X: {hoverPixel.x}, Y: {hoverPixel.y}
            {isSelectingNFTArea && nftSelectionStart && nftSelectionEnd && (
              <div>
                Selection:{" "}
                {Math.abs(nftSelectionEnd.x - nftSelectionStart.x) + 1}×
                {Math.abs(nftSelectionEnd.y - nftSelectionStart.y) + 1}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-15 gap-1 mt-2 justify-center">
          {COLORS.map((color) => (
            <div
              key={color}
              className="w-8 h-8 rounded cursor-pointer border border-white hover:scale-110 transition-transform"
              style={{ backgroundColor: color }}
              onClick={() => handleColorClick(color)}
            ></div>
          ))}
        </div>

        {/* ✅ DISABLE zoom slider when targeting */}
        <input
          type="range"
          min={1}
          max={40}
          value={scale}
          onChange={(e) => setScale(Number(e.target.value))}
          className="mt-2 w-full"
          disabled={isInteractionDisabled}
          style={{
            opacity: isInteractionDisabled ? 0.5 : 1,
            cursor: isInteractionDisabled ? "not-allowed" : "pointer",
          }}
        />
      </div>

      <div className="w-16 flex flex-col items-center gap-2 relative">
        <label
          htmlFor="upload"
          className="w-15 h-15 rounded bg-gray-700 flex items-center justify-center text-xl cursor-pointer overflow-hidden hover:bg-gray-600 transition-colors"
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
            disabled={isInteractionDisabled}
            style={{
              opacity: isInteractionDisabled ? 0.5 : 1,
              cursor: isInteractionDisabled ? "not-allowed" : "pointer",
            }}
          />
        )}

        <button
          onClick={handleBuyBomb}
          className="px-3 py-2 bg-green-700 rounded text-sm hover:bg-green-600 transition-colors"
          disabled={isInteractionDisabled}
          style={{
            opacity: isInteractionDisabled ? 0.5 : 1,
            cursor: isInteractionDisabled ? "not-allowed" : "pointer",
          }}
        >
          Buy Bomb
        </button>

        <button
          onClick={handleThrowBoom}
          className="px-3 py-2 bg-red-700 rounded text-sm hover:bg-red-600 transition-colors"
          disabled={targetHighlights.length > 0}
          style={{
            opacity: targetHighlights.length > 0 ? 0.5 : 1,
            cursor: targetHighlights.length > 0 ? "not-allowed" : "pointer",
          }}
        >
          {targetHighlights.length > 0 ? "Targeting..." : "Throw Bomb"}
        </button>

        <button
          onClick={handleMintNFT}
          className={`px-3 py-2 rounded text-sm transition-colors ${
            selectedNFTArea
              ? "bg-green-700 hover:bg-green-600 animate-pulse"
              : isSelectingNFTArea
              ? "bg-orange-700 hover:bg-orange-600"
              : "bg-yellow-700 hover:bg-yellow-600"
          }`}
          disabled={targetHighlights.length > 0}
          style={{
            opacity: targetHighlights.length > 0 ? 0.5 : 1,
            cursor: targetHighlights.length > 0 ? "not-allowed" : "pointer",
          }}
        >
          {selectedNFTArea
            ? "Create NFT!"
            : isSelectingNFTArea
            ? "Selecting..."
            : "Mint NFT"}
        </button>

        {/* Show NFT preview if available */}
        {nftImage && (
          <div className="mt-2 p-2 bg-gray-800 rounded border border-yellow-500">
            <div className="text-xs text-yellow-400 mb-1">NFT Preview:</div>
            <img
              src={nftImage}
              alt="NFT Preview"
              className="w-12 h-12 object-contain border border-gray-600 rounded"
            />
            <div className="text-xs text-gray-400 mt-1">
              {selectedNFTArea?.width}×{selectedNFTArea?.height}
            </div>
          </div>
        )}

        <ChatGame />
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
