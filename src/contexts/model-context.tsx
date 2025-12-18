/**
 * Model Selection Context
 * Persists selected model across the application with localStorage support
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import type { ByokProvidersData } from '@/api-types';

export interface ModelOption {
  value: string;
  label: string;
  provider: string;
  hasUserKey: boolean;
  byokAvailable: boolean;
}

interface ModelContextType {
  // Current selected model
  selectedModel: string;
  setSelectedModel: (model: string) => void;

  // Available models
  availableModels: ModelOption[];
  isLoadingModels: boolean;

  // Refresh models list
  refreshModels: () => Promise<void>;

  // Helper to get display name
  getModelDisplayName: (modelId: string) => string;
}

const ModelContext = createContext<ModelContextType | undefined>(undefined);

const STORAGE_KEY = 'vibesdk_selected_model';

// Helper to extract provider from model name (e.g., "openai/gpt-4" -> "openai")
const getProviderFromModel = (modelName: string): string => {
  if (!modelName || modelName === 'default') return '';
  return modelName.split('/')[0] || '';
};

// Helper to check if user has BYOK key for a model's provider
const hasUserKeyForModel = (modelName: string, byokProviders: Array<{ provider: string; hasValidKey: boolean }>): boolean => {
  const provider = getProviderFromModel(modelName);
  if (!provider) return false;
  return byokProviders.some(p => p.provider === provider && p.hasValidKey);
};

export function ModelProvider({ children }: { children: React.ReactNode }) {
  const [selectedModel, setSelectedModelState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'default';
    } catch {
      return 'default';
    }
  });

  const [byokData, setByokData] = useState<ByokProvidersData | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Persist to localStorage
  const setSelectedModel = useCallback((model: string) => {
    setSelectedModelState(model);
    try {
      localStorage.setItem(STORAGE_KEY, model);
    } catch (error) {
      console.warn('Failed to persist model selection:', error);
    }
  }, []);

  // Fetch available models
  const refreshModels = useCallback(async () => {
    try {
      setIsLoadingModels(true);
      // Use a generic agent key to get all available models
      const response = await apiClient.getByokProviders('conversationalResponse');
      if (response.success && response.data) {
        setByokData(response.data);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  // Load models on mount
  useEffect(() => {
    refreshModels();
  }, [refreshModels]);

  // Build available models list
  const availableModels = useMemo((): ModelOption[] => {
    if (!byokData) return [];

    const models: ModelOption[] = [];
    const processedModels = new Set<string>();

    // First, add all BYOK models
    Object.values(byokData.modelsByProvider).forEach(providerModels => {
      providerModels.forEach(model => {
        const modelStr = model as string;
        if (!processedModels.has(modelStr)) {
          const provider = getProviderFromModel(modelStr);
          const hasUserKey = hasUserKeyForModel(modelStr, byokData.providers);

          models.push({
            value: modelStr,
            label: modelStr,
            provider,
            hasUserKey,
            byokAvailable: true
          });
          processedModels.add(modelStr);
        }
      });
    });

    // Then, add platform-only models
    byokData.platformModels.forEach(model => {
      const modelStr = model as string;
      if (!processedModels.has(modelStr)) {
        models.push({
          value: modelStr,
          label: modelStr,
          provider: '',
          hasUserKey: false,
          byokAvailable: false
        });
        processedModels.add(modelStr);
      }
    });

    return models.sort((a, b) => a.label.localeCompare(b.label));
  }, [byokData]);

  // Get display name for a model
  const getModelDisplayName = useCallback((modelId: string): string => {
    if (modelId === 'default') return 'Default';
    const model = availableModels.find(m => m.value === modelId);
    return model?.label || modelId;
  }, [availableModels]);

  const value: ModelContextType = {
    selectedModel,
    setSelectedModel,
    availableModels,
    isLoadingModels,
    refreshModels,
    getModelDisplayName,
  };

  return <ModelContext.Provider value={value}>{children}</ModelContext.Provider>;
}

export function useModel() {
  const context = useContext(ModelContext);
  if (context === undefined) {
    throw new Error('useModel must be used within a ModelProvider');
  }
  return context;
}
