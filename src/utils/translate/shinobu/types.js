/**
 * @file Shinobu translation pipeline type definitions.
 *
 * Mechanically converted from ShinobuTranslator `src/types.ts` (TS → JS):
 * all `type` aliases become JSDoc `@typedef` + an exported const placeholder
 * so the shapes stay importable/nameable from plain JS modules.
 *
 * Field names and structures are preserved exactly — every downstream module
 * (pipeline, runtime, providers) relies on these shapes.
 *
 * NOTE: `BubbleDetection` originates from `src/pipeline/bubbleDetect.ts` but is
 * hoisted here per plan (its `box`/`score`/`mask` shape is referenced by the
 * bubble stage and orchestrator).
 *
 * Imported types below are documented via JSDoc `import()` references; their
 * definitions are converted in later tasks (`runtime/platform.js`,
 * `shared/llmThinking.js`). They are doc-only and have no runtime impact.
 */

/** @typedef {import('./runtime/platform.js').PipelineCanvas} PipelineCanvas */
/** @typedef {import('./runtime/platform.js').PipelineImage} PipelineImage */
/** @typedef {import('./runtime/platform.js').PipelineImageData} PipelineImageData */
/** @typedef {import('./shared/llmThinking.js').LlmThinkingLevel} LlmThinkingLevel */

/**
 * @typedef {Object} Rect
 * @property {number} x - Left coordinate
 * @property {number} y - Top coordinate
 * @property {number} width - Box width
 * @property {number} height - Box height
 */
export const Rect = {}

/**
 * @typedef {Object} QuadPoint
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 */
export const QuadPoint = {}

/**
 * @typedef {'h'|'v'} TextDirection - Text direction: horizontal or vertical
 */
export const TextDirection = {}

/**
 * @typedef {Object} SourceTextLineGeometry
 * @property {string} text - Original line text
 * @property {TextDirection} direction - Text direction
 * @property {Rect} box - Line bounding box
 * @property {Array<QuadPoint>} [quad] - Four corner points for rotated text
 * @property {number} centerX - Center X of the line
 * @property {number} centerY - Center Y of the line
 * @property {number} width - Line width
 * @property {number} height - Line height
 * @property {number} [fontSize] - Original font size
 */
export const SourceTextLineGeometry = {}

/**
 * @typedef {'deepseek'|'gemini'|'glm'|'kimi'|'minimax'|'mimo'|'openai'|'custom'} LlmProvider
 */
export const LlmProvider = {}

/**
 * @typedef {'api_key'|'openai_oauth'|'gemini_app'} LlmAuthMode
 */
export const LlmAuthMode = {}

/**
 * @typedef {'local'|'gemini_app'} ImageEngine
 */
export const ImageEngine = {}

/**
 * @typedef {'browser_session'|'cookies_permission'} GeminiAppAuthMode
 */
export const GeminiAppAuthMode = {}

/**
 * @typedef {'nano_banana_2'|'nano_banana_pro'} GeminiAppModel
 */
export const GeminiAppModel = {}

/**
 * @typedef {Object} TranslationReferenceContext
 * @property {'x_tweet'} source - Source of the reference context
 * @property {string} currentTweetText - Text of the tweet being translated
 * @property {string} [quotedTweetText] - Text of the quoted tweet, if any
 */
export const TranslationReferenceContext = {}

/**
 * @typedef {Object} BubbleMask
 * @property {number} x - Crop offset from the left edge of the source image
 * @property {number} y - Crop offset from the top edge of the source image
 * @property {number} width - Cropped mask width in pixels
 * @property {number} height - Cropped mask height in pixels
 * @property {Uint8Array} data - Single-channel binary mask (0/1), row-major
 */
export const BubbleMask = {}

