"use client";

import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./lib/contract";

type EthereumProvider = {
  request: (args: { method: string }) => Promise<string[]>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const headingClass = "font-sans tracking-tight";

const glowShadow =
  "shadow-[0_0_0_1px_rgba(56,189,248,0.15),0_20px_60px_-20px_rgba(14,165,233,0.35)]";

const HASH_HISTORY_STORAGE_KEY = "authentichain:hash-history";

type HashHistoryEntry = {
  fileName: string;
  hash: string;
  timestamp: string;
};

function loadHashHistoryFromStorage(): HashHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HASH_HISTORY_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (entry): entry is HashHistoryEntry =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as HashHistoryEntry).fileName === "string" &&
        typeof (entry as HashHistoryEntry).hash === "string" &&
        typeof (entry as HashHistoryEntry).timestamp === "string"
    );
  } catch {
    return [];
  }
}

function saveHashHistoryToStorage(entries: HashHistoryEntry[]) {
  localStorage.setItem(HASH_HISTORY_STORAGE_KEY, JSON.stringify(entries));
}

async function sha256HexFromBuffer(
  buffer: ArrayBuffer
): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);

  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type CopyHashButtonProps = {
  hash: string;
  copyKey: string;
  copiedHashKey: string | null;
  onCopy: (hash: string, copyKey: string) => void;
};

