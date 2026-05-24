"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ethers } from "ethers";
import jsPDF from "jspdf";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./lib/contract";

type HashHistoryEntry = {
  fileName: string;
  hash: string;
  timestamp: number;
  txHash?: string;
};

const currencies = [
  "USD",
  "EUR",
  "CZK",
  "GBP",
  "JPY",
  "CNY",
  "PLN",
  "HUF",
  "CHF",
  "SEK",
  "NOK",
  "DKK",
  "CAD",
  "AUD",
  "NZD",
  "SGD",
  "HKD",
  "AED",
  "INR",
  "BTC",
  "ETH",
];

export default function HomePage() {
  const [mode, setMode] = useState<"upload" | "generate">("upload");
  
  

  const [walletAddress, setWalletAddress] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [generatedHash, setGeneratedHash] = useState("");
  const [txHash, setTxHash] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [hashHistory, setHashHistory] = useState<HashHistoryEntry[]>([]);

  const [invoiceData, setInvoiceData] = useState({
    sellerCompany: "",
    sellerAddress: "",
    sellerVat: "",
    sellerEmail: "",

    clientName: "",
    clientAddress: "",
    clientEmail: "",

    invoiceNumber: "",
    issueDate: "",
    dueDate: "",

    description: "",

    amount: "",
    tax: "21",
    currency: "EUR",
  });

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cyan-400";

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

  const processPDF = async (file: File) => {
    if (!(window as any).ethereum) {
      alert("Please install MetaMask.");
      return;
    }

    setIsGenerating(true);
    setShowSuccess(false);
    setErrorMessage("");
    setVerificationResult(null);

    try {
      const buffer = await file.arrayBuffer();

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
      
      setShowSuccess(true);

setTimeout(() => {
  setShowSuccess(false);
}, 3000);
      
      setShowSuccess(true);

	setTimeout(() => {
  	setShowSuccess(false);
	}, 3000);
      
      

      const newEntry: HashHistoryEntry = {
        fileName: file.name,
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
    } catch (err: any) {
  console.error(err);

  const errorText =
    err?.reason ||
    err?.shortMessage ||
    err?.message ||
    "";

  if (errorText.includes("Hash already exists")) {
    setErrorMessage(
      "❌ This document hash already exists on the blockchain."
    );
  } else {
    setErrorMessage(
      "❌ Blockchain transaction failed."
    );
  }

  setVerificationResult({
    success: false,
    message:
      "Transaction failed or hash already exists.",
  });
} finally {
      setIsGenerating(false);
    }
  };

  const generateHash = async () => {
    if (!selectedFile) return;
    await processPDF(selectedFile);
  };

  const generateInvoicePDF = async () => {
    try {
      const doc = new jsPDF();

      doc.setFontSize(26);
      doc.text("AUTHENTICHAIN INVOICE", 20, 20);

      doc.setFontSize(12);

      doc.text("Seller", 20, 40);
      doc.text(invoiceData.sellerCompany, 20, 50);
      doc.text(invoiceData.sellerAddress, 20, 60);
      doc.text(invoiceData.sellerVat, 20, 70);
      doc.text(invoiceData.sellerEmail, 20, 80);

      doc.text("Client", 120, 40);
      doc.text(invoiceData.clientName, 120, 50);
      doc.text(invoiceData.clientAddress, 120, 60);
      doc.text(invoiceData.clientEmail, 120, 70);

  doc.text(
  "Invoice #: " + invoiceData.invoiceNumber,
  20,
  110
);

doc.text(
  "Issue Date: " + invoiceData.issueDate,
  20,
  120
);

doc.text(
  "Due Date: " + invoiceData.dueDate,
  20,
  130
);

      doc.text("Description", 20, 160);
      doc.text(invoiceData.description, 20, 170);

      const amount = Number(invoiceData.amount || 0);
      const tax = Number(invoiceData.tax || 0);
      const total = amount + amount * (tax / 100);

      doc.text(
  "Amount: " +
    amount.toFixed(2) +
    " " +
    invoiceData.currency,
  20,
  210
);

doc.text(
  "Tax: " + tax + "%",
  20,
  220
);

doc.text(
  "Total: " +
    total.toFixed(2) +
    " " +
    invoiceData.currency,
  20,
  230
);

      const pdfBlob = doc.output("blob");

      const file = new File([pdfBlob], "invoice.pdf", {
        type: "application/pdf",
      });

      doc.save("invoice.pdf");

      await processPDF(file);
    } catch (err: any) {
  console.error(err);

  const errorText =
    err?.reason ||
    err?.shortMessage ||
    err?.message ||
    "";

  if (errorText.includes("Hash already exists")) {
    setErrorMessage(
      "❌ This document hash already exists on the blockchain."
    );
  } else {
    setErrorMessage("❌ Transaction failed.");
  }
}
finally {
  setIsGenerating(false)
  };
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
  "Integrity VERIFIED.\n\n" +
  "Hash exists on blockchain.\n\n" +
  "Stored: " +
  readableDate +
  "\n" +
  "Uploader: " +
  uploader,
        });
      } else {
        setVerificationResult({
          success: false,
          message:
            "Hash not found on blockchain. Document authenticity cannot be verified.",
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
          <Image
            src="/logo.png"
            alt="AuthentiChain Logo"
            width={260}
            height={80}
            style={{ width: "auto", height: "auto" }}
            priority
            className="object-contain"
          />

          <div className="flex items-center gap-6">
            <div className="hidden items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 md:flex">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />

              <span className="text-sm font-medium text-cyan-200">
                Sepolia Testnet
              </span>
            </div>

            <a href="#upload" className="text-slate-300 hover:text-white">
              Upload
            </a>

            <a href="#verify" className="text-slate-300 hover:text-white">
              Verify
            </a>

            <button
              onClick={connectWallet}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-3 font-semibold text-black transition hover:scale-105"
            >
              {walletAddress
  ? walletAddress.slice(0, 6) +
    "..." +
    walletAddress.slice(-4)
  : "Connect Wallet"}
            </button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-16 px-6 py-10 lg:grid-cols-2">
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
              Generate invoices, upload PDFs, and anchor authenticity proofs on Ethereum.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 backdrop-blur-xl">
            <h3 className="mb-8 text-3xl font-bold">
              How AuthentiChain works
            </h3>

            <div className="space-y-8">
              {[
                {
                  title: "Upload or generate PDF",
                  desc: "Exact binary document processed locally.",
                },
                {
                  title: "Generate SHA-256 hash",
                  desc: "Unique cryptographic fingerprint.",
                },
                {
                  title: "Anchor proof on Ethereum",
                  desc: "Immutable timestamp verification.",
                },
                {
                  title: "Verify authenticity anytime",
                  desc: "Any modification changes the fingerprint.",
                },
              ].map((step, index) => (
                <div key={index} className="flex items-start gap-5">
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

      <section id="upload" className="mx-auto max-w-5xl px-6 py-24">
        <div className="mb-10 flex flex-wrap gap-4">
          <button
  onClick={() => setMode("upload")}
  className={
    "rounded-xl px-5 py-3 font-medium transition-all " +
    (mode === "upload"
      ? "bg-cyan-500 text-black"
      : "bg-white/5 text-slate-300")
  }
>
  Upload PDF
</button>

        <button
  onClick={() => setMode("generate")}
  className={
    "rounded-xl px-5 py-3 font-medium transition-all " +
    (mode === "generate"
      ? "bg-cyan-500 text-black"
      : "bg-white/5 text-slate-300")
  }
>
  Generate Invoice
</button>
        </div>

        {mode === "upload" ? (
          <div>
            <h2 className="mb-3 text-center text-5xl font-bold">
              Upload PDF
            </h2>

            <p className="mb-14 text-center text-slate-400">
              Generate a SHA-256 cryptographic fingerprint from an existing PDF.
            </p>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-10 backdrop-blur-xl">
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
                className="mt-10 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-8 py-5 text-lg font-bold text-black transition hover:scale-[1.01] disabled:opacity-50"
              >
                {isGenerating
                  ? "Processing Blockchain Transaction..."
                  : "Generate SHA-256 Hash"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="mb-3 text-center text-5xl font-bold">
              Generate Invoice
            </h2>

            <p className="mb-14 text-center text-slate-400">
              Create a PDF invoice and anchor its authenticity on Ethereum automatically.
            </p>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-10 backdrop-blur-xl">
              <div className="grid gap-6 md:grid-cols-2">
                <input
                  placeholder="Seller company"
                  value={invoiceData.sellerCompany}
                  onChange={(e) =>
                    setInvoiceData({
                      ...invoiceData,
                      sellerCompany: e.target.value,
                    })
                  }
                  className={inputClass}
                />

                <input
                  placeholder="Seller email"
                  value={invoiceData.sellerEmail}
                  onChange={(e) =>
                    setInvoiceData({
                      ...invoiceData,
                      sellerEmail: e.target.value,
                    })
                  }
                  className={inputClass}
                />

                <input
                  placeholder="Seller address"
                  value={invoiceData.sellerAddress}
                  onChange={(e) =>
                    setInvoiceData({
                      ...invoiceData,
                      sellerAddress: e.target.value,
                    })
                  }
                  className={inputClass}
                />

                <input
                  placeholder="VAT ID"
                  value={invoiceData.sellerVat}
                  onChange={(e) =>
                    setInvoiceData({
                      ...invoiceData,
                      sellerVat: e.target.value,
                    })
                  }
                  className={inputClass}
                />

                <input
                  placeholder="Client name"
                  value={invoiceData.clientName}
                  onChange={(e) =>
                    setInvoiceData({
                      ...invoiceData,
                      clientName: e.target.value,
                    })
                  }
                  className={inputClass}
                />

                <input
                  placeholder="Client email"
                  value={invoiceData.clientEmail}
                  onChange={(e) =>
                    setInvoiceData({
                      ...invoiceData,
                      clientEmail: e.target.value,
                    })
                  }
                  className={inputClass}
                />

                <input
                  placeholder="Client address"
                  value={invoiceData.clientAddress}
                  onChange={(e) =>
                    setInvoiceData({
                      ...invoiceData,
                      clientAddress: e.target.value,
                    })
                  }
                  className={inputClass}
                />

                <input
                  placeholder="Invoice number"
                  value={invoiceData.invoiceNumber}
                  onChange={(e) =>
                    setInvoiceData({
                      ...invoiceData,
                      invoiceNumber: e.target.value,
                    })
                  }
                  className={inputClass}
                />
<div>
  <label className="mb-2 block text-sm text-slate-400">
    Issue Date
  </label>

  <input
    type="date"
    value={invoiceData.issueDate}
    onChange={(e) =>
      setInvoiceData({
        ...invoiceData,
        issueDate: e.target.value,
      })
    }
    className={inputClass}
  />
</div>

<div>
  <label className="mb-2 block text-sm text-slate-400">
    Due Date
  </label>

  <input
    type="date"
    value={invoiceData.dueDate}
    onChange={(e) =>
      setInvoiceData({
        ...invoiceData,
        dueDate: e.target.value,
      })
    }
    className={inputClass}
  />
</div>

<input
  type="number"
  placeholder="Amount"
  value={invoiceData.amount}
  onChange={(e) =>
    setInvoiceData({
      ...invoiceData,
      amount: e.target.value,
    })
  }
  className={inputClass}
/>

<select
  value={invoiceData.currency}
  onChange={(e) =>
    setInvoiceData({
      ...invoiceData,
      currency: e.target.value,
    })
  }
  
  className={`${inputClass} bg-[#111827] text-white`}
>
  <option value="EUR" className="bg-[#111827] text-white">
  EUR
</option>

<option value="USD" className="bg-[#111827] text-white">
  USD
</option>

<option value="CZK" className="bg-[#111827] text-white">
  CZK
</option>

<option value="GBP" className="bg-[#111827] text-white">
  GBP
</option>

<option value="JPY" className="bg-[#111827] text-white">
  JPY
</option>

<option value="CNY" className="bg-[#111827] text-white">
  CNY
</option>
</select>
                

              </div>

              <textarea
                placeholder="Invoice description"
                value={invoiceData.description}
                onChange={(e) =>
                  setInvoiceData({
                    ...invoiceData,
                    description: e.target.value,
                  })
                }
                className="mt-6 h-40 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
              />

                            <button
                onClick={generateInvoicePDF}
                disabled={isGenerating}
                className="mt-10 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-8 py-5 text-lg font-bold text-black transition hover:scale-[1.01] disabled:opacity-50"
              >
               {showSuccess
  ? "✅ Success!"
  : isGenerating
  ? "Generating & Storing on Blockchain..."
  : "Generate Invoice & Store on Blockchain"}
  </button>
  
 
 </div>
 </div>
 )}
              
  {errorMessage && (
  <p className="mt-4 text-center text-red-400 font-medium">
    {errorMessage}
  </p>
)}        
        

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
  href={"https://sepolia.etherscan.io/tx/" + txHash}
  target="_blank"
  rel="noreferrer"
  className="inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200"
>
  View transaction on Etherscan →
</a>
          
             </div>
             )}

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
            className="mt-10 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-8 py-5 text-lg font-bold text-black transition hover:scale-[1.01] disabled:opacity-50"
          >
            Verify PDF Integrity
          </button>

          {verificationResult && (
            <div
              className={
  "mt-10 rounded-2xl border p-8 " +
  (verificationResult.success
    ? "border-green-500/20 bg-green-500/10"
    : "border-red-500/20 bg-red-500/10")
}
            >
              <h3
                className={
  "mb-4 text-lg font-bold uppercase tracking-wider " +
  (verificationResult.success
    ? "text-green-300"
    : "text-red-300")
}
              >
                Verification Result
              </h3>

              <p
                className={
  "whitespace-pre-line text-lg " +
  (verificationResult.success
    ? "text-green-200"
    : "text-red-200")
}
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