/**
 * @typedef {Object} TextRegion
 * @property {string} id - Unique region identifier
 * @property {Rect} box - Bounding box in original image coordinates
 * @property {Array<QuadPoint>} [quad] - Four corner points for rotated text
 * @property {TextDirection} [direction] - Text direction: horizontal or vertical
 * @property {number} [prob] - Detection confidence (0-1)
 * @property {number} [fontSize] - Detected font size
 * @property {Array<number>} [fgColor] - Foreground text color as RGB triplet
 * @property {Array<number>} [bgColor] - Background color as RGB triplet
 * @property {number} [originalLineCount] - Number of original text lines before merge (used for region expansion)
 * @property {string} sourceText - Original text recognized by OCR
 * @property {string} translatedText - Translated text
 * @property {Array<string>} [translatedColumns] - Optional LLM-provided vertical columns, ordered right-to-left
 * @property {Array<SourceTextLineGeometry>} [sourceLineGeometries] - Pre-merge source line/column geometries in reading order
 * @property {Rect} [bubbleBox] - Speech bubble bounding box (optional, may extend beyond text)
 * @property {BubbleMask} [bubbleMask] - Cropped binary mask of speech bubble area (single-channel, offset by x/y)
 */
export const TextRegion = {}

/**
 * @typedef {Object} BubbleDetection
 * @property {Rect} box - Detected speech bubble bounding box
 * @property {number} score - Detection confidence (0-1)
 * @property {BubbleMask} mask - Cropped binary mask of the bubble area
 */
export const BubbleDetection = {}

/**
 * @typedef {Object} PipelineConfig
 * @property {string} sourceLang - Source language code (e.g., 'ja', 'en')
 * @property {string} targetLang - Target language code (e.g., 'zh-CN')
 * @property {'google_web'|'llm'} translator - Translator backend
 * @property {LlmProvider} llmProvider - LLM provider name
 * @property {LlmAuthMode} llmAuthMode - LLM authentication mode
 * @property {string} llmBaseUrl - LLM API base URL
 * @property {string} llmApiKey - LLM API key
 * @property {string} llmModel - LLM model name
 * @property {boolean} [llmUseCustomModel] - Whether the selected model bypasses built-in provider-specific model settings
 * @property {LlmThinkingLevel} [llmThinkingLevel] - Canonical thinking level for the exact selected built-in model
 * @property {TranslationReferenceContext} [translationContext] - Translation reference context (e.g., tweet)
 * @property {boolean} typesetDebug - Enable typeset debug logging
 * @property {boolean} eraseDebug - Enable erase debug logging
 * @property {boolean} collectDebugLog - Collect debug logs
 * @property {'paddleocr_v6_medium'} ocrEngine - OCR engine to use
 * @property {boolean} [ocrCompactActiveBatch] - Internal benchmark override; production OCR picks its batch compaction policy automatically
 * @property {('off'|'balanced')} [ocrPostFilter] - OCR false-positive post-filter mode; defaults to balanced when omitted
 * @property {'translate'|'erase'|'original'} processMode - Processing mode
 * @property {string} [diagnosticRunId] - Diagnostic run identifier
 */
export const PipelineConfig = {}

/**
 * @typedef {Object} RuntimeStageStatus
 * @property {'detector'|'bubble'|'ocr'|'inpaint'} model - Model/stage name
 * @property {boolean} enabled - Whether the stage is enabled
 * @property {('onnx'|'tesseract'|'heuristic')} [engine] - Execution engine
 * @property {('webnn'|'webgpu'|'wasm'|'cuda'|'cpu')} [provider] - Execution provider
 * @property {('gpu'|'cpu'|'default')} [webnnDeviceType] - WebNN device type
 * @property {string} detail - Human-readable status detail
 */
export const RuntimeStageStatus = {}

/**
 * @typedef {'start'|'model'|'wrap'|'both'} TypesetDebugColumnBreakReason
 */
export const TypesetDebugColumnBreakReason = {}

/**
 * @typedef {'model'|'split'} TypesetDebugColumnSegmentSource
 */
export const TypesetDebugColumnSegmentSource = {}

/**
 * @typedef {Object} TypesetDebugColumnBox
 * @property {number} x - Left coordinate
 * @property {number} y - Top coordinate
 * @property {number} width - Box width
 * @property {number} height - Box height
 */
