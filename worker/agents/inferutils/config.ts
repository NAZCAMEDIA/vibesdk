import { 
    AgentActionKey, 
    AgentConfig, 
    AgentConstraintConfig, 
    AIModels,
    AllModels,
    LiteModels,
    RegularModels,
} from "./config.types";
import { env } from 'cloudflare:workers';

// Common configs - these are good defaults
const COMMON_AGENT_CONFIGS = {
    templateSelection: {
        name: AIModels.GEMINI_2_5_FLASH_LITE,
        max_tokens: 2000,
        fallbackModel: AIModels.GEMINI_2_5_FLASH,
        temperature: 0.6,
    },
    screenshotAnalysis: {
        name: AIModels.DISABLED,
        reasoning_effort: 'medium' as const,
        max_tokens: 8000,
        temperature: 1,
        fallbackModel: AIModels.GEMINI_2_5_FLASH,
    },
    realtimeCodeFixer: {
        name: AIModels.DISABLED,
        reasoning_effort: 'low' as const,
        max_tokens: 32000,
        temperature: 1,
        fallbackModel: AIModels.GEMINI_2_5_FLASH,
    },
    fastCodeFixer: {
        name: AIModels.DISABLED,
        reasoning_effort: undefined,
        max_tokens: 64000,
        temperature: 0.0,
        fallbackModel: AIModels.GEMINI_2_5_PRO,
    },
} as const;

const SHARED_IMPLEMENTATION_CONFIG = {
    reasoning_effort: 'low' as const,
    max_tokens: 48000,
    temperature: 0.2,
    fallbackModel: AIModels.GEMINI_2_5_PRO,
};

//======================================================================================
// ATTENTION! Platform config requires specific API keys and Cloudflare AI Gateway setup.
//======================================================================================
/* 
These are the configs used at build.cloudflare.dev 
You may need to provide API keys for these models in your environment or use 
Cloudflare AI Gateway unified billing for seamless model access without managing multiple keys.
*/
const PLATFORM_AGENT_CONFIG: AgentConfig = {
    ...COMMON_AGENT_CONFIGS,
    blueprint: {
        name: AIModels.OPENAI_5_MINI,
        reasoning_effort: 'medium',
        max_tokens: 32000,
        fallbackModel: AIModels.GEMINI_2_5_FLASH,
        temperature: 1.0,
    },
    projectSetup: {
        name: AIModels.GROK_4_FAST,
        reasoning_effort: 'medium',
        max_tokens: 8000,
        temperature: 1,
        fallbackModel: AIModels.GEMINI_2_5_PRO,
    },
    phaseGeneration: {
        name: AIModels.GROK_4_FAST,
        reasoning_effort: 'medium',
        max_tokens: 8000,
        temperature: 1,
        fallbackModel: AIModels.OPENAI_5_MINI,
    },
    firstPhaseImplementation: {
        name: AIModels.GEMINI_2_5_PRO,
        ...SHARED_IMPLEMENTATION_CONFIG,
    },
    phaseImplementation: {
        name: AIModels.GEMINI_2_5_PRO,
        ...SHARED_IMPLEMENTATION_CONFIG,
    },
    conversationalResponse: {
        name: AIModels.GROK_4_FAST,
        reasoning_effort: 'low',
        max_tokens: 4000,
        temperature: 1,
        fallbackModel: AIModels.GEMINI_2_5_FLASH,
    },
    deepDebugger: {
        name: AIModels.OPENAI_5_MINI,
        reasoning_effort: 'high',
        max_tokens: 8000,
        temperature: 1,
        fallbackModel: AIModels.GEMINI_2_5_FLASH,
    },
    fileRegeneration: {
        name: AIModels.OPENAI_5_MINI,
        reasoning_effort: 'medium',
        max_tokens: 16000,
        temperature: 1,
        fallbackModel: AIModels.GROK_CODE_FAST_1,
    },
};

//======================================================================================
// GLM 4.7 Only Config (CodePlan provider)
//======================================================================================
/* GLM-only configuration - uses CodePlan GLM 4.7 for all agents */
const GLM_ONLY_CONFIG: AgentConfig = {
    ...COMMON_AGENT_CONFIGS,
    templateSelection: {
        name: AIModels.GLM_4_7,
        max_tokens: 2000,
        fallbackModel: AIModels.GLM_4_7,
        temperature: 0.6,
    },
    blueprint: {
        name: AIModels.GLM_4_7_THINKING,
        reasoning_effort: 'medium',
        max_tokens: 64000,
        fallbackModel: AIModels.GLM_4_7,
        temperature: 0.7,
    },
    projectSetup: {
        name: AIModels.GLM_4_7,
        reasoning_effort: 'low',
        max_tokens: 48000,
        temperature: 0.2,
        fallbackModel: AIModels.GLM_4_7,
    },
    phaseGeneration: {
        name: AIModels.GLM_4_7,
        reasoning_effort: 'low',
        max_tokens: 48000,
        temperature: 0.2,
        fallbackModel: AIModels.GLM_4_7,
    },
    firstPhaseImplementation: {
        name: AIModels.GLM_4_7,
        reasoning_effort: 'low',
        max_tokens: 48000,
        temperature: 0.2,
        fallbackModel: AIModels.GLM_4_7,
    },
    phaseImplementation: {
        name: AIModels.GLM_4_7,
        reasoning_effort: 'low',
        max_tokens: 48000,
        temperature: 0.2,
        fallbackModel: AIModels.GLM_4_7,
    },
    conversationalResponse: {
        name: AIModels.GLM_4_7,
        reasoning_effort: 'low',
        max_tokens: 4000,
        temperature: 0.5,
        fallbackModel: AIModels.GLM_4_7,
    },
    deepDebugger: {
        name: AIModels.GLM_4_7_THINKING,
        reasoning_effort: 'high',
        max_tokens: 8000,
        temperature: 0.5,
        fallbackModel: AIModels.GLM_4_7,
    },
    fileRegeneration: {
        name: AIModels.GLM_4_7,
        reasoning_effort: 'low',
        max_tokens: 32000,
        temperature: 0,
        fallbackModel: AIModels.GLM_4_7,
    },
};

//======================================================================================
// Default Gemini-only config (most likely used in your deployment)
//======================================================================================
/* These are the default out-of-the box gemini-only models used when PLATFORM_MODEL_PROVIDERS is not set */
const DEFAULT_AGENT_CONFIG: AgentConfig = GLM_ONLY_CONFIG;

export const AGENT_CONFIG: AgentConfig = env.PLATFORM_MODEL_PROVIDERS 
    ? PLATFORM_AGENT_CONFIG 
    : DEFAULT_AGENT_CONFIG;


export const AGENT_CONSTRAINTS: Map<AgentActionKey, AgentConstraintConfig> = new Map([
	['fastCodeFixer', {
		allowedModels: new Set([AIModels.DISABLED]),
		enabled: true,
	}],
	['realtimeCodeFixer', {
		allowedModels: new Set([AIModels.DISABLED]),
		enabled: true,
	}],
	['fileRegeneration', {
		allowedModels: new Set(AllModels),
		enabled: true,
	}],
	['phaseGeneration', {
		allowedModels: new Set(AllModels),
		enabled: true,
	}],
	['projectSetup', {
		allowedModels: new Set([...RegularModels, AIModels.GEMINI_2_5_PRO]),
		enabled: true,
	}],
	['conversationalResponse', {
		allowedModels: new Set(RegularModels),
		enabled: true,
	}],
	['templateSelection', {
		allowedModels: new Set(LiteModels),
		enabled: true,
	}],
]);