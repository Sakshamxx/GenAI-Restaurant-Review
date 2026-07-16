/**
 * AI Review Generator
 * Generate, edit, and manage review suggestions powered by Gemini
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Copy, RotateCcw, Edit2, Check, X, Loader2 } from 'lucide-react'
import { generateSuggestions } from '../services/api.js'
import { Toast } from '../lib/errorHandler.js'

export default function AIReviewGenerator({ reviewText, restaurantId, onSelectSuggestion }) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [editedText, setEditedText] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  async function handleGenerate() {
    if (!reviewText || reviewText.trim().length < 10) {
      Toast.warning('Please write at least 10 characters for review generation')
      return
    }

    setLoading(true)

    try {
      const response = await generateSuggestions({
        reviewText,
        restaurantId,
        count: 3,
      })

      if (response.suggestions && response.suggestions.length > 0) {
        setSuggestions(response.suggestions)
        setSelectedIndex(0)
        setEditedText(response.suggestions[0])
        Toast.success('Suggestions generated!')
      } else {
        Toast.error('No suggestions generated. Please try again.')
      }
    } catch (error) {
      Toast.error('Failed to generate suggestions')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  function handleCopySuggestion(text) {
    navigator.clipboard.writeText(text)
    Toast.success('Copied to clipboard!')
  }

  function handleSelectSuggestion(index) {
    setSelectedIndex(index)
    setEditedText(suggestions[index])
    setIsEditing(false)
  }

  function handleEditSuggestion() {
    setIsEditing(true)
  }

  function handleSaveEdit() {
    if (!editedText.trim()) {
      Toast.warning('Suggestion cannot be empty')
      return
    }
    // Update the suggestion in the list
    const newSuggestions = [...suggestions]
    newSuggestions[selectedIndex] = editedText
    setSuggestions(newSuggestions)
    setIsEditing(false)
    Toast.success('Suggestion updated!')
  }

  function handleConfirmSuggestion() {
    if (onSelectSuggestion) {
      onSelectSuggestion(editedText)
      Toast.success('Review suggestion selected!')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-100"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Sparkles size={24} className="text-blue-600" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-gray-900">AI Review Suggestions</h3>
          <p className="text-sm text-gray-600">Powered by Google Gemini</p>
        </div>
      </div>

      {suggestions.length === 0 ? (
        // Generate Button
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">
            {reviewText && reviewText.trim().length >= 10
              ? 'Click below to generate polished review suggestions'
              : 'Write at least 10 characters above to generate suggestions'}
          </p>
          <button
            onClick={handleGenerate}
            disabled={loading || !reviewText || reviewText.trim().length < 10}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold flex items-center gap-2 mx-auto transition-all transform hover:scale-105"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Generate Suggestions
              </>
            )}
          </button>
        </div>
      ) : (
        // Display Suggestions
        <div className="space-y-4">
          {/* Suggestions Tabs */}
          <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
            {suggestions.map((_, index) => (
              <button
                key={index}
                onClick={() => handleSelectSuggestion(index)}
                className={`px-4 py-3 font-medium whitespace-nowrap transition-colors border-b-2 ${
                  selectedIndex === index
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Suggestion {index + 1}
              </button>
            ))}
          </div>

          {/* Selected Suggestion Content */}
          {selectedIndex !== null && (
            <AnimatePresence>
              <motion.div
                key={selectedIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {/* Edit Mode */}
                {isEditing ? (
                  <div className="space-y-3">
                    <textarea
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[120px]"
                      placeholder="Edit your review..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                      >
                        <Check size={18} />
                        Save Edit
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false)
                          setEditedText(suggestions[selectedIndex])
                        }}
                        className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                      >
                        <X size={18} />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="space-y-3">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-gray-800 leading-relaxed">{editedText}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleCopySuggestion(editedText)}
                        className="flex-1 min-w-max px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                      >
                        <Copy size={18} />
                        Copy
                      </button>
                      <button
                        onClick={handleEditSuggestion}
                        className="flex-1 min-w-max px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                      >
                        <Edit2 size={18} />
                        Edit
                      </button>
                      <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="flex-1 min-w-max px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                      >
                        <RotateCcw size={18} />
                        Regenerate
                      </button>
                    </div>

                    {/* Primary Action */}
                    {onSelectSuggestion && (
                      <button
                        onClick={handleConfirmSuggestion}
                        className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-semibold transition-all transform hover:scale-105"
                      >
                        Use This Review
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Character Count */}
          {selectedIndex !== null && (
            <div className="text-xs text-gray-500 text-right">
              {editedText.length} characters
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800">
          <strong>💡 Tip:</strong> AI suggestions are based on your review text. You can always edit them before submitting!
        </p>
      </div>
    </motion.div>
  )
}