function CopyHashButton({
  hash,
  copyKey,
  copiedHashKey,
  onCopy,
}: CopyHashButtonProps) {
  const copied = copiedHashKey === copyKey;

  return (
    <button
      type="button"
      onClick={() => onCopy(hash, copyKey)}
      className="shrink-0 rounded-lg border border-[#38bdf8]/20 bg-[#38bdf8]/10 px-3 py-1.5 text-xs font-medium text-[#7dd3fc] transition hover:bg-[#38bdf8]/20"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

async function storeHashOnChain(hashHex: string) {
  try {
    if (!window.ethereum) {
      alert("MetaMask required");
      return;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);

    const signer = await provider.getSigner();

    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      signer
    );

    const hashBytes32 = `0x${hashHex.replace(/^0x/, "")}`;

    const tx = await contract.storeHash(hashBytes32);

    await tx.wait();

    alert("Hash stored on blockchain");
  } catch (err) {
    console.error(err);
    alert("Transaction failed");
  }
}

type PdfDropZoneProps = {
  label: string;
  inputId: string;
  file: File | null;
  onFileSelect: (file: File | null) => void;
};

function isPdfFile(file: File) {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function PdfDropZone({
  label,
  inputId,
  file,
  onFileSelect,
}: PdfDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  function selectFile(nextFile: File | null) {
    if (nextFile && !isPdfFile(nextFile)) {
      alert("Please upload a PDF file.");
      return;
    }

    onFileSelect(nextFile);
  }

  function handleDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;

    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    selectFile(e.dataTransfer.files?.[0] ?? null);
  }

  return (
    <div>
      <label htmlFor={inputId} className="text-sm font-medium text-slate-300">
        {label}
      </label>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept=".pdf,application/pdf"
        className="sr-only"
        onChange={(e) => {
          selectFile(e.target.files?.[0] ?? null);
        }}
      />

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center transition ${
          isDragging
            ? `border-[#38bdf8]/50 bg-[#38bdf8]/10 ${glowShadow}`
            : "border-white/10 bg-white/5 hover:border-[#38bdf8]/30 hover:bg-[#38bdf8]/5"
        }`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#38bdf8]/15 text-2xl">
          📄
        </span>

        <p className="mt-4 text-sm font-medium text-white">
          {isDragging
            ? "Drop your PDF here"
            : file
            ? file.name
            : "Drag and drop your PDF here"}
        </p>

        <p className="mt-2 text-xs text-slate-400">
          {isDragging ? (
            "Release to upload"
          ) : (
            <>
              or{" "}
              <span className="font-medium text-[#7dd3fc]">
                click to browse
              </span>
            </>
          )}
        </p>

        {file && !isDragging ? (
          <p className="mt-3 text-xs text-slate-500">
            {(file.size / 1024).toFixed(2)} KB · PDF
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function Home() {
  const [uploadedFile, setUploadedFile] =
    useState<File | null>(null);

  const [invoiceHash, setInvoiceHash] =
    useState<string | null>(null);

  const [fileName, setFileName] =
    useState<string | null>(null);

  const [fileSize, setFileSize] =
    useState<number | null>(null);

  const [isHashing, setIsHashing] = useState(false);

  const [hashHistory, setHashHistory] =
    useState<HashHistoryEntry[]>([]);

  const [verifyFile, setVerifyFile] =
    useState<File | null>(null);

  const [selectedHistoryKey, setSelectedHistoryKey] =
    useState<string>("");

  const [verifyHash, setVerifyHash] =
    useState<string | null>(null);

  const [verificationResult, setVerificationResult] =
    useState<"verified" | "modified" | null>(null);

  const [isVerifying, setIsVerifying] = useState(false);

  const [copiedHashKey, setCopiedHashKey] =
    useState<string | null>(null);

  const [walletAddress, setWalletAddress] =
    useState("");

  const copyTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setHashHistory(loadHashHistoryFromStorage());
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  async function connectWallet() {
    try {
      if (!window.ethereum) {
        alert("MetaMask not detected");
        return;
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      setWalletAddress(accounts[0]);
    } catch (err) {
      console.error(err);
    }
  }

  async function copyHashToClipboard(
    hash: string,
    copyKey: string
  ) {
    try {
      await navigator.clipboard.writeText(hash);

      setCopiedHashKey(copyKey);

      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }

      copyTimeoutRef.current = setTimeout(() => {
        setCopiedHashKey(null);
      }, 2000);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSubmit(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!uploadedFile) {
      alert("Please upload a PDF invoice.");
      return;
    }

    try {
      setIsHashing(true);
      setInvoiceHash(null);

      const buffer = await uploadedFile.arrayBuffer();

      const hash = await sha256HexFromBuffer(buffer);

      setInvoiceHash(hash);
      setFileName(uploadedFile.name);
      setFileSize(uploadedFile.size);

      const entry: HashHistoryEntry = {
        fileName: uploadedFile.name,
        hash,
        timestamp: new Date().toISOString(),
      };

      setHashHistory((previous) => {
        const next = [entry, ...previous];

        saveHashHistoryToStorage(next);

        return next;
      });

      if (window.ethereum) {
        await storeHashOnChain(hash);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to compute SHA-256 hash.");
    } finally {
      setIsHashing(false);
    }
  }

  function getHistoryEntryKey(entry: HashHistoryEntry) {
    return `${entry.timestamp}-${entry.hash}`;
  }

  async function handleVerifySubmit(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!verifyFile) {
      alert("Please upload a PDF to verify.");
      return;
    }

    if (!selectedHistoryKey) {
      alert("Please select a stored hash from history.");
      return;
    }

    const selectedEntry = hashHistory.find(
      (entry) => getHistoryEntryKey(entry) === selectedHistoryKey
    );

    if (!selectedEntry) {
      alert("Selected hash not found in history.");
      return;
    }

    try {
      setIsVerifying(true);
      setVerifyHash(null);
      setVerificationResult(null);

      const buffer = await verifyFile.arrayBuffer();

      const hash = await sha256HexFromBuffer(buffer);

      setVerifyHash(hash);

      setVerificationResult(
        hash === selectedEntry.hash
          ? "verified"
          : "modified"
      );
    } catch (err) {
      console.error(err);
      alert("Failed to verify PDF hash.");
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-[#020617] font-sans text-slate-200 antialiased"
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(14,165,233,.12),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(56,189,248,.08),transparent_50%)]" />

      <div className="relative">
        <header className="sticky top-0 z-50 border-b border-white/5 bg-[#020617]/70 backdrop-blur-xl">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div
                className={`h-9 w-9 rounded-xl bg-gradient-to-br from-[#38bdf8] to-blue-600 ${glowShadow}`}
              />

              <span
                className={`${headingClass} text-lg font-semibold text-white`}
              >
                AuthentiChain
              </span>
            </div>

            <div className="flex items-center gap-6">
              <div className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
                <a href="#upload" className="transition hover:text-white">
                  Upload
                </a>
                <a href="#verify" className="transition hover:text-white">
                  Verify
                </a>
              </div>

              <button
                type="button"
                onClick={connectWallet}
                className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
              >
                {walletAddress
                  ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                  : "Connect Wallet"}
              </button>
            </div>
          </nav>
        </header>

        <section className="mx-auto max-w-6xl px-6 pt-20 pb-20">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[#38bdf8]/20 bg-[#38bdf8]/10 px-3 py-1 text-xs font-medium text-[#7dd3fc]">
                Ethereum-backed document integrity
              </p>

              <h1
                className={`${headingClass} mt-6 text-5xl font-bold leading-tight text-white`}
              >
                Verify invoice integrity.
                <br />
                <span className="bg-gradient-to-r from-[#7dd3fc] to-blue-400 bg-clip-text text-transparent">
                  Without trusting third parties.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-400">
                Upload a PDF invoice, generate a SHA-256
                cryptographic fingerprint, and verify
                document integrity using blockchain storage.
              </p>
            </div>

            <div
              className={`rounded-3xl border border-white/10 bg-[#0f172a]/80 p-8 ${glowShadow}`}
            >
              <h2
                className={`${headingClass} text-xl font-semibold text-white`}
              >
                How AuthentiChain works
              </h2>

              <ol className="mt-8 space-y-5">
                <li className="flex gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#38bdf8]/15 text-[#7dd3fc]">
                    1
                  </div>

                  <div>
                    <p className="font-medium text-white">
                      Upload invoice PDF
                    </p>

                    <p className="text-sm text-slate-400">
                      Exact binary file uploaded locally.
                    </p>
                  </div>
                </li>

                <li className="flex gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#38bdf8]/15 text-[#7dd3fc]">
                    2
                  </div>

                  <div>
                    <p className="font-medium text-white">
                      Generate SHA-256 hash
                    </p>

                    <p className="text-sm text-slate-400">
                      Unique cryptographic fingerprint.
                    </p>
                  </div>
                </li>

                <li className="flex gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#38bdf8]/15 text-[#7dd3fc]">
                    3
                  </div>

                  <div>
                    <p className="font-medium text-white">
                      Store hash on blockchain
                    </p>

                    <p className="text-sm text-slate-400">
                      Immutable timestamp proof.
                    </p>
                  </div>
                </li>

                <li className="flex gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#38bdf8]/15 text-[#7dd3fc]">
                    4
                  </div>

                  <div>
                    <p className="font-medium text-white">
                      Verify integrity later
                    </p>

                    <p className="text-sm text-slate-400">
                      Any modification changes the hash.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </section>

        <section
          id="upload"
          className="border-y border-white/5 bg-[#0f172a]/40 py-20"
        >
          <div className="mx-auto max-w-4xl px-6">
            <h2
              className={`${headingClass} text-center text-4xl font-bold text-white`}
            >
              Upload Invoice PDF
            </h2>

            <p className="mt-4 text-center text-slate-400">
              Generate a SHA-256 cryptographic hash from the exact PDF file
              bytes.
            </p>

            <form
              onSubmit={handleSubmit}
              className="mt-12 rounded-3xl border border-white/10 bg-[#020617]/60 p-8 shadow-xl"
            >
              <PdfDropZone
                label="PDF Invoice"
                inputId="upload-pdf"
                file={uploadedFile}
                onFileSelect={(file) => {
                  setUploadedFile(file);
                  setInvoiceHash(null);
                }}
              />

              {uploadedFile && (
                <div className="mt-6 rounded-2xl border border-white/10 bg-[#0f172a]/70 p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[#7dd3fc]">
                    Uploaded File
                  </h3>

                  <div className="mt-4 space-y-2 text-sm text-slate-300">
                    <p>
                      <span className="text-slate-500">Name:</span>{" "}
                      {uploadedFile.name}
                    </p>
                    <p>
                      <span className="text-slate-500">Type:</span>{" "}
                      {uploadedFile.type || "Unknown"}
                    </p>
                    <p>
                      <span className="text-slate-500">Size:</span>{" "}
                      {(uploadedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isHashing}
                className={`mt-8 w-full rounded-xl bg-gradient-to-r from-[#38bdf8] to-blue-500 py-3 text-sm font-semibold text-[#020617] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 ${glowShadow}`}
              >
                {isHashing ? "Generating..." : "Generate SHA-256 Hash"}
              </button>
            </form>

            <div className="mt-10">
              <div className="rounded-2xl border border-white/10 bg-[#0f172a]/80 p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[#7dd3fc]">
                  SHA-256 Hash
                </h3>

                <p className="mt-2 text-xs text-slate-500">
                  Generated from exact PDF binary bytes.
                </p>

                {isHashing ? (
                  <p className="mt-6 text-slate-400">
                    Computing cryptographic hash...
                  </p>
                ) : invoiceHash ? (
                  <div className="mt-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <p className="break-all rounded-xl border border-[#38bdf8]/10 bg-[#020617]/60 p-4 font-mono text-sm leading-relaxed text-[#bae6fd]">
                        {invoiceHash}
                      </p>

                      <CopyHashButton
                        hash={invoiceHash}
                        copyKey="invoice"
                        copiedHashKey={copiedHashKey}
                        onCopy={copyHashToClipboard}
                      />
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
                        <p className="text-xs uppercase tracking-wider text-slate-500">
                          File Name
                        </p>
                        <p className="mt-2 text-sm text-white">{fileName}</p>
                      </div>

                      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
                        <p className="text-xs uppercase tracking-wider text-slate-500">
                          File Size
                        </p>
                        <p className="mt-2 text-sm text-white">
                          {fileSize
                            ? `${(fileSize / 1024).toFixed(2)} KB`
                            : "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-6 text-slate-500">
                    No hash generated yet.
                  </p>
                )}
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-[#0f172a]/80 p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[#7dd3fc]">
                  Hash History
                </h3>

                <p className="mt-2 text-xs text-slate-500">
                  Previously generated hashes saved in this browser.
                </p>

                {hashHistory.length === 0 ? (
                  <p className="mt-6 text-sm text-slate-500">
                    No hashes saved yet.
                  </p>
                ) : (
                  <ul className="mt-6 space-y-4">
                    {hashHistory.map((entry) => (
                      <li
                        key={getHistoryEntryKey(entry)}
                        className="rounded-xl border border-white/10 bg-[#020617]/60 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">
                              {entry.fileName}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {new Date(entry.timestamp).toLocaleString()}
                            </p>
                          </div>

                          <div className="flex flex-col items-start gap-2 sm:max-w-md sm:items-end">
                            <p className="break-all font-mono text-xs leading-relaxed text-[#bae6fd] sm:text-right">
                              {entry.hash}
                            </p>

                            <CopyHashButton
                              hash={entry.hash}
                              copyKey={getHistoryEntryKey(entry)}
                              copiedHashKey={copiedHashKey}
                              onCopy={copyHashToClipboard}
                            />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>

        <section
          id="verify"
          className="border-t border-white/5 bg-[#0f172a]/40 py-20"
        >
          <div className="mx-auto max-w-4xl px-6">
            <h2
              className={`${headingClass} text-center text-4xl font-bold text-white`}
            >
              Verify Invoice PDF
            </h2>

            <p className="mt-4 text-center text-slate-400">
              Upload a PDF and compare its SHA-256 hash against a previously
              stored hash from your history.
            </p>

            <form
              onSubmit={handleVerifySubmit}
              className="mt-12 rounded-3xl border border-white/10 bg-[#020617]/60 p-8 shadow-xl"
            >
              <div className="space-y-6">
                <PdfDropZone
                  label="PDF to verify"
                  inputId="verify-pdf"
                  file={verifyFile}
                  onFileSelect={(file) => {
                    setVerifyFile(file);
                    setVerifyHash(null);
                    setVerificationResult(null);
                  }}
                />

                {verifyFile && (
                  <div className="rounded-2xl border border-white/10 bg-[#0f172a]/70 p-5">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-[#7dd3fc]">
                      Verification File
                    </h3>

                    <div className="mt-4 space-y-2 text-sm text-slate-300">
                      <p>
                        <span className="text-slate-500">Name:</span>{" "}
                        {verifyFile.name}
                      </p>
                      <p>
                        <span className="text-slate-500">Size:</span>{" "}
                        {(verifyFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="stored-hash"
                    className="text-sm font-medium text-slate-300"
                  >
                    Stored hash from history
                  </label>

                  <select
                    id="stored-hash"
                    value={selectedHistoryKey}
                    onChange={(e) => {
                      setSelectedHistoryKey(e.target.value);
                      setVerifyHash(null);
                      setVerificationResult(null);
                    }}
                    disabled={hashHistory.length === 0}
                    className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">
                      {hashHistory.length === 0
                        ? "No stored hashes available"
                        : "Select a stored hash"}
                    </option>

                    {hashHistory.map((entry) => (
                      <option
                        key={getHistoryEntryKey(entry)}
                        value={getHistoryEntryKey(entry)}
                      >
                        {entry.fileName} —{" "}
                        {new Date(entry.timestamp).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  !verifyFile ||
                  !selectedHistoryKey ||
                  hashHistory.length === 0 ||
                  isVerifying
                }
                className={`mt-8 w-full rounded-xl bg-gradient-to-r from-[#38bdf8] to-blue-500 py-3 text-sm font-semibold text-[#020617] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 ${glowShadow}`}
              >
                {isVerifying ? "Verifying..." : "Verify PDF Integrity"}
              </button>
            </form>

            <div className="mt-10 rounded-2xl border border-white/10 bg-[#0f172a]/80 p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#7dd3fc]">
                Verification Result
              </h3>

              {isVerifying ? (
                <p className="mt-6 text-slate-400">
                  Computing hash and comparing...
                </p>
              ) : verificationResult && verifyHash ? (
                <div className="mt-6 space-y-6">
                  <div
                    className={`rounded-xl border p-5 text-center ${
                      verificationResult === "verified"
                        ? "border-emerald-500/30 bg-emerald-500/10"
                        : "border-rose-500/30 bg-rose-500/10"
                    }`}
                  >
                    <p
                      className={`text-2xl font-bold tracking-wider ${
                        verificationResult === "verified"
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      {verificationResult === "verified"
                        ? "VERIFIED"
                        : "MODIFIED"}
                    </p>

                    <p className="mt-2 text-sm text-slate-400">
                      {verificationResult === "verified"
                        ? "The uploaded PDF matches the selected stored hash."
                        : "The uploaded PDF does not match the selected stored hash."}
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
                      <p className="text-xs uppercase tracking-wider text-slate-500">
                        Uploaded PDF Hash
                      </p>
                      <p className="mt-2 break-all font-mono text-xs leading-relaxed text-[#bae6fd]">
                        {verifyHash}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
                      <p className="text-xs uppercase tracking-wider text-slate-500">
                        Stored Hash
                      </p>
                      <p className="mt-2 break-all font-mono text-xs leading-relaxed text-[#bae6fd]">
                        {
                          hashHistory.find(
                            (entry) =>
                              getHistoryEntryKey(entry) === selectedHistoryKey
                          )?.hash
                        }
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-6 text-slate-500">
                  Upload a PDF and select a stored hash to verify.
                </p>
              )}
            </div>
          </div>
        </section>

        <footer className="border-t border-white/5 bg-[#020617] py-10">
          <div className="mx-auto max-w-6xl px-6 text-center text-sm text-slate-500">
            © {new Date().getFullYear()} AuthentiChain — Blockchain-based
            document integrity verification
          </div>
        </footer>
      </div>
    </div>
  );
}
