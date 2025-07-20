// pinataService.ts
import { PinataSDK } from "pinata";

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export interface NFTUploadResult {
  imageIPFS: string;
  metadataIPFS: string;
  imageHash: string;
  metadataHash: string;
  tokenURI: string;
}

class PinataService {
  private pinata: PinataSDK;

  constructor(jwt?: string, gateway?: string) {
    const pinataJWT = jwt || process.env.NEXT_PUBLIC_PINATA_JWT || "";
    const pinataGateway =
      gateway || process.env.NEXT_PUBLIC_PINATA_GATEWAY || "";

    if (!pinataJWT) {
      throw new Error("Pinata JWT token is required");
    }

    this.pinata = new PinataSDK({
      pinataJwt: pinataJWT,
      pinataGateway: pinataGateway,
    });
  }

  /**
   * Convert dataURL to File object
   */
  private dataURLtoFile(dataURL: string, filename: string): File {
    const arr = dataURL.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new File([u8arr], filename, { type: mime });
  }

  /**
   * Upload NFT image from dataURL
   */
  async uploadNFTImage(
    imageDataURL: string,
    filename?: string
  ): Promise<{ ipfsHash: string; ipfsURL: string }> {
    try {
      const fileName = filename || `nft-image-${Date.now()}.png`;
      const file = this.dataURLtoFile(imageDataURL, fileName);

      console.log("📸 Uploading NFT image to IPFS...");

      const upload = await this.pinata.upload.public.file(file);

      return {
        ipfsHash: upload.cid,
        ipfsURL: `https://gateway.pinata.cloud/ipfs/${upload.cid}`,
      };
    } catch (error) {
      console.error("Error uploading image to Pinata:", error);
      throw new Error(`Failed to upload image: ${error}`);
    }
  }

  /**
   * Upload NFT metadata JSON
   */
  async uploadNFTMetadata(
    metadata: NFTMetadata,
    filename?: string
  ): Promise<{ ipfsHash: string; ipfsURL: string }> {
    try {
      const fileName = filename || `nft-metadata-${Date.now()}.json`;

      console.log("📄 Uploading NFT metadata to IPFS...");

      // Try the simplest approach first
      const upload = await this.pinata.upload.public.json(metadata);

      return {
        ipfsHash: upload.cid,
        ipfsURL: `https://gateway.pinata.cloud/ipfs/${upload.cid}`,
      };
    } catch (error) {
      console.error("Error uploading metadata to Pinata:", error);
      throw new Error(`Failed to upload metadata: ${error}`);
    }
  }

  /**
   * Complete NFT upload process: Image + Metadata
   */
  async uploadCompleteNFT(
    imageDataURL: string,
    metadata: Omit<NFTMetadata, "image">,
    options?: {
      imageFilename?: string;
      metadataFilename?: string;
    }
  ): Promise<NFTUploadResult> {
    try {
      // Step 1: Upload image
      console.log("🚀 Starting NFT upload process...");
      const imageUpload = await this.uploadNFTImage(
        imageDataURL,
        options?.imageFilename
      );

      // Step 2: Create complete metadata with IPFS image URL
      const completeMetadata: NFTMetadata = {
        ...metadata,
        image: imageUpload.ipfsURL,
      };

      // Step 3: Upload metadata
      const metadataUpload = await this.uploadNFTMetadata(
        completeMetadata,
        options?.metadataFilename
      );

      console.log("✅ NFT upload completed successfully!");
      console.log("📸 Image IPFS:", imageUpload.ipfsURL);
      console.log("📄 Metadata IPFS:", metadataUpload.ipfsURL);

      return {
        imageIPFS: imageUpload.ipfsURL,
        metadataIPFS: metadataUpload.ipfsURL,
        imageHash: imageUpload.ipfsHash,
        metadataHash: metadataUpload.ipfsHash,
        tokenURI: metadataUpload.ipfsURL, // This is what goes to the smart contract
      };
    } catch (error) {
      console.error("❌ NFT upload failed:", error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const result = await this.pinata.testAuthentication();
      console.log("✅ Pinata connection successful");
      return true;
    } catch (error) {
      console.error("❌ Pinata connection failed:", error);
      return false;
    }
  }
}

// Export singleton instance
let pinataService: PinataService | null = null;

export const getPinataService = (
  jwt?: string,
  gateway?: string
): PinataService => {
  if (!pinataService) {
    pinataService = new PinataService(jwt, gateway);
  }
  return pinataService;
};

export default PinataService;

// Usage example:
/*
// In your component:
import { getPinataService } from './pinataService';

const pinata = getPinataService();

// Upload complete NFT
const result = await pinata.uploadCompleteNFT(nftImageDataURL, {
  name: "My Pixel Art NFT",
  description: "Created on pixel canvas",
  attributes: [
    { trait_type: "Width", value: 10 },
    { trait_type: "Height", value: 10 }
  ]
});

// Use result.tokenURI for smart contract
console.log("Token URI:", result.tokenURI);
*/
