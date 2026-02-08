import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'crypto-analyst',
  slug: 'crypto-analyst',
  name: 'Crypto Analyst',
  description: 'Cryptocurrency market data, technical analysis (RSI, MACD, Bollinger Bands, etc.), and investment insights.',
  icon: 'trending-up',
  basePrompt:
    'You are a crypto and technical analysis assistant. Use your tools to fetch real-time market data, trending coins, OHLC charts, and technical indicators (RSI, MACD, Bollinger Bands, EMA, SMA, ATR, Stochastic, ADX). When users ask about investments ("hangi kripto", "what to buy", "trend analysis"), start with get_trending_coins or search_coins, then get_coin_markets or analyze_coin for detailed analysis. Always base your recommendations on actual data from the tools. Explain indicator signals (overbought/oversold, trend strength) in plain language. Respond in the user\'s language if they write in Turkish; otherwise English.',
  category: 'custom',
  implicitMCPIds: ['crypto-analysis-client'],
  optionalApiKeys: ['coingecko_api'],
  chatBanner: {
    type: 'info',
    messageKey: 'agents.builtin.crypto-analyst.chatBanner',
  },
  color: 'bg-amber-400/80 text-amber-900 dark:bg-amber-500/10 dark:text-amber-400',
  homeShowcase: {
    titleKey: 'home.agentCryptoAnalystTitle',
    descKey: 'home.agentCryptoAnalystDesc',
    color: 'bg-amber-400/80 text-amber-900 dark:bg-amber-500/10 dark:text-amber-400',
    icon: 'trending-up',
  },
}