export const TypesetDebugColumnBox = {}

/**
 * @typedef {Object} TypesetDebugGlyphCenter
 * @property {string} ch - Glyph character
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 */
export const TypesetDebugGlyphCenter = {}

/**
 * @typedef {Object} TypesetDebugVerticalItem
 * @property {string} sourceText - Original text
 * @property {string} displayText - Text as displayed
 * @property {'upright-glyph'|'sideways-run'|'tate-chu-yoko'} kind - Item kind
 * @property {'upright'|'sideways'|'transformed-upright'|'transformed-sideways'} orientation - Glyph orientation
 * @property {'U'|'R'|'Tu'|'Tr'} unicodeOrientation - Unicode orientation class
 * @property {('short-digits'|'terminal-punctuation')} [policy] - Rendering policy
 * @property {90} [rotationDeg] - Fixed rotation in degrees
 * @property {number} sourceStart - Start index in source text
 * @property {number} sourceEnd - End index in source text
 * @property {number} sourceGlyphCount - Number of source glyphs
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 * @property {number} advanceY - Vertical advance
 * @property {number} [inkWidth] - Inked width
 * @property {number} [inkHeight] - Inked height
 * @property {number} [renderInlineScale] - Inline render scale
 * @property {number} [renderCrossScale] - Cross render scale
 * @property {number} [renderOffsetX] - Horizontal render offset
 * @property {number} [renderOffsetY] - Vertical render offset
 * @property {number} [boundaryGap] - Gap to region boundary
 */
export const TypesetDebugVerticalItem = {}

/**
 * @typedef {Object} TypesetLayoutDiagnostics
 * @property {boolean} sourceGeometryProfileUsed - Whether source geometry profile was used
 * @property {number} [sourceFontSize] - Source font size
 * @property {number} [sourceAdvance] - Source advance
 * @property {number} [sourcePitch] - Source pitch
 * @property {number} [uniformScale] - Uniform scale
 * @property {number} advanceScale - Advance scale
 * @property {Array<number>} [perColumnAdvanceScales] - Per-column advance scales
 * @property {number} colSpacingScale - Column spacing scale
 * @property {number} [actualBoxScale] - Actual box scale
 * @property {boolean} useDefaultAdvanceBase - Whether default advance base was used
 * @property {number} layoutContentHeight - Layout content height
 * @property {number} renderContentHeight - Rendered content height
 * @property {('left'|'center'|'right'|'unknown')} [horizontalAlignment] - Horizontal alignment
 * @property {number} [horizontalAnchorContentCenterY] - Anchor content center Y for horizontal alignment
 * @property {Array<number>} [horizontalSafeWidths] - Safe widths per horizontal line
 * @property {Array<{left: number, right: number, source: ('mask'|'content')}>} [horizontalSafeIntervals] - Safe intervals per horizontal line
 * @property {number} [horizontalLetterSpacingScale] - Letter spacing scale
 * @property {number} [horizontalLineHeightScale] - Line height scale
 * @property {boolean} [horizontalReflowed] - Whether horizontal text was reflowed
 * @property {boolean} [horizontalSourceIdentityMatched] - Whether horizontal source identity matched
 * @property {Array<number>} [horizontalSourceLineStartXs] - Source line start X positions
 * @property {Array<number>} [horizontalSourceLineTargetWidths] - Source line target widths
 * @property {Array<number>} [horizontalSourceLineAdvanceScales] - Source line advance scales
 * @property {number} [horizontalSourceLineClampCount] - Number of clamped source lines
 * @property {Array<number>} [horizontalLineBaselines] - Horizontal line baselines
 * @property {Array<number>} [horizontalLineInkAscents] - Horizontal line ink ascents
 * @property {Array<number>} [horizontalLineInkDescents] - Horizontal line ink descents
 */
export const TypesetLayoutDiagnostics = {}

