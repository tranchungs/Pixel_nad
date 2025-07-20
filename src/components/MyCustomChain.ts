import { defineChain } from "viem";
import { monadTestnet } from "viem/chains";

export const myCustomChain = defineChain(monadTestnet);
