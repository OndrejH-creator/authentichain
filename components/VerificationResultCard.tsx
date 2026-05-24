type Props = {
  verified: boolean;
  hash: string;
  timestamp?: string;
  uploader?: string;
};

export default function VerificationResultCard({
  verified,
  hash,
  timestamp,
  uploader,
}: Props) {
  return (
    <div
      className={`mt-6 rounded-3xl border p-6 transition ${
        verified
          ? "border-emerald-400/30 bg-emerald-400/10"
          : "border-rose-400/30 bg-rose-400/10"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${
            verified
              ? "bg-emerald-400/20"
              : "bg-rose-400/20"
          }`}
        >
          {verified ? "✅" : "⚠️"}
        </div>

        <div>
          <h3
            className={`text-xl font-bold ${
              verified
                ? "text-emerald-300"
                : "text-rose-300"
            }`}
          >
            {verified
              ? "Document Verified"
              : "Document Modified"}
          </h3>

          <p className="mt-1 text-sm text-slate-300">
            {verified
              ? "Hash matches blockchain record."
              : "Hash mismatch detected."}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">
            SHA-256 Hash
          </p>

          <p className="mt-1 break-all font-mono text-sm text-slate-200">
            {hash}
          </p>
        </div>

        {timestamp ? (
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Timestamp
            </p>

            <p className="mt-1 text-sm text-slate-300">
              {timestamp}
            </p>
          </div>
        ) : null}

        {uploader ? (
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Wallet
            </p>

            <p className="mt-1 font-mono text-sm text-slate-300">
              {uploader}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