/**
 * @typedef {Object} TypesetDebugRegionLog
 * @property {string} regionId - Region identifier
 * @property {number} regionIndex - Region index
 * @property {TextDirection} direction - Text direction
 * @property {string} sourceText - Source text
 * @property {string} translatedTextRaw - Raw translated text
 * @property {string} translatedTextUsed - Translated text actually used
 * @property {Array<string>} translatedColumnsRaw - Raw translated columns
 * @property {Array<string>} preferredColumns - Preferred columns
 * @property {Array<string>} sourceColumns - Source columns
 * @property {Array<number>} sourceColumnLengths - Source column lengths
 * @property {?number} singleColumnMaxLength - Max length of a single column, or null
 * @property {number} initialFontSize - Initial font size
 * @property {number} fittedFontSize - Fitted font size
 * @property {Rect} sourceBox - Source bounding box
 * @property {Rect} expandedBox - Expanded bounding box
 * @property {Array<QuadPoint>} [sourceQuad] - Source quad points
 * @property {Array<QuadPoint>} [expandedQuad] - Expanded quad points
 * @property {number} offscreenWidth - Offscreen canvas width
 * @property {number} offscreenHeight - Offscreen canvas height
 * @property {number} boxPadding - Box padding
 * @property {number} strokePadding - Stroke padding
 * @property {Array<TypesetDebugColumnBreakReason>} columnBreakReasons - Column break reasons
 * @property {Array<number>} columnSegmentIds - Column segment identifiers
 * @property {Array<TypesetDebugColumnSegmentSource>} columnSegmentSources - Column segment sources
 * @property {TypesetLayoutDiagnostics} [layoutDiagnostics] - Layout diagnostics
 * @property {Array<TypesetDebugColumnBox>} columnBoxes - Column boxes
 * @property {Array<Array<QuadPoint>>} columnCanvasQuads - Column canvas quads
 * @property {Array<Array<TypesetDebugGlyphCenter>>} columnGlyphCenters - Column glyph centers
 * @property {Array<Array<TypesetDebugVerticalItem>>} [columnVerticalItems] - Column vertical items
 */
export const TypesetDebugRegionLog = {}

/**
 * @typedef {Object} PipelineTypesetDebugLog
 * @property {string} generatedAt - ISO timestamp of generation
 * @property {Array<TypesetDebugRegionLog>} regions - Per-region debug logs
 */
export const PipelineTypesetDebugLog = {}

/**
 * @typedef {Object} TranslationDebugInfo
 * @property {string} [llmBatchRawResponse] - Raw LLM batch response
 * @property {string} [llmBatchParseError] - LLM batch parse error
 * @property {string} [llmBatchError] - LLM batch error
 * @property {boolean} [llmBatchFailed] - Whether the LLM batch failed
 * @property {number} [llmBatchRequestedRegionCount] - Requested region count for batch
 * @property {number} [llmBatchHitRegionCount] - Regions hit by batch
 * @property {boolean} [llmFallbackUsed] - Whether per-region fallback was used
 * @property {number} [llmFallbackRegionCount] - Regions handled by fallback
 * @property {number} [llmFallbackRequestCount] - Fallback request count
 * @property {boolean} [tweetContextLengthFallback] - Whether tweet context length fallback triggered
 */
export const TranslationDebugInfo = {}

/**
 * @typedef {Object} OcrRunDebugStep
 * @property {number} step - Step index
 * @property {number} activeCount - Number of active items
 * @property {number} [batchSize] - Batch size
 * @property {boolean} [compactFallback] - Whether compaction fallback triggered
 * @property {number} durationMs - Step duration in milliseconds
 * @property {('cpu'|'gpu'|'gpu-fallback')} [postprocessMode] - Post-processing mode
 * @property {number} [postprocessMs] - Post-processing duration in milliseconds
 */
export const OcrRunDebugStep = {}

/**
 * @typedef {Object} OcrRunDebugRegionFallback
 * @property {string} regionId - Region identifier
 * @property {number} durationMs - Duration in milliseconds
 * @property {boolean} accepted - Whether the fallback result was accepted
 * @property {number} [confidence] - Decode confidence (0-1)
 * @property {string} [error] - Error message, if any
 */
