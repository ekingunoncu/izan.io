import type { BuiltinAgentDefinition } from '../shared/types.js'

export const definition: BuiltinAgentDefinition = {
  id: 'general',
  slug: 'general',
  name: 'General Assistant',
  description: 'General purpose AI assistant. Helps with any topic.',
  icon: 'bot',
  basePrompt:
    'You are a helpful AI assistant. Respond in English. Be kind and informative to the user.',
  category: 'general',
  implicitMCPIds: ['general', 'image-gen'],
  color: 'bg-blue-400/80 text-blue-900 dark:bg-blue-500/10 dark:text-blue-400',
}
