'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'
import type { PostType } from '@/lib/types'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

interface ItemInput {
  id: string
  name: string
  image_url: string | null
  image_file: File | null
}

type PostMode = 'poll' | 'wyr' | 'rate' | 'compare' | 'rank'

const POST_MODES: { value: PostMode; label: string; description: string; icon: string; itemsRequired: { min: number; max: number } }[] = [
  { value: 'poll', label: 'Poll', description: 'Vote for your favorite', icon: '📊', itemsRequired: { min: 2, max: 4 } },
  { value: 'wyr', label: 'Would You Rather', description: 'Choose between two options', icon: '🤔', itemsRequired: { min: 2, max: 2 } },
  { value: 'rate', label: 'Rate This', description: 'Rate one thing on attributes', icon: '⭐', itemsRequired: { min: 1, max: 1 } },
  { value: 'compare', label: 'Compare', description: 'Compare and rate multiple things', icon: '⚖️', itemsRequired: { min: 2, max: 4 } },
  { value: 'rank', label: 'Ranking', description: 'Rank items in order', icon: '🏆', itemsRequired: { min: 2, max: 4 } },
]

const DEFAULT_ATTRIBUTES = ['Looks', 'Style', 'Vibe', 'Creativity', 'Originality']

const DURATION_OPTIONS = [
  { value: 24, label: '24 hours' },
  { value: 72, label: '3 days' },
  { value: 168, label: '7 days' },
  { value: 720, label: '30 days' },
]

