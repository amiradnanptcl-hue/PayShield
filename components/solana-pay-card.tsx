"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  AlertTriangle,
  Check,
  Copy,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Solana Pay devnet payment block.
 *
 * Builds a spec-compliant `solana:` URL per https://docs.solanapay.com/spec
 * (recipient, amount, spl-token, label, message), renders the QR client-side
 * via `qrcode.react` so we avoid the api.qrserver.com round-trip and the
 * margin/error-correction quirks third-party services produce. Phantom and
 * Solflare cameras parse this output reliably.
 *
 * On desktop the `solana:` URL has no registered handler (Phantom's
 * extension does not claim the protocol), so we surface a "Copy URL"
 * fallback instead of the silent-fail "Open in Wallet" button. On mobile
 * the wallet link works as expected.
 *
 * The Devnet warning above the QR catches the most common failure mode:
 * users scan with Phantom on mainnet and the SPL mint cannot be resolved.
 */

type Props = {
  recipient: string;
  splTokenMint: string;
  amount?: string;
  label?: string;
  message?: string;
};

const GRADIENT = "linear-gradient(135deg, #9945FF 0%, #14F195 100%)";

function buildSolanaPayUrl({
  recipient,
  splTokenMint,
  amount = "1",
  label = "PayShield",
  message = "Founding customer",
}: Props) {
  const params = new URLSearchParams();
  params.set("amount", amount);
  params.set("spl-token", splTokenMint);
  params.set("label", label);
  params.set("message", message);
  // URLSearchParams.toString uses + for spaces; Solana Pay parsers accept
  // either + or %20, but %20 is the spec-canonical form, so we normalise.
  const qs = params.toString().replace(/\+/g, "%20");
  return `solana:${recipient}?${qs}`;
}