export const OcrRunDebugRegionFallback = {}

/**
 * @typedef {Object} OcrRunDebugChunk
 * @property {number} chunkIndex - Chunk index
 * @property {number} chunkSize - Number of regions in the chunk
 * @property {Array<string>} regionIds - Region identifiers
 * @property {'batch'|'fallback'} decodeMode - Decode mode
 * @property {boolean} [encoderCache] - Whether encoder cache was used
 * @property {boolean} [compactActiveBatch] - Whether active batch compaction was used
 * @property {number} [encoderRunMs] - Encoder run duration in milliseconds
 * @property {number} [decoderRunMs] - Decoder run duration in milliseconds
 * @property {number} decodeAccepted - Number of accepted decodes
 * @property {number} [decodeConfidenceAvg] - Average decode confidence
 * @property {number} decodeSessionRunCount - Session run count
 * @property {number} decodeSessionRunTotalMs - Total session run duration in milliseconds
 * @property {Array<OcrRunDebugStep>} decodeSteps - Per-step debug info
 * @property {Array<OcrRunDebugRegionFallback>} fallbackRegions - Fallback region info
 */
export const OcrRunDebugChunk = {}

/**
 * @typedef {Object} PaddleOcrRegionDebug
 * @property {string} regionId - Region identifier
 * @property {TextDirection} direction - Text direction
 * @property {Rect} box - Region bounding box
 * @property {Array<number>} inputDims - Input tensor dimensions
 * @property {number} resizedWidth - Resized width fed to the model
 * @property {number} inputBytes - Input tensor byte size
 * @property {number} preprocessMs - Preprocessing duration in milliseconds
 * @property {string} [decodedText] - Decoded text
 * @property {number} [confidence] - Decode confidence (0-1)
 * @property {boolean} [accepted] - Whether the decode was accepted
 */
export const PaddleOcrRegionDebug = {}

/**
 * @typedef {Object} PaddleOcrInferenceDebug
 * @property {number} runIndex - Inference run index
 * @property {Array<string>} regionIds - Region identifiers in this run
 * @property {Array<number>} inputDims - Input tensor dimensions
 * @property {Array<number>} [outputDims] - Output tensor dimensions
 * @property {number} inputBytes - Input tensor byte size
 * @property {number} outputBytes - Output tensor byte size
 * @property {number} durationMs - Inference duration in milliseconds
 * @property {number} decodeMs - Decode duration in milliseconds
 * @property {number} [timeSteps] - Decode time steps
 * @property {number} [numClasses] - Number of character classes
 * @property {boolean} accepted - Whether results were accepted
 * @property {number} [acceptedCount] - Number of accepted regions
 * @property {number} [rejectedCount] - Number of rejected regions
 * @property {string} [text] - Decoded text
 * @property {Array<string>} [texts] - Per-region decoded texts
 * @property {number} [confidence] - Decode confidence (0-1)
 * @property {string} [error] - Error message, if any
 */
export const PaddleOcrInferenceDebug = {}