export default function CreatePage() {
  const [step, setStep] = useState(1)
  const [postMode, setPostMode] = useState<PostMode>('poll')
  const [items, setItems] = useState<ItemInput[]>([
    { id: '1', name: '', image_url: null, image_file: null },
    { id: '2', name: '', image_url: null, image_file: null },
  ])
  const [caption, setCaption] = useState('')
  const [attributes, setAttributes] = useState<string[]>(['Looks', 'Style'])
  const [customAttribute, setCustomAttribute] = useState('')
  const [duration, setDuration] = useState(168)
  const [endTimeMode, setEndTimeMode] = useState<'preset' | 'custom'>('preset')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [customEndTime, setCustomEndTime] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ id: string; share_url: string } | null>(null)
  const [showImageModal, setShowImageModal] = useState(false)
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentMode = POST_MODES.find((m) => m.value === postMode)!
  const { min: minItems, max: maxItems } = currentMode.itemsRequired

  const needsAttributes = postMode === 'rate' || postMode === 'compare'
  const visualSteps = needsAttributes ? [1, 2, 3, 4, 5] : [1, 2, 4, 5]
  const visualStep = visualSteps.indexOf(step) + 1

  const resetItems = (mode: PostMode) => {
    const modeConfig = POST_MODES.find((m) => m.value === mode)!
    const count = modeConfig.itemsRequired.min
    setItems(
      Array.from({ length: count }, (_, i) => ({
        id: `${i + 1}`,
        name: '',
        image_url: null,
        image_file: null,
      }))
    )
  }

  const handleModeSelect = (mode: PostMode) => {
    setPostMode(mode)
    resetItems(mode)
  }

  const addItem = () => {
    if (items.length < maxItems) {
      setItems([...items, { id: Date.now().toString(), name: '', image_url: null, image_file: null }])
    }
  }

  const removeItem = (id: string) => {
    if (items.length > minItems) {
      setItems(items.filter((item) => item.id !== id))
    }
  }

  const updateItem = (id: string, updates: Partial<ItemInput>) => {
    setItems(items.map((item) => (item.id === id ? { ...item, ...updates } : item)))
  }

  const openImagePicker = (itemId: string) => {
    setActiveItemId(itemId)
    setShowImageModal(true)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeItemId) return

    const reader = new FileReader()
    reader.onload = () => {
      updateItem(activeItemId, {
        image_url: reader.result as string,
        image_file: file,
      })
    }
    reader.readAsDataURL(file)
    setShowImageModal(false)
  }

  const removeImage = (itemId: string) => {
    updateItem(itemId, { image_url: null, image_file: null })
  }

  const toggleAttribute = (attr: string) => {
    if (attributes.includes(attr)) {
      setAttributes(attributes.filter((a) => a !== attr))
    } else if (attributes.length < 5) {
      setAttributes([...attributes, attr])
    }
  }

  const addCustomAttribute = () => {
    const trimmed = customAttribute.trim()
    if (trimmed && !attributes.includes(trimmed) && attributes.length < 5) {
      setAttributes([...attributes, trimmed])
      setCustomAttribute('')
    }
  }

  const handleNext = () => {
    const needsAttributes = postMode === 'rate' || postMode === 'compare'
    if (step === 2 && !needsAttributes) {
      setStep(4)
    } else if (step === 4 && !needsAttributes) {
      setStep(5)
    } else {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    const needsAttributes = postMode === 'rate' || postMode === 'compare'
    if (step === 4 && !needsAttributes) {
      setStep(2)
    } else {
      setStep(step - 1)
    }
  }

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)

    try {
      const processedItems = await Promise.all(
        items.map(async (item) => {
          let image_url = item.image_url

          if (item.image_file) {
            const result = await api.uploadImage(item.image_file)
            image_url = result.data.image_url
          }

          return {
            name: item.name,
            image_url: image_url || undefined,
          }
        })
      )

      const payload: any = {
        type: postMode,
        caption: caption || undefined,
        attributes: postMode === 'rate' || postMode === 'compare' ? attributes : undefined,
        items: processedItems,
      }

      if (endTimeMode === 'preset') {
        payload.expires_in_hours = duration
      } else if (customEndDate && customEndTime) {
        payload.expires_at = new Date(`${customEndDate}T${customEndTime}`).toISOString()
      }

      const response = await api.createPost(payload)

      setSuccess({
        id: response.data.id,
        share_url: response.data.share_url,
      })
    } catch (err: any) {
      setError(err.message || 'Failed to create post')
    } finally {
      setLoading(false)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return true
      case 2:
        const validItems = items.filter((item) => item.name.trim().length > 0)
        return validItems.length >= minItems
      case 3:
        return postMode !== 'rate' && postMode !== 'compare' || attributes.length > 0
      case 4:
        return true
      case 5:
        return true
      default:
        return false
    }
  }

  if (success) {
    return (
      <div className="min-h-screen">
        <Sidebar />
        <div className="lg:ml-64 flex items-center justify-center min-h-screen p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-8 max-w-md w-full text-center"
          >
            <motion.div
              className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
            >
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-2">Post Created! 🎉</h2>
            <p className="text-gray-400 mb-8">Your post is now live and ready for votes.</p>
            <div className="space-y-3">
              <a
                href={`/p/${success.id}`}
                className="block w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-emerald-500/20 transition-all hover:-translate-y-1"
              >
                View Post
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(success.share_url)
                }}
                className="block w-full py-3.5 bg-[#1a2420] text-gray-300 rounded-xl font-semibold hover:bg-[#243030] transition-colors border border-white/10"
              >
                Copy Link
              </button>
              <a
                href="/"
                className="block w-full py-3 text-gray-500 font-medium hover:text-gray-300 transition-colors"
              >
                Back to Home
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <Header title="Create Post" />

      <main className="lg:ml-64 pb-28 sm:pb-32 lg:pb-8">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <div className="hidden lg:block mb-8">
            <h1 className="text-2xl font-bold text-white">Create a Post</h1>
            <p className="text-gray-400 mt-1">Share something and let people vote!</p>
          </div>

          <div className="flex items-center justify-center gap-2 mb-8">
            {visualSteps.map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${s <= step ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-[#1a2420] text-gray-500'
                    }`}
                >
                  {s < step ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                {i < visualSteps.length - 1 && (
                  <div className={`w-12 h-1 mx-1 rounded-full transition-all ${s < step ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-[#1a2420]'}`} />
                )}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-card p-6"
              >
                <h2 className="text-lg font-semibold text-white mb-2">Choose Post Type</h2>
                <p className="text-gray-400 text-sm mb-6">What kind of post do you want to create?</p>

                <div className="grid gap-3">
                  {POST_MODES.map((mode) => (
                    <button
                      key={mode.value}
                      onClick={() => handleModeSelect(mode.value)}
                      className={`w-full p-4 rounded-xl text-left transition-all flex items-center gap-4 ${postMode === mode.value
                        ? 'bg-emerald-500/15 border-2 border-emerald-500 shadow-lg shadow-emerald-500/10'
                        : 'bg-[#1a2420]/50 border-2 border-transparent hover:bg-[#1a2420] hover:border-white/10'
                        }`}
                    >
                      <span className="text-2xl">{mode.icon}</span>
                      <div className="flex-1">
                        <div className="font-semibold text-white">{mode.label}</div>
                        <div className="text-sm text-gray-400">{mode.description}</div>
                      </div>
                      {postMode === mode.value && (
                        <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-card p-6"
              >
                <h2 className="text-lg font-semibold text-white mb-2">Add Items</h2>
                <p className="text-gray-400 text-sm mb-6">
                  {postMode === 'rate'
                    ? 'Add the item you want people to rate'
                    : `Add ${minItems}-${maxItems} items (${minItems} required, images optional)`}
                </p>

                <div className={`grid gap-4 ${postMode === 'rate' ? '' : 'grid-cols-2'}`}>
                  {items.map((item, index) => (
                    <div key={item.id} className={`relative ${postMode === 'rate' ? '' : ''}`}>
                      <div
                        onClick={() => openImagePicker(item.id)}
                        className={`${postMode === 'rate' ? 'h-40' : 'aspect-square'} rounded-2xl border-2 border-dashed cursor-pointer overflow-hidden transition-all mb-3 ${item.image_url ? 'border-transparent' : 'border-gray-600 hover:border-emerald-400 hover:bg-white/5'
                          }`}
                      >
                        {item.image_url ? (
                          <div className="relative w-full h-full group">
                            <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                              <button
                                onClick={(e) => { e.stopPropagation(); removeImage(item.id) }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity w-10 h-10 rounded-full bg-red-500/90 text-white flex items-center justify-center shadow-lg"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                            <svg className="w-8 h-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-xs">Optional</span>
                          </div>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder={`Option ${index + 1} name *`}
                        value={item.name}
                        onChange={(e) => updateItem(item.id, { name: e.target.value })}
                        className="w-full px-4 py-3 text-sm bg-[#1a2420]/50 text-white placeholder-gray-500 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        required
                      />
                      {items.length > minItems && (
                        <button
                          onClick={() => removeItem(item.id)}
                          className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full text-sm font-bold shadow-lg hover:bg-red-600 transition-colors"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}

                  {items.length < maxItems && (
                    <button
                      onClick={addItem}
                      className="aspect-square rounded-2xl border-2 border-dashed border-gray-600 flex items-center justify-center text-gray-500 hover:border-emerald-400 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all"
                    >
                      <div className="text-center">
                        <svg className="w-8 h-8 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-xs font-medium">Add Item</span>
                      </div>
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {step === 3 && (postMode === 'rate' || postMode === 'compare') && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-card p-6"
              >
                <h2 className="text-lg font-semibold text-white mb-2">Select Attributes</h2>
                <p className="text-gray-400 text-sm mb-6">Choose what to rate on (max 5)</p>

                <div className="flex flex-wrap gap-2 mb-6">
                  {DEFAULT_ATTRIBUTES.map((attr) => (
                    <button
                      key={attr}
                      onClick={() => toggleAttribute(attr)}
                      className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${attributes.includes(attr)
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                        : 'bg-[#1a2420] text-gray-400 hover:bg-[#243030] hover:text-white'
                        }`}
                    >
                      {attr}
                    </button>
                  ))}
                  {attributes
                    .filter((a) => !DEFAULT_ATTRIBUTES.includes(a))
                    .map((attr) => (
                      <button
                        key={attr}
                        onClick={() => toggleAttribute(attr)}
                        className="px-5 py-2.5 rounded-full text-sm font-medium bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                      >
                        {attr}
                      </button>
                    ))}
                </div>

                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Add custom attribute..."
                    value={customAttribute}
                    onChange={(e) => setCustomAttribute(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomAttribute()}
                    className="flex-1 px-4 py-3 bg-[#1a2420]/50 text-white placeholder-gray-500 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    maxLength={20}
                  />
                  <Button onClick={addCustomAttribute} disabled={!customAttribute.trim() || attributes.length >= 5}>
                    Add
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && postMode !== 'rate' && postMode !== 'compare' && (
              <motion.div
                key="step3-skip"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-card p-6 text-center"
              >
                <div className="w-16 h-16 bg-[#1a2420] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-white mb-2">No attributes needed</h2>
                <p className="text-gray-400">This post type does not require rating attributes.</p>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-card p-6"
              >
                <h2 className="text-lg font-semibold text-white mb-2">Add Caption</h2>
                <p className="text-gray-400 text-sm mb-6">What do you want to ask? (optional)</p>

                <textarea
                  placeholder="e.g., Who wore it better?"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1a2420]/50 text-white placeholder-gray-500 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                  rows={4}
                  maxLength={120}
                />
                <p className="text-right text-sm text-gray-500 mt-2">{caption.length}/120</p>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-card p-6"
              >
                <h2 className="text-lg font-semibold text-white mb-2">When should it end?</h2>
                <p className="text-gray-400 text-sm mb-6">Set when this post&apos;s voting period will end</p>

                {/* Mode Toggle */}
                <div className="flex gap-2 mb-6 p-1 bg-[#1a2420] rounded-xl">
                  <button
                    onClick={() => setEndTimeMode('preset')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${endTimeMode === 'preset'
                      ? 'bg-[#243030] text-emerald-400 shadow-sm'
                      : 'text-gray-500 hover:text-gray-300'
                      }`}
                  >
                    Quick Select
                  </button>
                  <button
                    onClick={() => setEndTimeMode('custom')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${endTimeMode === 'custom'
                      ? 'bg-[#243030] text-emerald-400 shadow-sm'
                      : 'text-gray-500 hover:text-gray-300'
                      }`}
                  >
                    Custom Date & Time
                  </button>
                </div>

                {/* Preset Options */}
                {endTimeMode === 'preset' && (
                  <div className="grid grid-cols-2 gap-3">
                    {DURATION_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setDuration(opt.value)}
                        className={`p-4 rounded-xl font-medium transition-all ${duration === opt.value
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                          : 'bg-[#1a2420] text-gray-400 hover:bg-[#243030] hover:text-white'
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Custom DateTime Picker */}
                {endTimeMode === 'custom' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Date
                        </label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full p-3 bg-[#1a2420]/50 text-white border border-white/10 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Time
                        </label>
                        <input
                          type="time"
                          value={customEndTime}
                          onChange={(e) => setCustomEndTime(e.target.value)}
                          className="w-full p-3 bg-[#1a2420]/50 text-white border border-white/10 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 outline-none transition-all"
                        />
                      </div>
                    </div>
                    {customEndDate && customEndTime && (
                      <p className="text-sm text-gray-400 bg-[#1a2420] p-3 rounded-lg">
                        Ends at: {new Date(`${customEndDate}T${customEndTime}`).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium"
            >
              {error}
            </motion.div>
          )}
        </div>
      </main>

      <div className="fixed bottom-[60px] lg:bottom-0 left-0 right-0 lg:left-64 p-4 bg-[#0a0f0d]/95 backdrop-blur-xl border-t border-white/10 z-50" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}>
        <div className="max-w-2xl mx-auto flex gap-3">
          {step > 1 && (
            <Button
              variant="secondary"
              onClick={handleBack}
              className="flex-1"
            >
              Back
            </Button>
          )}
          {step < 5 ? (
            <Button onClick={handleNext} disabled={!canProceed()} className="flex-1">
              Continue
            </Button>
          ) : (
            <Button onClick={handleSubmit} loading={loading} disabled={!canProceed()} className="flex-1">
              Create Post
            </Button>
          )}
        </div>
      </div>

      <Modal isOpen={showImageModal} onClose={() => setShowImageModal(false)}>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Choose Source</h3>
          <div className="space-y-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-4 text-left rounded-xl bg-[#1a2420] hover:bg-[#243030] transition-colors flex items-center gap-3 text-white"
            >
              <span className="text-2xl">📁</span>
              <span className="font-medium">Gallery</span>
            </button>
            <button
              onClick={() => setShowImageModal(false)}
              className="w-full p-4 text-left rounded-xl bg-[#1a2420] hover:bg-[#243030] transition-colors flex items-center gap-3 text-gray-400"
            >
              <span className="text-2xl">❌</span>
              <span className="font-medium">Cancel</span>
            </button>
          </div>
        </div>
      </Modal>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
    </div>
  )
}
