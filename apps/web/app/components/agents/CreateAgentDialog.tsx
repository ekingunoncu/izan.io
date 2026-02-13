import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  X,
  Bot,
  Search,
  Code,
  Calendar,
  Mail,
  Database,
  Globe,
  FileText,
  Puzzle,
  Zap,
  Shield,
  MessageSquare,
  Lightbulb,
} from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { useAgentStore, useUIStore, useMCPStore } from '~/store'
import { cn } from '~/lib/utils'

const AVAILABLE_ICONS = [
  { id: 'bot', icon: Bot, label: 'Bot' },
  { id: 'search', icon: Search, label: 'Search' },
  { id: 'code', icon: Code, label: 'Code' },
  { id: 'calendar', icon: Calendar, label: 'Calendar' },
  { id: 'mail', icon: Mail, label: 'Mail' },
  { id: 'database', icon: Database, label: 'Database' },
  { id: 'globe', icon: Globe, label: 'Globe' },
  { id: 'file-text', icon: FileText, label: 'File' },
  { id: 'puzzle', icon: Puzzle, label: 'Puzzle' },
  { id: 'zap', icon: Zap, label: 'Zap' },
  { id: 'shield', icon: Shield, label: 'Shield' },
  { id: 'message-square', icon: MessageSquare, label: 'Chat' },
  { id: 'lightbulb', icon: Lightbulb, label: 'Idea' },
]

export function CreateAgentDialog() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const { createAgent, selectAgent, getAgentSlug } = useAgentStore()
  const { closeCreateAgent } = useUIStore()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('bot')
  const [basePrompt, setBasePrompt] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) return
    setIsCreating(true)
    try {
      const agent = await createAgent({
        name: name.trim(),
        description: description.trim(),
        icon: selectedIcon,
        basePrompt: basePrompt.trim() || 'You are a helpful AI assistant.',
      })
      await selectAgent(agent.id)
      navigate(`/chat/${getAgentSlug(agent)}`, { replace: true })
      closeCreateAgent()
      useMCPStore.getState().activateAgentMCPs(agent)
    } catch (error) {
      console.error('Failed to create agent:', error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-background border rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
          <h2 className="text-lg font-semibold">{t('agents.createTitle')}</h2>
          <Button variant="ghost" size="icon" className="h-11 w-11 min-h-[44px] min-w-[44px] sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0" onClick={closeCreateAgent}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-5">
          <p className="text-sm text-muted-foreground">{t('agents.createPlain')}</p>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('agents.name')}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('agents.namePlaceholder')}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('agents.descriptionLabel')}</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('agents.descriptionPlaceholder')}
            />
          </div>

          {/* Icon Selection */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('agents.iconLabel')}</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_ICONS.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedIcon(id)}
                  className={cn(
                    'w-11 h-11 min-h-[44px] min-w-[44px] sm:w-10 sm:h-10 sm:min-h-0 sm:min-w-0 rounded-lg flex items-center justify-center transition-colors border cursor-pointer',
                    selectedIcon === id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-muted border-transparent'
                  )}
                  title={label}
                >
                  <Icon className="h-5 w-5" />
                </button>
              ))}
            </div>
          </div>

          {/* System Prompt */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('agents.basePrompt')}</label>
            <textarea
              value={basePrompt}
              onChange={(e) => setBasePrompt(e.target.value)}
              placeholder={t('agents.basePromptPlaceholder')}
              className="w-full min-h-[100px] rounded-md border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              rows={4}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t">
          <Button variant="outline" onClick={closeCreateAgent}>
            {t('agents.cancel')}
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || isCreating}>
            {t('agents.create')}
          </Button>
        </div>
      </div>
    </div>
  )
}