/**
 * @typedef {Object} PaddleOcrRunDebug
 * @property {string} modelName - Model name
 * @property {('webnn'|'webgpu'|'wasm'|'cuda'|'cpu')} [provider] - Execution provider
 * @property {('gpu'|'cpu'|'default')} [webnnDeviceType] - WebNN device type
 * @property {'serial'|'width-bucket'} batchMode - Batch mode
 * @property {number} [batchBucketWidth] - Width bucket size
 * @property {boolean} [coldFirstSerial] - Whether first run was cold/serial
 * @property {number} [fixedInputWidth] - Fixed input width, if any
 * @property {string} [sessionOptionsKey] - Cache key for session options
 * @property {number} inputHeight - Model input height
 * @property {number} maxInputWidth - Maximum input width
 * @property {'zero_to_one'|'minus_one_to_one'} normalize - Normalization mode
 * @property {'rgb'|'bgr'} channelOrder - Channel order
 * @property {number} modelLoadMs - Model load duration in milliseconds
 * @property {number} sessionLoadMs - Session load duration in milliseconds
 * @property {number} charsetLoadMs - Charset load duration in milliseconds
 * @property {number} preprocessTotalMs - Total preprocessing duration in milliseconds
 * @property {number} inferenceTotalMs - Total inference duration in milliseconds
 * @property {number} decodeTotalMs - Total decode duration in milliseconds
 * @property {number} inputBytesTotal - Total input bytes
 * @property {number} outputBytesTotal - Total output bytes
 * @property {number} acceptedCount - Number of accepted regions
 * @property {number} rejectedCount - Number of rejected regions
 * @property {number} missingOutputCount - Number of missing outputs
 * @property {Array<PaddleOcrRegionDebug>} regions - Per-region debug info
 * @property {Array<PaddleOcrInferenceDebug>} inferenceRuns - Per-run debug info
 * @property {number} [colorFillMs] - Color fill duration in milliseconds
 */
export const PaddleOcrRunDebug = {}

/**
 * @typedef {Object} OcrRunDebugInfo
 * @property {'autoregressive'|'ctc'} mode - Decode mode
 * @property {number} candidateCount - Number of candidate regions
 * @property {number} preparedCount - Number of prepared regions
 * @property {number} preprocessTotalMs - Total preprocessing duration in milliseconds
 * @property {Array<{regionId: string, durationMs: number}>} preprocessPerRegionMs - Per-region preprocessing durations
 * @property {number} chunkBatchSize - Chunk batch size
 * @property {Array<OcrRunDebugChunk>} chunks - Per-chunk debug info
 * @property {'none'|'batch'|'fallback'|'reuse'} colorDecodeMode - Color decode mode
 * @property {number} colorBatchSize - Color batch size
 * @property {number} colorSessionRunCount - Color session run count
 * @property {number} colorSessionRunTotalMs - Total color session run duration in milliseconds
 * @property {number} colorTotalMs - Total color decoding duration in milliseconds
 * @property {Array<OcrRunDebugRegionFallback>} colorFallbackRegions - Color fallback region info
 * @property {number} fallbackTriggerCount - Fallback trigger count
 * @property {number} totalSessionRunCount - Total session run count
 * @property {number} totalSessionRunMs - Total session run duration in milliseconds
 * @property {PaddleOcrRunDebug} [paddle] - PaddleOCR-specific debug info
 */
export const OcrRunDebugInfo = {}

/**
 * @typedef {Object} OcrPostFilterDebugVariant
 * @property {string} name - Variant name
 * @property {string} text - Variant text
 * @property {number} confidence - Variant confidence (0-1)
 * @property {boolean} accepted - Whether the variant was accepted
 */
export const OcrPostFilterDebugVariant = {}

/**
 * @typedef {'shared-kana'|'shared-multi-han'|'source-kana-overlap'|'large-high-confidence-han'|'strong-alternate-kana'} OcrPostFilterProtectionReason
 */
export const OcrPostFilterProtectionReason = {}

/**
 * @typedef {Object} OcrPostFilterDebugDecision
 * @property {string} regionId - Region identifier
 * @property {string} sourceText - Source text
 * @property {number} relativeArea - Relative area of the region
 * @property {number} aspectRatio - Region aspect ratio
 * @property {Array<OcrPostFilterDebugVariant>} variants - Candidate variants
 * @property {{maskFillRatioInQuad: number, componentCount: number, largestComponentRatio: number, boundaryPixelRatio: number}} mask - Mask analysis metrics
 * @property {boolean} eligible - Whether the region is eligible for filtering
 * @property {boolean} shouldFilter - Whether the region should be filtered
 * @property {boolean} majorityAgreement - Whether variants mostly agree
 * @property {boolean} variantScriptDrift - Whether variant scripts drift
 * @property {boolean} nonEmptyScriptDrift - Whether non-empty scripts drift
 * @property {number} originalVariantConfidence - Confidence of the original variant
 * @property {number} maskSignalCount - Mask signal count
 * @property {boolean} junkLikeSource - Whether source looks like junk
 * @property {boolean} poorConsensus - Whether consensus is poor
 * @property {OcrPostFilterProtectionReason} [protectionReason] - Protection reason, if protected
 */
