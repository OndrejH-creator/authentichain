type Props = {
  txHash: string;
};

export default function TransactionSuccessCard({
  txHash,
}: Props) {
  const txUrl = `https://sepolia.etherscan.io/tx/${txHash}`;

  return (
    <div className="mt-6 rounded-3xl border border-[#38bdf8]/20 bg-[#38bdf8]/10 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#38bdf8]/20 text-2xl">
          🚀
        </div>

        <div>
          <h3 className="text-xl font-bold text-[#7dd3fc]">
            Stored on Blockchain
          </h3>

          <p className="mt-1 text-sm text-slate-300">
            Your hash was successfully stored on Sepolia.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs uppercase tracking-wider text-slate-500">
          Transaction Hash
        </p>

        <p className="mt-2 break-all font-mono text-sm text-slate-200">
          {txHash}
        </p>
      </div>

      <a
        href={txUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-flex rounded-xl bg-[#38bdf8] px-4 py-2 text-sm font-semibold text-[#020617] transition hover:brightness-110"
      >
        View on Etherscan
      </a>
    </div>
  );
}