export function SolanaPayCard(props: Props) {
  const url = useMemo(() => buildSolanaPayUrl(props), [props]);
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Browser detection must run after hydration because `navigator` is
  // unavailable on the server. Reading it inside useEffect and committing
  // the result via setState is the canonical pattern for SSR-safe browser
  // capability sniffing — the linter warning is a false positive here.
  useEffect(() => {
    // Touch + UA heuristic — covers iOS Safari, Android Chrome, and the
    // common Phantom in-app browsers, while keeping desktops on the
    // Copy-URL flow.
    const ua = navigator.userAgent || "";
    const touch =
      typeof navigator.maxTouchPoints === "number" &&
      navigator.maxTouchPoints > 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobile(touch || /iPhone|iPad|iPod|Android/i.test(ua));
  }, []);

  async function handleCopy() {
    try {
      // Copy the bare wallet address — that's what senders actually paste
      // into their wallet's Send form. The full solana: URL is a deep link
      // that only mobile wallet apps with a registered protocol handler
      // can do anything useful with, so it would be confusing as a
      // clipboard target for desktop users.
      await navigator.clipboard.writeText(props.recipient);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard API unavailable — silent */
    }
  }

  const shortAddr = `${props.recipient.slice(0, 6)}…${props.recipient.slice(-4)}`;

  return (
    <div
      className="brut-card-sm relative overflow-hidden bg-paper text-ink outline outline-4 outline-risk"
      style={{ boxShadow: "8px 8px 0 var(--risk)" }}
    >
      {/* Powered-by Solana hero band — black band with the official logo,
          full width across the card. Designed to read at a glance from
          the back of the room so the Solana booth/panel notice instantly
          that the integration uses the official Solana Pay rail.
          Mobile: stacks the brand block above the Devnet badge so neither
          element gets crushed below 380px viewports. */}
      <div className="relative border-b-2 border-ink bg-ink px-4 py-4 sm:px-5">
        {/* Subtle Solana brand-gradient hairline at the bottom — anchors
            the band to the rest of the card without screaming. */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px]"
          style={{ background: GRADIENT }}
          aria-hidden
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-3.5">
            <Image
              src="/solana-logo.jpg"
              alt="Solana"
              width={1350}
              height={1011}
              className="h-11 w-auto shrink-0 object-contain sm:h-14"
              sizes="96px"
            />
            <div className="min-w-0">
              <div className="font-mono text-[9px] font-bold uppercase leading-none tracking-[0.22em] text-wash/55 sm:text-[10px]">
                Powered by
              </div>
              <div className="mt-1.5 whitespace-nowrap font-display text-base font-extrabold leading-none text-wash sm:text-lg">
                Solana Pay
              </div>
            </div>
          </div>
          <span
            className="inline-flex shrink-0 items-center gap-1.5 self-start whitespace-nowrap px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-paper sm:self-auto"
            style={{ background: GRADIENT }}
          >
            <ShieldCheck className="size-3" aria-hidden />
            Devnet demo
          </span>
        </div>
      </div>

      {/* Body content — padded inset away from the hero band. */}
      <div className="p-6">
        <h3 className="font-display text-2xl font-bold leading-tight">
          Founding customer · 1 USDC
        </h3>
        <p className="mt-1 text-sm text-ink-3">
          On-chain alternative to the card subscription. Same founding rate,
          same lifetime lock-in.
        </p>

      {/* Devnet warning — the single biggest failure mode for first-time
          Solana Pay scanners is forgetting to switch the wallet network. */}
      <div className="mt-4 border-2 border-warn/60 bg-warn/15 p-3">
        <div className="flex items-start gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink">
          <AlertTriangle className="mt-[1px] size-3.5 shrink-0 text-warn" aria-hidden />
          <div>
            <span className="font-bold">Switch wallet to Devnet first</span>
            <ol className="mt-1.5 space-y-0.5 normal-case tracking-normal text-ink-2">
              <li>1. Phantom → Settings → Developer Settings</li>
              <li>2. Enable Testnet Mode → Solana Devnet</li>
              <li>3. Then scan the QR below</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-3 border-y-2 border-line bg-wash-2 p-4">
        <div className="border-2 border-ink bg-paper p-2">
          <QRCodeSVG
            value={url}
            size={200}
            level="M"
            marginSize={2}
            bgColor="#FFFFFF"
            fgColor="#0A0A0A"
            aria-label="Scan to pay 1 USDC on Solana devnet"
          />
        </div>
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
          <Smartphone className="mr-1 inline-block size-3 align-[-1px]" aria-hidden />
          Scan with Phantom, Solflare,
          <br />
          or any Solana wallet on mobile
        </p>
      </div>

      {/* Dual CTA — open-in-wallet for mobile, copy URL for desktop.
          Both buttons always render so users on hybrid devices have an
          escape hatch if the protocol intent fails. */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <a
          href={url}
          className={cn(
            "inline-flex items-center justify-center gap-2 px-3 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] transition",
            isMobile
              ? "bg-ink text-paper hover:bg-risk"
              : "border-2 border-ink bg-paper text-ink hover:bg-ink hover:text-paper",
          )}
          aria-label={
            isMobile
              ? "Open Solana wallet"
              : "Try opening Solana wallet (mobile only)"
          }
        >
          <Wallet className="size-3.5" aria-hidden />
          Open in wallet
        </a>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "inline-flex items-center justify-center gap-2 px-3 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] transition",
            !isMobile
              ? "bg-ink text-paper hover:bg-risk"
              : "border-2 border-ink bg-paper text-ink hover:bg-ink hover:text-paper",
          )}
          aria-live="polite"
        >
          {copied ? (
            <>
              <Check className="size-3.5" aria-hidden />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3.5" aria-hidden />
              Copy address
            </>
          )}
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-dashed border-ink-3/40 pt-3 font-mono text-[10px] tracking-wide text-ink-3">
        <button
          type="button"
          onClick={handleCopy}
          className="group inline-flex items-center gap-1.5 truncate normal-case transition hover:text-ink"
          title={`Copy ${props.recipient}`}
        >
          <span className="truncate">{shortAddr}</span>
          {copied ? (
            <Check className="size-3 text-good" aria-hidden />
          ) : (
            <Copy
              className="size-3 opacity-60 transition group-hover:opacity-100"
              aria-hidden
            />
          )}
        </button>
        <span className="shrink-0 uppercase tracking-[0.16em]">
          Solana Devnet
        </span>
      </div>
      </div>
    </div>
  );
}