export const OcrPostFilterDebugDecision = {}

/**
 * @typedef {Object} OcrPostFilterDebugInfo
 * @property {'off'|'balanced'} mode - Filter mode
 * @property {string} ruleId - Filter rule identifier
 * @property {number} candidateCount - Number of filter candidates
 * @property {number} filteredCount - Number of filtered regions
 * @property {Array<string>} filteredRegionIds - Filtered region identifiers
 * @property {Array<OcrPostFilterDebugDecision>} decisions - Per-region decisions
 * @property {number} durationMs - Filter duration in milliseconds
 * @property {('disabled'|'no-mask'|'no-candidates'|'error')} [skippedReason] - Reason the filter was skipped
 * @property {string} [error] - Error message, if any
 */
export const OcrPostFilterDebugInfo = {}

/**
 * @typedef {Object} MaskDebugLayers
 * @property {Uint8Array} refinedMask - Refined mask pixels
 * @property {Uint8Array} perRegionDilated - Per-region dilated mask pixels
 * @property {Uint8Array} globalDilated - Global dilated mask pixels
 * @property {number} scaledWidth - Mask width
 * @property {number} scaledHeight - Mask height
 */
export const MaskDebugLayers = {}

/**
 * @typedef {Object} RefineTextMaskResult
 * @property {PipelineCanvas} refinedMaskCanvas - Canvas holding the refined mask
 * @property {MaskDebugLayers} [debugLayers] - Debug mask layers
 */
export const RefineTextMaskResult = {}

/**
 * @typedef {Object} PipelineStageRegions
 * @property {Array<TextRegion>} detected - Regions after detection
 * @property {Array<TextRegion>} ocr - Regions after OCR
 * @property {Array<TextRegion>} merged - Regions after merge
 * @property {Array<TextRegion>} ordered - Regions in reading order
 */
export const PipelineStageRegions = {}

/**
 * @typedef {Object} PipelineArtifacts
 * @property {PipelineImage} original - Original input image
 * @property {Array<TextRegion>} detectedRegions - Regions after text detection
 * @property {PipelineStageRegions} stageRegions - Regions grouped by stage
 * @property {PipelineCanvas} detectionCanvas - Detection result canvas
 * @property {PipelineCanvas} ocrCanvas - OCR result canvas
 * @property {PipelineCanvas} segmentationCanvas - Segmentation result canvas, or null
 * @property {PipelineCanvas} cleanedCanvas - Cleaned (text-erased) canvas
 * @property {PipelineCanvas} resultCanvas - Final result canvas
 * @property {PipelineCanvas} debugOriginalCanvas - Debug canvas of the original image, or null
 * @property {PipelineTypesetDebugLog} typesetDebugLog - Typeset debug log, or null
 * @property {TranslationDebugInfo} translationDebug - Translation debug info, or null
 * @property {OcrRunDebugInfo} ocrDebug - OCR debug info, or null
 * @property {OcrPostFilterDebugInfo} ocrPostFilterDebug - OCR post-filter debug info, or null
 * @property {Array<RuntimeStageStatus>} runtimeStages - Runtime stage statuses
 * @property {Array<StageTiming>} stageTimings - Stage timing records
 */
export const PipelineArtifacts = {}

/**
 * @typedef {Object} StageTiming
 * @property {string} stage - Stage key
 * @property {string} label - Human-readable stage label
 * @property {number} durationMs - Stage duration in milliseconds
 */
export const StageTiming = {}

/**
 * @typedef {Object} PipelineProgress
 * @property {string} stage - Current stage key
 * @property {string} detail - Human-readable progress detail
 * @property {number} [percent] - Overall progress percent (0–100), derived from stage anchor
 */
export const PipelineProgress = {}
