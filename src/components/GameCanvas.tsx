"use client";
import { ReactTogether } from "react-together";
import PixelBoard from "./PixelBoard";
import { useMemo } from "react";
export default function Game() {
  console.log("Game rendered");
  const sessionParams = useMemo(
    () => ({
      apiKey: process.env.NEXT_PUBLIC_API_KEY!,
      appId: process.env.NEXT_PUBLIC_APP_ID!,
      name: process.env.NEXT_PUBLIC_SESSION_NAME!,
      password: process.env.NEXT_PUBLIC_SESSION_PASSWORD!,
    }),
    []
  );
  return (
    <ReactTogether sessionParams={sessionParams}>
      <PixelBoard />
    </ReactTogether>
  );
}
