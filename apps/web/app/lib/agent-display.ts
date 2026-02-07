/**
 * Helper to get i18n display name/description for agents.
 * Built-in agents use translated names; custom agents use stored values.
 */

import type { Agent } from '~/lib/db/schema'

type TFunction = (key: string, options?: object) => string

export function getAgentDisplayName(agent: Agent | null | undefined, t: TFunction): string {
  if (!agent) return 'Agent'
  if (agent.source === 'user') return agent.name
  const key = `agents.builtin.${agent.id}.name`
  const translated = t(key)
  return translated !== key ? translated : agent.name
}

export function getAgentDisplayDescription(agent: Agent | null | undefined, t: TFunction): string {
  if (!agent) return ''
  if (agent.source === 'user') return agent.description
  const key = `agents.builtin.${agent.id}.description`
  const translated = t(key)
  return translated !== key ? translated : agent.description
}

export function getAgentDetailedDescription(agent: Agent | null | undefined, t: TFunction): string {
  if (!agent || agent.source === 'user') return agent?.description ?? ''
  const key = `agents.builtin.${agent.id}.detailedDescription`
  const translated = t(key)
  return translated !== key ? translated : ''
}

export function getAgentWhatItDoes(agent: Agent | null | undefined, t: TFunction): string {
  if (!agent || agent.source === 'user') return agent?.description ?? ''
  const key = `agents.builtin.${agent.id}.whatItDoes`
  const translated = t(key)
  return translated !== key ? translated : agent.description
}

export function getAgentMcps(agent: Agent | null | undefined, t: TFunction): string {
  if (!agent || agent.source === 'user') return ''
  const key = `agents.builtin.${agent.id}.mcps`
  const translated = t(key)
  return translated !== key ? translated : ''
}

export function getAgentFeatures(agent: Agent | null | undefined, t: TFunction): string[] {
  if (!agent || agent.source === 'user') return []
  const features: string[] = []
  for (let i = 1; i <= 4; i++) {
    const key = `agents.builtin.${agent.id}.feature${i}`
    const translated = t(key)
    if (translated !== key) features.push(translated)
  }
  return features
}

export function getAgentHowToUse(agent: Agent | null | undefined, t: TFunction): string {
  if (!agent || agent.source === 'user') return ''
  const key = `agents.builtin.${agent.id}.howToUse`
  const translated = t(key)
  return translated !== key ? translated : ''
}

export function getAgentProTip(agent: Agent | null | undefined, t: TFunction): string {
  if (!agent || agent.source === 'user') return ''
  const key = `agents.builtin.${agent.id}.proTip`
  const translated = t(key)
  return translated !== key ? translated : ''
}

export function getAgentUsageExamples(agent: Agent | null | undefined, t: TFunction): string[] {
  if (!agent || agent.source === 'user') return []
  const examples: string[] = []
  for (let i = 1; i <= 5; i++) {
    const key = `agents.builtin.${agent.id}.usageExample${i}`
    const translated = t(key)
    if (translated !== key) examples.push(translated)
  }
  return examples
}
