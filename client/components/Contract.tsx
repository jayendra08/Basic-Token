"use client";

import { useState, useCallback, useEffect } from "react";
import {
  createToken,
  getAllTokens,
  getToken,
  getBalance,
  transferTokens,
  mintTokens,
  initializeContract,
  getTokenCount,
  CONTRACT_ADDRESS,
} from "@/hooks/contract";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Spotlight } from "@/components/ui/spotlight";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────

interface TokenMeta {
  id: number;
  name: string;
  symbol: string;
  decimals: number;
  creator: string;
  total_supply: string;
}

// ── Icons ────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function TokenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 18V6" />
    </svg>
  );
}

function TransferIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3v6h-6" />
      <path d="M7 21l6-6" />
      <path d="M7 3v6h6" />
      <path d="M17 21l-6-6" />
    </svg>
  );
}

function MintIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// ── Styled Input ─────────────────────────────────────────────

function Input({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-medium uppercase tracking-wider text-white/30">
        {label}
      </label>
      <div className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-px transition-all focus-within:border-[#7c6cf0]/30 focus-within:shadow-[0_0_20px_rgba(124,108,240,0.08)]">
        <input
          {...props}
          className="w-full rounded-[11px] bg-transparent px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/15 outline-none"
        />
      </div>
    </div>
  );
}

// ── Method Signature ─────────────────────────────────────────

function MethodSignature({
  name,
  params,
  returns,
  color,
}: {
  name: string;
  params: string;
  returns?: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 font-mono text-sm">
      <span style={{ color }} className="font-semibold">fn</span>
      <span className="text-white/70">{name}</span>
      <span className="text-white/20 text-xs">{params}</span>
      {returns && (
        <span className="ml-auto text-white/15 text-[10px]">{returns}</span>
      )}
    </div>
  );
}

// ── Token Card ───────────────────────────────────────────────

function TokenCard({
  token,
  walletAddress,
  onRefresh,
}: {
  token: TokenMeta;
  walletAddress: string | null;
  onRefresh: () => void;
}) {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isCreator = walletAddress && token.creator === walletAddress;

  const fetchBalance = useCallback(async () => {
    if (!walletAddress) {
      setBalance("0");
      setLoading(false);
      return;
    }
    try {
      const bal = await getBalance(walletAddress, token.id, walletAddress);
      setBalance(bal ? String(bal) : "0");
    } catch {
      setBalance("0");
    } finally {
      setLoading(false);
    }
  }, [walletAddress, token.id]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const formatSupply = (supply: string) => {
    try {
      const num = BigInt(supply);
      const formatted = (Number(num) / Math.pow(10, token.decimals)).toFixed(2);
      return formatted;
    } catch {
      return supply;
    }
  };

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden animate-fade-in-up">
      <div className="border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold text-white/90">{token.symbol}</span>
          <Badge variant={isCreator ? "success" : "info"} className="text-[9px]">
            #{token.id}
          </Badge>
        </div>
        <span className="text-[10px] text-white/25 font-mono">{token.decimals} decimals</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/35">Name</span>
          <span className="font-mono text-sm text-white/80">{token.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/35">Total Supply</span>
          <span className="font-mono text-sm text-white/80">{formatSupply(token.total_supply)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/35">Creator</span>
          <span className="font-mono text-sm text-white/50">{truncate(token.creator)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-white/[0.04] pt-3">
          <span className="text-xs text-white/35">Your Balance</span>
          <span className="font-mono text-sm text-white/90 font-semibold">
            {loading ? "..." : formatSupply(balance || "0")}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

type Tab = "create" | "tokens" | "transfer" | "mint" | "browse";

interface ContractUIProps {
  walletAddress: string | null;
  onConnect: () => void;
  isConnecting: boolean;
}

export default function ContractUI({ walletAddress, onConnect, isConnecting }: ContractUIProps) {
  const [activeTab, setActiveTab] = useState<Tab>("create");
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // Create token state
  const [createName, setCreateName] = useState("");
  const [createSymbol, setCreateSymbol] = useState("");
  const [createDecimals, setCreateDecimals] = useState("7");
  const [createSupply, setCreateSupply] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createdTokenId, setCreatedTokenId] = useState<number>(0);

  // Transfer state
  const [transferTo, setTransferTo] = useState("");
  const [transferTokenId, setTransferTokenId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  // Mint state
  const [mintTo, setMintTo] = useState("");
  const [mintTokenId, setMintTokenId] = useState("");
  const [mintAmount, setMintAmount] = useState("");
  const [isMinting, setIsMinting] = useState(false);

  // Browse state
  const [allTokens, setAllTokens] = useState<TokenMeta[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenMeta | null>(null);

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const handleCreateToken = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!createName.trim() || !createSymbol.trim()) return setError("Enter token name and symbol");
    const decimals = parseInt(createDecimals) || 7;
    const supply = BigInt(createSupply || "0");
    
    setError(null);
    setIsCreating(true);
    setTxStatus("Awaiting signature...");
    try {
      const result = await createToken(
        walletAddress,
        createName.trim(),
        createSymbol.trim().toUpperCase(),
        decimals,
        supply
      );
      
      // Extract token ID from result
      const hash = (result as any).hash;
      setTxStatus("Token created on-chain!");
      setCreatedTokenId(tokenId => tokenId + 1);
      setCreateName("");
      setCreateSymbol("");
      setCreateSupply("");
      setTimeout(() => setTxStatus(null), 5000);
      
      // Refresh browse tab
      if (activeTab === "browse") {
        loadAllTokens();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsCreating(false);
    }
  }, [walletAddress, createName, createSymbol, createDecimals, createSupply, activeTab]);

  const handleTransfer = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!transferTo.trim() || !transferTokenId || !transferAmount) return setError("Fill all fields");
    
    setError(null);
    setIsTransferring(true);
    setTxStatus("Awaiting signature...");
    try {
      await transferTokens(
        walletAddress,
        walletAddress,
        transferTo.trim(),
        parseInt(transferTokenId),
        BigInt(transferAmount)
      );
      setTxStatus("Transfer successful!");
      setTransferTo("");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsTransferring(false);
    }
  }, [walletAddress, transferTo, transferTokenId, transferAmount]);

  const handleMint = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!mintTo.trim() || !mintTokenId || !mintAmount) return setError("Fill all fields");
    
    setError(null);
    setIsMinting(true);
    setTxStatus("Awaiting signature...");
    try {
      await mintTokens(
        walletAddress,
        mintTo.trim(),
        parseInt(mintTokenId),
        BigInt(mintAmount)
      );
      setTxStatus("Minting successful!");
      setMintTo("");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsMinting(false);
    }
  }, [walletAddress, mintTo, mintTokenId, mintAmount]);

  const loadAllTokens = useCallback(async () => {
    setIsLoadingTokens(true);
    try {
      const tokenIds = await getAllTokens(walletAddress || undefined) as number[];
      if (tokenIds && Array.isArray(tokenIds)) {
        const tokens = await Promise.all(
          tokenIds.map(async (id: number) => {
            const meta = await getToken(id, walletAddress || undefined);
            return meta as unknown as TokenMeta;
          })
        );
        setAllTokens(tokens);
        if (tokens.length > 0 && !selectedToken) {
          setSelectedToken(tokens[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load tokens:", err);
    } finally {
      setIsLoadingTokens(false);
    }
  }, [walletAddress, selectedToken]);

  useEffect(() => {
    if (activeTab === "browse" || activeTab === "tokens") {
      loadAllTokens();
    }
  }, [activeTab, loadAllTokens]);

  // Check if contract is initialized
  useEffect(() => {
    (async () => {
      try {
        const count = await getTokenCount();
        setIsInitialized(true);
      } catch {
        setIsInitialized(false);
      }
    })();
  }, []);

  const handleInitialize = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    setError(null);
    setIsInitializing(true);
    setTxStatus("Initializing contract...");
    try {
      await initializeContract(walletAddress);
      setTxStatus("Contract initialized!");
      setIsInitialized(true);
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      // Already initialized is OK
      if (err instanceof Error && err.message.includes("already initialized")) {
        setTxStatus("Already initialized!");
        setIsInitialized(true);
      } else {
        setError(err instanceof Error ? err.message : "Init failed");
      }
      setTxStatus(null);
    } finally {
      setIsInitializing(false);
    }
  }, [walletAddress]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "create", label: "Create", icon: <TokenIcon />, color: "#7c6cf0" },
    { key: "browse", label: "Browse", icon: <GlobeIcon />, color: "#4fc3f7" },
    { key: "transfer", label: "Transfer", icon: <TransferIcon />, color: "#fbbf24" },
    { key: "mint", label: "Mint", icon: <MintIcon />, color: "#34d399" },
  ];

  return (
    <div className="w-full max-w-2xl animate-fade-in-up-delayed">
      {/* Toasts */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#f87171]/15 bg-[#f87171]/[0.05] px-4 py-3 backdrop-blur-sm animate-slide-down">
          <span className="mt-0.5 text-[#f87171]"><AlertIcon /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#f87171]/90">Error</p>
            <p className="text-xs text-[#f87171]/50 mt-0.5 break-all">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="shrink-0 text-[#f87171]/30 hover:text-[#f87171]/70 text-lg leading-none">&times;</button>
        </div>
      )}

      {txStatus && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#34d399]/15 bg-[#34d399]/[0.05] px-4 py-3 backdrop-blur-sm shadow-[0_0_30px_rgba(52,211,153,0.05)] animate-slide-down">
          <span className="text-[#34d399]">
            {txStatus.includes("success") || txStatus.includes("on-chain") ? <CheckIcon /> : <SpinnerIcon />}
          </span>
          <span className="text-sm text-[#34d399]/90">{txStatus}</span>
        </div>
      )}

      {/* Main Card */}
      <Spotlight className="rounded-2xl">
        <AnimatedCard className="p-0" containerClassName="rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#7c6cf0]/20 to-[#4fc3f7]/20 border border-white/[0.06]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#7c6cf0]">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                  <path d="M12 18V6" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/90">Token Factory</h3>
                <p className="text-[10px] text-white/25 font-mono mt-0.5">{truncate(CONTRACT_ADDRESS)}</p>
              </div>
            </div>
            <Badge variant="info" className="text-[10px]">Permissionless</Badge>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/[0.06] px-2 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setError(null); }}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all whitespace-nowrap",
                  activeTab === t.key ? "text-white/90" : "text-white/35 hover:text-white/55"
                )}
              >
                <span style={activeTab === t.key ? { color: t.color } : undefined}>{t.icon}</span>
                {t.label}
                {activeTab === t.key && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full transition-all"
                    style={{ background: `linear-gradient(to right, ${t.color}, ${t.color}66)` }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Create Token */}
            {activeTab === "create" && (
              <div className="space-y-5">
                {!isInitialized && (
                  <div className="flex items-center justify-between rounded-xl border border-[#fbbf24]/20 bg-[#fbbf24]/[0.05] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[#fbbf24]">⚠</span>
                      <span className="text-sm text-[#fbbf24]/80">Contract needs initialization</span>
                    </div>
                    {walletAddress ? (
                      <button
                        onClick={handleInitialize}
                        disabled={isInitializing}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#fbbf24]/20 text-[#fbbf24] hover:bg-[#fbbf24]/30 transition-colors"
                      >
                        {isInitializing ? "Initializing..." : "Initialize"}
                      </button>
                    ) : (
                      <span className="text-xs text-white/40">Connect wallet</span>
                    )}
                  </div>
                )}
                <MethodSignature 
                  name="create_token" 
                  params="(creator, name, symbol, decimals, supply)" 
                  returns="-> token_id" 
                  color="#7c6cf0" 
                />
                <p className="text-xs text-white/40 -mt-2">
                  Anyone can create a token. You become the token admin.
                </p>
                <Input label="Token Name" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="e.g. My Awesome Token" />
                <Input label="Symbol" value={createSymbol} onChange={(e) => setCreateSymbol(e.target.value)} placeholder="e.g. MAT" />
                <Input label="Decimals" type="number" value={createDecimals} onChange={(e) => setCreateDecimals(e.target.value)} placeholder="7" />
                <Input label="Initial Supply (no decimals)" type="number" value={createSupply} onChange={(e) => setCreateSupply(e.target.value)} placeholder="1000000" />
                
                {walletAddress && isInitialized ? (
                  <ShimmerButton onClick={handleCreateToken} disabled={isCreating} shimmerColor="#7c6cf0" className="w-full">
                    {isCreating ? <><SpinnerIcon /> Creating...</> : <><TokenIcon /> Create Token</>}
                  </ShimmerButton>
                ) : walletAddress ? (
                  <button
                    onClick={handleInitialize}
                    disabled={isInitializing || isInitialized}
                    className="w-full rounded-xl border border-dashed border-[#7c6cf0]/20 bg-[#7c6cf0]/[0.03] py-4 text-sm text-[#7c6cf0]/60 hover:border-[#7c6cf0]/30 hover:text-[#7c6cf0]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    {isInitializing ? "Initializing..." : isInitialized ? "Initialized!" : "Initialize First"}
                  </button>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#7c6cf0]/20 bg-[#7c6cf0]/[0.03] py-4 text-sm text-[#7c6cf0]/60 hover:border-[#7c6cf0]/30 hover:text-[#7c6cf0]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to create a token
                  </button>
                )}
              </div>
            )}

            {/* Browse */}
            {activeTab === "browse" && (
              <div className="space-y-5">
                <MethodSignature name="get_all_tokens" params="()" returns="-> Vec<u32>" color="#4fc3f7" />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">{allTokens.length} tokens on network</span>
                  <button 
                    onClick={loadAllTokens} 
                    disabled={isLoadingTokens}
                    className="text-xs text-[#4fc3f7]/60 hover:text-[#4fc3f7] transition-colors"
                  >
                    {isLoadingTokens ? "Loading..." : "Refresh"}
                  </button>
                </div>

                {isLoadingTokens ? (
                  <div className="flex items-center justify-center py-10">
                    <SpinnerIcon />
                    <span className="ml-2 text-sm text-white/40">Loading tokens...</span>
                  </div>
                ) : allTokens.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-sm text-white/40">No tokens created yet.</p>
                    <p className="text-xs text-white/25 mt-1">Be the first to create one!</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {allTokens.map((token) => (
                      <TokenCard
                        key={token.id}
                        token={token}
                        walletAddress={walletAddress}
                        onRefresh={loadAllTokens}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Transfer */}
            {activeTab === "transfer" && (
              <div className="space-y-5">
                <MethodSignature name="transfer" params="(from, to, token_id, amount)" color="#fbbf24" />
                <p className="text-xs text-white/40 -mt-2">
                  Transfer your tokens to anyone.
                </p>
                <Input label="Your Token ID" type="number" value={transferTokenId} onChange={(e) => setTransferTokenId(e.target.value)} placeholder="0" />
                <Input label="Recipient Address" value={transferTo} onChange={(e) => setTransferTo(e.target.value)} placeholder="G..." />
                <Input label="Amount" type="number" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} placeholder="100" />
                
                {walletAddress ? (
                  <ShimmerButton onClick={handleTransfer} disabled={isTransferring} shimmerColor="#fbbf24" className="w-full">
                    {isTransferring ? <><SpinnerIcon /> Transferring...</> : <><TransferIcon /> Transfer</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#fbbf24]/20 bg-[#fbbf24]/[0.03] py-4 text-sm text-[#fbbf24]/60 hover:border-[#fbbf24]/30 hover:text-[#fbbf24]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to transfer
                  </button>
                )}
              </div>
            )}

            {/* Mint */}
            {activeTab === "mint" && (
              <div className="space-y-5">
                <MethodSignature name="mint" params="(to, token_id, amount)" color="#34d399" />
                <p className="text-xs text-yellow-200/40 -mt-2">
                  Only the token creator can mint new tokens.
                </p>
                <Input label="Token ID to Mint" type="number" value={mintTokenId} onChange={(e) => setMintTokenId(e.target.value)} placeholder="0" />
                <Input label="Recipient Address" value={mintTo} onChange={(e) => setMintTo(e.target.value)} placeholder="G..." />
                <Input label="Amount to Mint" type="number" value={mintAmount} onChange={(e) => setMintAmount(e.target.value)} placeholder="1000" />
                
                {walletAddress ? (
                  <ShimmerButton onClick={handleMint} disabled={isMinting} shimmerColor="#34d399" className="w-full">
                    {isMinting ? <><SpinnerIcon /> Minting...</> : <><MintIcon /> Mint Tokens</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#34d399]/20 bg-[#34d399]/[0.03] py-4 text-sm text-[#34d399]/60 hover:border-[#34d399]/30 hover:text-[#34d399]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to mint
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.04] px-6 py-3 flex items-center justify-between">
            <p className="text-[10px] text-white/15">Token Factory &middot; Soroban</p>
            <div className="flex items-center gap-2 text-[10px] text-white/25">
              <span className="h-1.5 w-1.5 rounded-full bg-[#34d399]" />
              <span>Permissionless</span>
            </div>
          </div>
        </AnimatedCard>
      </Spotlight>
    </div>
  );
}
