"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./lib/contract";

type HashHistoryEntry = {
  fileName: string;
  hash: string;
  timestamp: number;
  txHash?: string;
};

export default function HomePage() {
  const [walletAddress, setWalletAddress] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [generatedHash, setGeneratedHash] = useState("");
  const [txHash, setTxHash] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const [verifyFile, setVerifyFile] = useState<File | null>(null);

  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [hashHistory, setHashHistory] = useState<HashHistoryEntry[]>([]);
  
  const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    alert("Copied to clipboard");
  } catch (err) {
    console.error(err);
  }
};

  useEffect(() => {
    const saved = localStorage.getItem("authentichain-history");

    if (saved) {
      setHashHistory(JSON.parse(saved));
    }
  }, []);

  const saveHistory = (history: HashHistoryEntry[]) => {
    setHashHistory(history);

    localStorage.setItem(
      "authentichain-history",
      JSON.stringify(history)
    );
  };

  const connectWallet = async () => {
    try {
      if (!(window as any).ethereum) {
        alert("Please install MetaMask.");
        return;
      }

      await (window as any).ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }],
      });

      const accounts = (await (window as any).ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      setWalletAddress(accounts[0]);
    } catch (err) {
      console.error(err);
    }
  };

  const generateHash = async () => {
    try {
      if (!selectedFile) return;

      if (!(window as any).ethereum) {
        alert("Please install MetaMask.");
        return;
      }

      setIsGenerating(true);

      setVerificationResult(null);

      const buffer = await selectedFile.arrayBuffer();

      const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        buffer
      );

      const hashArray = Array.from(new Uint8Array(hashBuffer));

      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      setGeneratedHash(hashHex);

      const provider = new ethers.BrowserProvider(
        (window as any).ethereum
      );

      const signer = await provider.getSigner();

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      const tx = await contract.storeHash("0x" + hashHex);

      setTxHash(tx.hash);

      await tx.wait();

      const newEntry: HashHistoryEntry = {
        fileName: selectedFile.name,
        hash: hashHex,
        timestamp: Date.now(),
        txHash: tx.hash,
      };

      const updatedHistory = [newEntry, ...hashHistory];

      saveHistory(updatedHistory);

      setVerificationResult({
        success: true,
        message:
          "Hash successfully stored on Sepolia blockchain.",
      });
    } catch (err) {
      console.error(err);

      setVerificationResult({
        success: false,
        message:
          "Transaction failed or hash already exists.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const verifyIntegrity = async () => {
    try {
      if (!verifyFile) return;

      setVerificationResult(null);

      const buffer = await verifyFile.arrayBuffer();

      const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        buffer
      );

      const hashArray = Array.from(new Uint8Array(hashBuffer));

      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (!(window as any).ethereum) {
        alert("Please install MetaMask.");
        return;
      }

      const provider = new ethers.BrowserProvider(
        (window as any).ethereum
      );

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
      );

      const result = await contract.verify("0x" + hashHex);

      const stored = result.stored;

const timestamp = Number(result.timestamp);

const uploader = result.uploader;

      if (stored) {
        const readableDate = new Date(
          timestamp * 1000
        ).toLocaleString();

        setVerificationResult({
          success: true,
          message:
            `Integrity VERIFIED.\n\n` +
            `Hash exists on blockchain.\n\n` +
            `Stored: ${readableDate}\n` +
            `Uploader: ${uploader}`,
        });
      } else {
        setVerificationResult({
          success: false,
          message:
            "Hash not found on blockchain. Document integrity cannot be verified.",
        });
      }
    } catch (err) {
      console.error(err);

      setVerificationResult({
        success: false,
        message: "Blockchain verification failed.",
      });
    }
  };

  return (
    <main className="min-h-screen bg-[#020817] text-white">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#020817]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Image
              src="/logo.png"
              alt="AuthentiChain Logo"
              width={260}
              height={80}
              style={{ width: "auto", height: "auto" }}
              priority
              className="object-contain"
            />
          </div>

          <div className="flex items-center gap-6">
          
          <div className="hidden items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 md:flex">
    <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />

    <span className="text-sm font-medium text-cyan-200">
      Sepolia Testnet
    </span>
  </div>
          
            <a
              href="#upload"
              className="text-slate-300 transition hover:text-white"
            >
              Upload
            </a>

            <a
              href="#verify"
              className="text-slate-300 transition hover:text-white"
            >
              Verify
            </a>

            <button
              onClick={connectWallet}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-3 font-semibold text-black transition hover:scale-105"
            >
              {walletAddress
                ? `${walletAddress.slice(
                    0,
                    6
                  )}...${walletAddress.slice(-4)}`
                : "Connect Wallet"}
            </button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute left-20 top-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-[120px]" />

        <div className="absolute right-20 top-20 h-72 w-72 rounded-full bg-blue-500/20 blur-[120px]" />

        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-16 px-6 py-2 lg:grid-cols-2">
          <div>
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-5 py-2 backdrop-blur-md shadow-[0_0_20px_rgba(34,211,238,0.08)]">
  <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />

  <span className="text-sm font-medium tracking-wide text-cyan-200">
    Blockchain-secured authenticity
  </span>
</div>

            <h2 className="max-w-3xl text-6xl font-black leading-tight">
              Prove document authenticity.

              <span className="block bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                Instantly. Permanently.
              </span>
            </h2>

            <p className="mt-8 max-w-2xl text-xl leading-relaxed text-slate-400">
              Upload a PDF document, generate a unique SHA-256 fingerprint, and anchor its authenticity on Ethereum.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 backdrop-blur-xl">
            <h3 className="mb-8 text-3xl font-bold">
              How AuthentiChain works
            </h3>

            <div className="space-y-8">
              {[
                {
                  title: "Upload PDF document",
                  desc: "Exact binary file uploaded locally.",
                },
                {
                  title: "Generate SHA-256 hash",
                  desc: "Unique cryptographic fingerprint.",
                },
                {
                  title: "Anchor proof on Ethereum",
                  desc: "Immutable timestamp proof.",
                },
                {
                  title: "Verify authenticity anytime",
                  desc: "Any modification changes the hash.",
                },
              ].map((step, index) => (
                <div
                  key={index}
                  className="flex items-start gap-5"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/20 font-bold text-cyan-300">
                    {index + 1}
                  </div>

                  <div>
                    <h4 className="text-xl font-semibold">
                      {step.title}
                    </h4>

                    <p className="mt-1 text-slate-400">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="upload"
        className="mx-auto max-w-4xl px-6 py-24"
      >
        <h2 className="mb-3 text-center text-5xl font-bold">
          Upload PDF
        </h2>

        <p className="mb-14 text-center text-slate-400">
          Generate a SHA-256 cryptographic hash from the exact
          PDF binary bytes.
        </p>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 backdrop-blur-xl">
          <label className="mb-5 block text-lg font-medium">
            PDF Invoice
          </label>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#0b1120] px-10 py-20 text-center transition hover:border-cyan-400/50">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-cyan-500/20 text-4xl">
              📄
            </div>

            {selectedFile ? (
              <>
                <p className="text-3xl font-semibold">
                  {selectedFile.name}
                </p>

                <p className="mt-3 text-slate-400">
                  {(selectedFile.size / 1024).toFixed(2)} KB · PDF
                </p>
              </>
            ) : (
              <>
                <p className="text-xl font-semibold">
                  Drag and drop your PDF here
                </p>

                <p className="mt-2 text-slate-400">
                  or click to browse
                </p>
              </>
            )}

            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) =>
                setSelectedFile(e.target.files?.[0] || null)
              }
            />
          </label>

          <button
            onClick={generateHash}
            disabled={!selectedFile || isGenerating}
            className="mt-10 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-8 py-5 text-lg font-bold text-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating
              ? "Generating..."
              : "Generate SHA-256 Hash"}
          </button>

          {generatedHash && (
            <div className="mt-10 rounded-2xl border border-cyan-500/20 bg-[#0b1120] p-8">
              <h3 className="mb-4 text-lg font-bold uppercase tracking-wider text-cyan-300">
                SHA-256 HASH
              </h3>

              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
  <p className="break-all font-mono text-cyan-200">
    {generatedHash}
  </p>

  <button
    onClick={() => copyToClipboard(generatedHash)}
    className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/20"
  >
    Copy Hash
  </button>
</div>
            </div>
          )}

          {txHash && (
            <div className="mt-8 rounded-2xl border border-green-500/20 bg-green-500/10 p-8">
              <h3 className="mb-4 text-lg font-bold uppercase tracking-wider text-green-300">
                Transaction Success
              </h3>

              <p className="mb-4 text-green-200">
                Hash stored successfully on Sepolia blockchain.
              </p>

	<div className="mb-5 flex flex-wrap gap-3">
  <button
    onClick={() => copyToClipboard(txHash)}
    className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/20"
  >
    Copy Transaction Hash
  </button>
</div>
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                className="inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200"
              >
                View transaction on Etherscan →
              </a>
            </div>
          )}
        </div>
      </section>

      <section
        id="verify"
        className="mx-auto max-w-4xl px-6 pb-28"
      >
        <h2 className="mb-3 text-center text-5xl font-bold">
          Verify PDF
        </h2>

        <p className="mb-14 text-center text-slate-400">
          Upload a PDF and verify whether its hash exists on
          the blockchain.
        </p>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 backdrop-blur-xl">
          <label className="mb-5 block text-lg font-medium">
            PDF to verify
          </label>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#0b1120] px-10 py-20 text-center transition hover:border-cyan-400/50">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-cyan-500/20 text-4xl">
              📄
            </div>

            {verifyFile ? (
              <>
                <p className="text-3xl font-semibold">
                  {verifyFile.name}
                </p>

                <p className="mt-3 text-slate-400">
                  {(verifyFile.size / 1024).toFixed(2)} KB · PDF
                </p>
              </>
            ) : (
              <>
                <p className="text-xl font-semibold">
                  Drag and drop your PDF here
                </p>

                <p className="mt-2 text-slate-400">
                  or click to browse
                </p>
              </>
            )}

            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) =>
                setVerifyFile(e.target.files?.[0] || null)
              }
            />
          </label>

          <button
            onClick={verifyIntegrity}
            disabled={!verifyFile}
            className="mt-10 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-8 py-5 text-lg font-bold text-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Verify PDF Integrity
          </button>

          {verificationResult && (
            <div
              className={`mt-10 rounded-2xl border p-8 ${
                verificationResult.success
                  ? "border-green-500/20 bg-green-500/10"
                  : "border-red-500/20 bg-red-500/10"
              }`}
            >
              <h3
                className={`mb-4 text-lg font-bold uppercase tracking-wider ${
                  verificationResult.success
                    ? "text-green-300"
                    : "text-red-300"
                }`}
              >
                Verification Result
              </h3>

              <p
                className={`whitespace-pre-line text-lg ${
                  verificationResult.success
                    ? "text-green-200"
                    : "text-red-200"
                }`}
              >
                {verificationResult.message}
              </p>
            </div>
          )}
        </div>
      </section>
      
      <footer className="border-t border-white/10 bg-[#020817]">
  <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-10 text-center md:text-left">
    <div>
      <h3 className="text-lg font-semibold text-white">
        AuthentiChain
      </h3>

      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
        Blockchain-based document authenticity verification prototype
        built for academic and demonstration purposes.
      </p>
    </div>

    <div className="text-sm leading-relaxed text-slate-500">
      This application is a school project prototype and should not be
      considered production-ready software. The authors assume no liability
      for data loss, misuse, incorrect verification results, or financial
      damages arising from its use.
    </div>

    <div className="pt-2 text-xs text-slate-600">
      © 2026 AuthentiChain · Ethereum Sepolia Testnet
    </div>
  </div>
</footer>
      
      
      
    </main>
  );
}
