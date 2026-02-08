/** Domain check server */
export function startDomainCheckServer(): Promise<boolean>
export function stopDomainCheckServer(): Promise<void>
export function isDomainCheckServerRunning(): boolean
export interface DomainAvailabilityResult {
  domain: string
  canBuy: boolean
  fastReject?: 'dns'
  timeout?: boolean
  error?: string
}

/** Crypto analysis server */
export function startCryptoAnalysisServer(): Promise<boolean>
export function stopCryptoAnalysisServer(): Promise<void>
export function isCryptoAnalysisServerRunning(): boolean
export function setCoinGeckoApiKey(key: string | null): void
export interface AnalysisReport {
  coin: { id: string; name: string; symbol: string }
  market: Record<string, unknown>
  technicalIndicators: IndicatorResults
  technicalIndicatorsNote?: string
  momentum: Record<string, unknown>
  trust: Record<string, unknown>
  overallSignal: 'bullish' | 'bearish' | 'neutral'
  generatedAt: string
}
export interface IndicatorResults {
  rsi: unknown
  macd: unknown
  bollingerBands: unknown
  ema: unknown
  sma: unknown
  atr: unknown
  stochastic: unknown
  adx: unknown
  overallSignal: 'bullish' | 'bearish' | 'neutral'
  signalSummary: string
}

/** General server */
export function startGeneralServer(): Promise<boolean>
export function stopGeneralServer(): Promise<void>
export function isGeneralServerRunning(): boolean
