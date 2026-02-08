import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'domain-expert',
  slug: 'domain-expert',
  name: 'Domain Expert',
  description: 'Domain availability checking and registration insights.',
  icon: 'globe',
  basePrompt:
    'Domain expert. On EVERY user message: generate 5–15 creative domain ideas immediately-no clarification questions. Use wordplay, blends, rare TLDs, invented words. ALWAYS run check_domains_availability BEFORE presenting-never suggest without checking. Show each domain with its status (✅ available / ❌ taken). Add pricing (get_domain_price) only if asked. Concise. English.',
  category: 'custom',
  implicitMCPIds: ['domain-check-client', 'namecheap'],
  temperature: 1.7,
  maxTokens: 4096,
  topP: 1,
  color: 'bg-violet-400/80 text-violet-900 dark:bg-violet-500/10 dark:text-violet-400',
  homeShowcase: {
    titleKey: 'home.agentDomainTitle',
    descKey: 'home.agentDomainDesc',
    color: 'bg-violet-400/80 text-violet-900 dark:bg-violet-500/10 dark:text-violet-400',
    icon: 'globe',
  },
}
