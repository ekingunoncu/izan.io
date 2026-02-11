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

/** General server */
export function startGeneralServer(): Promise<boolean>
export function stopGeneralServer(): Promise<void>
export function isGeneralServerRunning(): boolean
