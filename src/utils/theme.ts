import chalk, { Chalk } from 'chalk'
import { env } from './env.js'

export type Theme = {
  autoAccept: string
  bashBorder: string
  deepcli: string
  startupAccent: string
  claudeShimmer: string // Lighter version of deepcli color for shimmer effect
  claudeBlue_FOR_SYSTEM_SPINNER: string
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: string
  permission: string
  permissionShimmer: string // Lighter version of permission color for shimmer effect
  planMode: string
  ide: string
  promptBorder: string
  promptBorderShimmer: string // Lighter version of promptBorder color for shimmer effect
  text: string
  inverseText: string
  inactive: string
  inactiveShimmer: string // Lighter version of inactive color for shimmer effect
  subtle: string
  suggestion: string
  remember: string
  background: string
  // Semantic colors
  success: string
  error: string
  warning: string
  merged: string
  warningShimmer: string // Lighter version of warning color for shimmer effect
  // Diff colors
  diffAdded: string
  diffRemoved: string
  diffAddedDimmed: string
  diffRemovedDimmed: string
  // Word-level diff highlighting
  diffAddedWord: string
  diffRemovedWord: string
  // Agent colors
  red_FOR_SUBAGENTS_ONLY: string
  blue_FOR_SUBAGENTS_ONLY: string
  green_FOR_SUBAGENTS_ONLY: string
  yellow_FOR_SUBAGENTS_ONLY: string
  purple_FOR_SUBAGENTS_ONLY: string
  orange_FOR_SUBAGENTS_ONLY: string
  pink_FOR_SUBAGENTS_ONLY: string
  cyan_FOR_SUBAGENTS_ONLY: string
  // Grove colors
  professionalBlue: string
  // Chrome colors
  chromeYellow: string
  // TUI V2 colors
  clawd_body: string
  clawd_background: string
  userMessageBackground: string
  userMessageBackgroundHover: string
  /** Message-actions selection. Cool shift toward `suggestion` blue; distinct from default AND userMessageBackground. */
  messageActionsBackground: string
  /** Text-selection highlight background (alt-screen mouse selection). Solid
   *  bg that REPLACES the cell's bg while preserving its fg — matches native
   *  terminal selection. Previously SGR-7 inverse (swapped fg/bg per cell),
   *  which fragmented badly over syntax highlighting. */
  selectionBg: string
  bashMessageBackgroundColor: string

  memoryBackgroundColor: string
  rate_limit_fill: string
  rate_limit_empty: string
  fastMode: string
  fastModeShimmer: string
  // Brief/assistant mode label colors
  briefLabelYou: string
  briefLabelClaude: string
  // Rainbow colors for ultrathink keyword highlighting
  rainbow_red: string
  rainbow_orange: string
  rainbow_yellow: string
  rainbow_green: string
  rainbow_blue: string
  rainbow_indigo: string
  rainbow_violet: string
  rainbow_red_shimmer: string
  rainbow_orange_shimmer: string
  rainbow_yellow_shimmer: string
  rainbow_green_shimmer: string
  rainbow_blue_shimmer: string
  rainbow_indigo_shimmer: string
  rainbow_violet_shimmer: string
}

export const THEME_NAMES = [
  'dark',
  'light',
  'light-daltonized',
  'dark-daltonized',
  'light-ansi',
  'dark-ansi',
] as const

/** A renderable theme. Always resolvable to a concrete color palette. */
export type ThemeName = (typeof THEME_NAMES)[number]

export const THEME_SETTINGS = ['auto', ...THEME_NAMES] as const

/**
 * A theme preference as stored in user config. `'auto'` follows the system
 * dark/light mode and is resolved to a ThemeName at runtime.
 */
export type ThemeSetting = (typeof THEME_SETTINGS)[number]

const lightTheme: Theme = {
  autoAccept: 'rgb(0, 195, 255)', // Electric Cyan
  bashBorder: 'rgb(0, 195, 255)', // Electric Cyan
  deepcli: 'rgb(0, 195, 255)', // Electric Cyan
  startupAccent: 'rgb(0, 195, 255)', // Electric Cyan
  claudeShimmer: 'rgb(100, 215, 255)', // Lighter Cyan
  claudeBlue_FOR_SYSTEM_SPINNER: 'rgb(0, 195, 255)', 
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: 'rgb(100, 215, 255)', 
  permission: 'rgb(0, 195, 255)', 
  permissionShimmer: 'rgb(100, 215, 255)', 
  planMode: 'rgb(80, 80, 80)', // Dark gray
  ide: 'rgb(0, 195, 255)', 
  promptBorder: 'rgb(150, 150, 150)', // Clean gray
  promptBorderShimmer: 'rgb(200, 200, 200)', 
  text: 'rgb(0, 0, 0)', // Stark Black
  inverseText: 'rgb(255, 255, 255)', // Pure White
  inactive: 'rgb(120, 120, 120)', // Medium gray
  inactiveShimmer: 'rgb(160, 160, 160)', 
  subtle: 'rgb(180, 180, 180)', // Light gray
  suggestion: 'rgb(0, 195, 255)', 
  remember: 'rgb(0, 195, 255)', 
  background: 'rgb(255, 255, 255)', // Pure White
  success: 'rgb(0, 200, 80)', // Crisp Green
  error: 'rgb(220, 0, 50)', // Crisp Red
  warning: 'rgb(220, 150, 0)', // Crisp Amber
  merged: 'rgb(0, 195, 255)', // Electric Cyan
  warningShimmer: 'rgb(250, 180, 50)', 
  diffAdded: 'rgb(230, 255, 230)', 
  diffRemoved: 'rgb(255, 230, 230)', 
  diffAddedDimmed: 'rgb(245, 255, 245)', 
  diffRemovedDimmed: 'rgb(255, 245, 245)', 
  diffAddedWord: 'rgb(0, 200, 80)', 
  diffRemovedWord: 'rgb(220, 0, 50)', 
  // Agent colors
  red_FOR_SUBAGENTS_ONLY: 'rgb(220,38,38)',
  blue_FOR_SUBAGENTS_ONLY: 'rgb(37,99,235)',
  green_FOR_SUBAGENTS_ONLY: 'rgb(22,163,74)',
  yellow_FOR_SUBAGENTS_ONLY: 'rgb(202,138,4)',
  purple_FOR_SUBAGENTS_ONLY: 'rgb(147,51,234)',
  orange_FOR_SUBAGENTS_ONLY: 'rgb(234,88,12)',
  pink_FOR_SUBAGENTS_ONLY: 'rgb(219,39,119)',
  cyan_FOR_SUBAGENTS_ONLY: 'rgb(8,145,178)',
  // Grove colors
  professionalBlue: 'rgb(0, 195, 255)',
  // Chrome colors
  chromeYellow: 'rgb(251,188,4)', 
  // TUI V2 colors
  clawd_body: 'rgb(0, 195, 255)',
  clawd_background: 'rgb(255,255,255)',
  userMessageBackground: 'rgb(245, 245, 245)', // Sharp stark light gray
  userMessageBackgroundHover: 'rgb(250, 250, 250)', 
  messageActionsBackground: 'rgb(240, 240, 240)', 
  selectionBg: 'rgb(200, 235, 255)', 
  bashMessageBackgroundColor: 'rgb(250, 250, 250)',
  memoryBackgroundColor: 'rgb(245, 245, 245)',
  rate_limit_fill: 'rgb(0, 195, 255)', 
  rate_limit_empty: 'rgb(220, 220, 220)', 
  fastMode: 'rgb(0, 195, 255)', 
  fastModeShimmer: 'rgb(100, 215, 255)', 
  // Brief/assistant mode
  briefLabelYou: 'rgb(0, 0, 0)', // Black
  briefLabelClaude: 'rgb(0, 195, 255)', // Electric Cyan
  rainbow_red: 'rgb(0, 195, 255)',
  rainbow_orange: 'rgb(20, 205, 255)',
  rainbow_yellow: 'rgb(40, 215, 255)',
  rainbow_green: 'rgb(60, 225, 255)',
  rainbow_blue: 'rgb(80, 235, 255)',
  rainbow_indigo: 'rgb(100, 245, 255)',
  rainbow_violet: 'rgb(120, 255, 255)',
  rainbow_red_shimmer: 'rgb(100, 215, 255)',
  rainbow_orange_shimmer: 'rgb(120, 225, 255)',
  rainbow_yellow_shimmer: 'rgb(140, 235, 255)',
  rainbow_green_shimmer: 'rgb(160, 245, 255)',
  rainbow_blue_shimmer: 'rgb(180, 255, 255)',
  rainbow_indigo_shimmer: 'rgb(200, 255, 255)',
  rainbow_violet_shimmer: 'rgb(220, 255, 255)',
}

/**
 * Light ANSI theme using only the 16 standard ANSI colors
 * for terminals without true color support
 */
const lightAnsiTheme: Theme = {
  autoAccept: 'ansi:magenta',
  bashBorder: 'ansi:magenta',
  deepcli: 'ansi:redBright',
  startupAccent: 'ansi:greenBright',
  claudeShimmer: 'ansi:yellowBright',
  claudeBlue_FOR_SYSTEM_SPINNER: 'ansi:blue',
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: 'ansi:blueBright',
  permission: 'ansi:blue',
  permissionShimmer: 'ansi:blueBright',
  planMode: 'ansi:cyan',
  ide: 'ansi:blueBright',
  promptBorder: 'ansi:white',
  promptBorderShimmer: 'ansi:whiteBright',
  text: 'ansi:black',
  inverseText: 'ansi:white',
  inactive: 'ansi:blackBright',
  inactiveShimmer: 'ansi:white',
  subtle: 'ansi:blackBright',
  suggestion: 'ansi:blue',
  remember: 'ansi:blue',
  background: 'ansi:cyan',
  success: 'ansi:green',
  error: 'ansi:red',
  warning: 'ansi:yellow',
  merged: 'ansi:magenta',
  warningShimmer: 'ansi:yellowBright',
  diffAdded: 'ansi:green',
  diffRemoved: 'ansi:red',
  diffAddedDimmed: 'ansi:green',
  diffRemovedDimmed: 'ansi:red',
  diffAddedWord: 'ansi:greenBright',
  diffRemovedWord: 'ansi:redBright',
  // Agent colors
  red_FOR_SUBAGENTS_ONLY: 'ansi:red',
  blue_FOR_SUBAGENTS_ONLY: 'ansi:blue',
  green_FOR_SUBAGENTS_ONLY: 'ansi:green',
  yellow_FOR_SUBAGENTS_ONLY: 'ansi:yellow',
  purple_FOR_SUBAGENTS_ONLY: 'ansi:magenta',
  orange_FOR_SUBAGENTS_ONLY: 'ansi:redBright',
  pink_FOR_SUBAGENTS_ONLY: 'ansi:magentaBright',
  cyan_FOR_SUBAGENTS_ONLY: 'ansi:cyan',
  // Grove colors
  professionalBlue: 'ansi:blueBright',
  // Chrome colors
  chromeYellow: 'ansi:yellow', // Chrome yellow
  // TUI V2 colors
  clawd_body: 'ansi:greenBright',
  clawd_background: 'ansi:black',
  userMessageBackground: 'ansi:white',
  userMessageBackgroundHover: 'ansi:whiteBright',
  messageActionsBackground: 'ansi:white',
  selectionBg: 'ansi:cyan', // lighter named bg for light-ansi; dark fgs stay readable
  bashMessageBackgroundColor: 'ansi:whiteBright',

  memoryBackgroundColor: 'ansi:white',
  rate_limit_fill: 'ansi:yellow',
  rate_limit_empty: 'ansi:black',
  fastMode: 'ansi:red',
  fastModeShimmer: 'ansi:redBright',
  briefLabelYou: 'ansi:blue',
  briefLabelClaude: 'ansi:redBright',
  rainbow_red: 'ansi:red',
  rainbow_orange: 'ansi:redBright',
  rainbow_yellow: 'ansi:yellow',
  rainbow_green: 'ansi:green',
  rainbow_blue: 'ansi:cyan',
  rainbow_indigo: 'ansi:blue',
  rainbow_violet: 'ansi:magenta',
  rainbow_red_shimmer: 'ansi:redBright',
  rainbow_orange_shimmer: 'ansi:yellow',
  rainbow_yellow_shimmer: 'ansi:yellowBright',
  rainbow_green_shimmer: 'ansi:greenBright',
  rainbow_blue_shimmer: 'ansi:cyanBright',
  rainbow_indigo_shimmer: 'ansi:blueBright',
  rainbow_violet_shimmer: 'ansi:magentaBright',
}

/**
 * Dark ANSI theme using only the 16 standard ANSI colors
 * for terminals without true color support
 */
const darkAnsiTheme: Theme = {
  autoAccept: 'ansi:magentaBright',
  bashBorder: 'ansi:magentaBright',
  deepcli: 'ansi:redBright',
  startupAccent: 'ansi:greenBright',
  claudeShimmer: 'ansi:yellowBright',
  claudeBlue_FOR_SYSTEM_SPINNER: 'ansi:blueBright',
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: 'ansi:blueBright',
  permission: 'ansi:blueBright',
  permissionShimmer: 'ansi:blueBright',
  planMode: 'ansi:cyanBright',
  ide: 'ansi:blue',
  promptBorder: 'ansi:white',
  promptBorderShimmer: 'ansi:whiteBright',
  text: 'ansi:whiteBright',
  inverseText: 'ansi:black',
  inactive: 'ansi:white',
  inactiveShimmer: 'ansi:whiteBright',
  subtle: 'ansi:white',
  suggestion: 'ansi:blueBright',
  remember: 'ansi:blueBright',
  background: 'ansi:cyanBright',
  success: 'ansi:greenBright',
  error: 'ansi:redBright',
  warning: 'ansi:yellowBright',
  merged: 'ansi:magentaBright',
  warningShimmer: 'ansi:yellowBright',
  diffAdded: 'ansi:green',
  diffRemoved: 'ansi:red',
  diffAddedDimmed: 'ansi:green',
  diffRemovedDimmed: 'ansi:red',
  diffAddedWord: 'ansi:greenBright',
  diffRemovedWord: 'ansi:redBright',
  // Agent colors
  red_FOR_SUBAGENTS_ONLY: 'ansi:redBright',
  blue_FOR_SUBAGENTS_ONLY: 'ansi:blueBright',
  green_FOR_SUBAGENTS_ONLY: 'ansi:greenBright',
  yellow_FOR_SUBAGENTS_ONLY: 'ansi:yellowBright',
  purple_FOR_SUBAGENTS_ONLY: 'ansi:magentaBright',
  orange_FOR_SUBAGENTS_ONLY: 'ansi:redBright',
  pink_FOR_SUBAGENTS_ONLY: 'ansi:magentaBright',
  cyan_FOR_SUBAGENTS_ONLY: 'ansi:cyanBright',
  // Grove colors
  professionalBlue: 'rgb(106,155,204)',
  // Chrome colors
  chromeYellow: 'ansi:yellowBright', // Chrome yellow
  // TUI V2 colors
  clawd_body: 'ansi:greenBright',
  clawd_background: 'ansi:black',
  userMessageBackground: 'ansi:blackBright',
  userMessageBackgroundHover: 'ansi:white',
  messageActionsBackground: 'ansi:blackBright',
  selectionBg: 'ansi:blue', // darker named bg for dark-ansi; bright fgs stay readable
  bashMessageBackgroundColor: 'ansi:black',

  memoryBackgroundColor: 'ansi:blackBright',
  rate_limit_fill: 'ansi:yellow',
  rate_limit_empty: 'ansi:white',
  fastMode: 'ansi:redBright',
  fastModeShimmer: 'ansi:redBright',
  briefLabelYou: 'ansi:blueBright',
  briefLabelClaude: 'ansi:redBright',
  rainbow_red: 'ansi:red',
  rainbow_orange: 'ansi:redBright',
  rainbow_yellow: 'ansi:yellow',
  rainbow_green: 'ansi:green',
  rainbow_blue: 'ansi:cyan',
  rainbow_indigo: 'ansi:blue',
  rainbow_violet: 'ansi:magenta',
  rainbow_red_shimmer: 'ansi:redBright',
  rainbow_orange_shimmer: 'ansi:yellow',
  rainbow_yellow_shimmer: 'ansi:yellowBright',
  rainbow_green_shimmer: 'ansi:greenBright',
  rainbow_blue_shimmer: 'ansi:cyanBright',
  rainbow_indigo_shimmer: 'ansi:blueBright',
  rainbow_violet_shimmer: 'ansi:magentaBright',
}

/**
 * Light daltonized theme (color-blind friendly) using explicit RGB values
 * to avoid inconsistencies from users' custom terminal ANSI color definitions
 */
const lightDaltonizedTheme: Theme = {
  autoAccept: 'rgb(135,0,255)', // Electric violet
  bashBorder: 'rgb(0,102,204)', // Blue instead of pink
  deepcli: 'rgb(255,153,51)', // Orange adjusted for deuteranopia
  startupAccent: 'rgb(124,176,133)', // DeepCLI pastel green
  claudeShimmer: 'rgb(255,183,101)', // Lighter orange for shimmer effect
  claudeBlue_FOR_SYSTEM_SPINNER: 'rgb(51,102,255)', // Bright blue for system spinner
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: 'rgb(101,152,255)', // Lighter bright blue for system spinner shimmer
  permission: 'rgb(51,102,255)', // Bright blue
  permissionShimmer: 'rgb(101,152,255)', // Lighter bright blue for shimmer
  planMode: 'rgb(51,102,102)', // Muted blue-gray (works for color-blind)
  ide: 'rgb(71,130,200)', // Muted blue
  promptBorder: 'rgb(153,153,153)', // Medium gray
  promptBorderShimmer: 'rgb(183,183,183)', // Lighter gray for shimmer
  text: 'rgb(0,0,0)', // Black
  inverseText: 'rgb(255,255,255)', // White
  inactive: 'rgb(102,102,102)', // Dark gray
  inactiveShimmer: 'rgb(142,142,142)', // Lighter gray for shimmer effect
  subtle: 'rgb(175,175,175)', // Light gray
  suggestion: 'rgb(51,102,255)', // Bright blue
  remember: 'rgb(51,102,255)', // Bright blue
  background: 'rgb(0,153,153)', // Cyan (color-blind friendly)
  success: 'rgb(0,102,153)', // Blue instead of green for deuteranopia
  error: 'rgb(204,0,0)', // Pure red for better distinction
  warning: 'rgb(255,153,0)', // Orange adjusted for deuteranopia
  merged: 'rgb(135,0,255)', // Electric violet (matches autoAccept)
  warningShimmer: 'rgb(255,183,50)', // Lighter orange for shimmer
  diffAdded: 'rgb(153,204,255)', // Light blue instead of green
  diffRemoved: 'rgb(255,204,204)', // Light red
  diffAddedDimmed: 'rgb(209,231,253)', // Very light blue
  diffRemovedDimmed: 'rgb(255,233,233)', // Very light red
  diffAddedWord: 'rgb(51,102,204)', // Medium blue (less intense than deep blue)
  diffRemovedWord: 'rgb(153,51,51)', // Softer red (less intense than deep red)
  // Agent colors (daltonism-friendly)
  red_FOR_SUBAGENTS_ONLY: 'rgb(204,0,0)', // Pure red
  blue_FOR_SUBAGENTS_ONLY: 'rgb(0,102,204)', // Pure blue
  green_FOR_SUBAGENTS_ONLY: 'rgb(0,204,0)', // Pure green
  yellow_FOR_SUBAGENTS_ONLY: 'rgb(255,204,0)', // Golden yellow
  purple_FOR_SUBAGENTS_ONLY: 'rgb(128,0,128)', // True purple
  orange_FOR_SUBAGENTS_ONLY: 'rgb(255,128,0)', // True orange
  pink_FOR_SUBAGENTS_ONLY: 'rgb(255,102,178)', // Adjusted pink
  cyan_FOR_SUBAGENTS_ONLY: 'rgb(0,178,178)', // Adjusted cyan
  // Grove colors
  professionalBlue: 'rgb(106,155,204)',
  // Chrome colors
  chromeYellow: 'rgb(251,188,4)', // Chrome yellow
  // TUI V2 colors
  clawd_body: 'rgb(124,176,133)',
  clawd_background: 'rgb(0,0,0)',
  userMessageBackground: 'rgb(220, 220, 220)', // Slightly darker grey for optimal contrast
  userMessageBackgroundHover: 'rgb(232, 232, 232)', // ≥230 to quantize distinct from base at 256-color level
  messageActionsBackground: 'rgb(210, 216, 226)', // cool gray — darker than userMsg 220, slight blue
  selectionBg: 'rgb(180, 213, 255)', // light selection blue; daltonized fgs are yellows/blues, both readable on light blue
  bashMessageBackgroundColor: 'rgb(250, 245, 250)',

  memoryBackgroundColor: 'rgb(230, 245, 250)',
  rate_limit_fill: 'rgb(51,102,255)', // Bright blue
  rate_limit_empty: 'rgb(23,46,114)', // Dark blue
  fastMode: 'rgb(255,106,0)', // Electric orange (color-blind safe)
  fastModeShimmer: 'rgb(255,150,50)', // Lighter orange for shimmer
  briefLabelYou: 'rgb(37,99,235)', // Blue
  briefLabelClaude: 'rgb(255,153,51)', // Orange adjusted for deuteranopia (matches deepcli)
  rainbow_red: 'rgb(235,95,87)',
  rainbow_orange: 'rgb(245,139,87)',
  rainbow_yellow: 'rgb(250,195,95)',
  rainbow_green: 'rgb(145,200,130)',
  rainbow_blue: 'rgb(130,170,220)',
  rainbow_indigo: 'rgb(155,130,200)',
  rainbow_violet: 'rgb(200,130,180)',
  rainbow_red_shimmer: 'rgb(250,155,147)',
  rainbow_orange_shimmer: 'rgb(255,185,137)',
  rainbow_yellow_shimmer: 'rgb(255,225,155)',
  rainbow_green_shimmer: 'rgb(185,230,180)',
  rainbow_blue_shimmer: 'rgb(180,205,240)',
  rainbow_indigo_shimmer: 'rgb(195,180,230)',
  rainbow_violet_shimmer: 'rgb(230,180,210)',
}

/**
 * Dark theme using explicit RGB values to avoid inconsistencies
 * from users' custom terminal ANSI color definitions
 */
const darkTheme: Theme = {
  autoAccept: 'rgb(0, 195, 255)', // Electric Cyan
  bashBorder: 'rgb(0, 195, 255)', // Electric Cyan
  deepcli: 'rgb(0, 195, 255)', // Electric Cyan
  startupAccent: 'rgb(0, 195, 255)', // Electric Cyan
  claudeShimmer: 'rgb(100, 215, 255)', // Lighter Cyan
  claudeBlue_FOR_SYSTEM_SPINNER: 'rgb(0, 195, 255)', 
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: 'rgb(100, 215, 255)', 
  permission: 'rgb(0, 195, 255)', 
  permissionShimmer: 'rgb(100, 215, 255)', 
  planMode: 'rgb(100, 100, 100)', // Mid gray
  ide: 'rgb(0, 195, 255)', 
  promptBorder: 'rgb(80, 80, 80)', // Dark gray
  promptBorderShimmer: 'rgb(120, 120, 120)', 
  text: 'rgb(250, 250, 250)', // Stark White
  inverseText: 'rgb(0, 0, 0)', // Black
  inactive: 'rgb(140, 140, 140)', // Light gray
  inactiveShimmer: 'rgb(180, 180, 180)', 
  subtle: 'rgb(100, 100, 100)', // Medium dark gray
  suggestion: 'rgb(0, 195, 255)', 
  remember: 'rgb(0, 195, 255)', 
  background: 'rgb(0, 0, 0)', // Pure Black
  success: 'rgb(0, 200, 80)', // Crisp Green
  error: 'rgb(255, 50, 80)', // Crisp Red
  warning: 'rgb(255, 180, 0)', // Crisp Amber
  merged: 'rgb(0, 195, 255)', // Electric Cyan
  warningShimmer: 'rgb(255, 210, 50)', 
  diffAdded: 'rgb(10, 40, 20)', 
  diffRemoved: 'rgb(50, 10, 15)', 
  diffAddedDimmed: 'rgb(20, 50, 30)', 
  diffRemovedDimmed: 'rgb(60, 20, 25)', 
  diffAddedWord: 'rgb(0, 200, 80)', 
  diffRemovedWord: 'rgb(255, 50, 80)', 
  // Agent colors
  red_FOR_SUBAGENTS_ONLY: 'rgb(220,38,38)',
  blue_FOR_SUBAGENTS_ONLY: 'rgb(37,99,235)',
  green_FOR_SUBAGENTS_ONLY: 'rgb(22,163,74)',
  yellow_FOR_SUBAGENTS_ONLY: 'rgb(202,138,4)',
  purple_FOR_SUBAGENTS_ONLY: 'rgb(147,51,234)',
  orange_FOR_SUBAGENTS_ONLY: 'rgb(234,88,12)',
  pink_FOR_SUBAGENTS_ONLY: 'rgb(219,39,119)',
  cyan_FOR_SUBAGENTS_ONLY: 'rgb(8,145,178)',
  // Grove colors
  professionalBlue: 'rgb(0, 195, 255)',
  // Chrome colors
  chromeYellow: 'rgb(251,188,4)', 
  // TUI V2 colors
  clawd_body: 'rgb(0, 195, 255)',
  clawd_background: 'rgb(0,0,0)',
  userMessageBackground: 'rgb(25, 25, 25)', // Deep Graphite
  userMessageBackgroundHover: 'rgb(35, 35, 35)', 
  messageActionsBackground: 'rgb(20, 20, 20)', 
  selectionBg: 'rgb(0, 60, 100)', 
  bashMessageBackgroundColor: 'rgb(30, 30, 30)',
  memoryBackgroundColor: 'rgb(25, 25, 25)',
  rate_limit_fill: 'rgb(0, 195, 255)', 
  rate_limit_empty: 'rgb(40, 40, 40)', 
  fastMode: 'rgb(0, 195, 255)', 
  fastModeShimmer: 'rgb(100, 215, 255)', 
  // Brief/assistant mode
  briefLabelYou: 'rgb(250, 250, 250)', // Stark White
  briefLabelClaude: 'rgb(0, 195, 255)', // Electric Cyan
  rainbow_red: 'rgb(0, 195, 255)',
  rainbow_orange: 'rgb(20, 205, 255)',
  rainbow_yellow: 'rgb(40, 215, 255)',
  rainbow_green: 'rgb(60, 225, 255)',
  rainbow_blue: 'rgb(80, 235, 255)',
  rainbow_indigo: 'rgb(100, 245, 255)',
  rainbow_violet: 'rgb(120, 255, 255)',
  rainbow_red_shimmer: 'rgb(100, 215, 255)',
  rainbow_orange_shimmer: 'rgb(120, 225, 255)',
  rainbow_yellow_shimmer: 'rgb(140, 235, 255)',
  rainbow_green_shimmer: 'rgb(160, 245, 255)',
  rainbow_blue_shimmer: 'rgb(180, 255, 255)',
  rainbow_indigo_shimmer: 'rgb(200, 255, 255)',
  rainbow_violet_shimmer: 'rgb(220, 255, 255)',
}

/**
 * Dark daltonized theme (color-blind friendly) using explicit RGB values
 * to avoid inconsistencies from users' custom terminal ANSI color definitions
 */
const darkDaltonizedTheme: Theme = {
  autoAccept: 'rgb(175,135,255)', // Electric violet
  bashBorder: 'rgb(51,153,255)', // Bright blue
  deepcli: 'rgb(255,153,51)', // Orange adjusted for deuteranopia
  startupAccent: 'rgb(184,225,174)', // DeepCLI pastel green
  claudeShimmer: 'rgb(255,183,101)', // Lighter orange for shimmer effect
  claudeBlue_FOR_SYSTEM_SPINNER: 'rgb(153,204,255)', // Light blue for system spinner
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: 'rgb(183,224,255)', // Lighter blue for system spinner shimmer
  permission: 'rgb(153,204,255)', // Light blue
  permissionShimmer: 'rgb(183,224,255)', // Lighter blue for shimmer
  planMode: 'rgb(102,153,153)', // Muted gray-teal (works for color-blind)
  ide: 'rgb(71,130,200)', // Muted blue
  promptBorder: 'rgb(136,136,136)', // Medium gray
  promptBorderShimmer: 'rgb(166,166,166)', // Lighter gray for shimmer
  text: 'rgb(255,255,255)', // White
  inverseText: 'rgb(0,0,0)', // Black
  inactive: 'rgb(153,153,153)', // Light gray
  inactiveShimmer: 'rgb(193,193,193)', // Lighter gray for shimmer effect
  subtle: 'rgb(80,80,80)', // Dark gray
  suggestion: 'rgb(153,204,255)', // Light blue
  remember: 'rgb(153,204,255)', // Light blue
  background: 'rgb(0,204,204)', // Bright cyan (color-blind friendly)
  success: 'rgb(51,153,255)', // Blue instead of green
  error: 'rgb(255,102,102)', // Bright red
  warning: 'rgb(255,204,0)', // Yellow-orange for deuteranopia
  merged: 'rgb(175,135,255)', // Electric violet (matches autoAccept)
  warningShimmer: 'rgb(255,234,50)', // Lighter yellow-orange for shimmer
  diffAdded: 'rgb(0,68,102)', // Dark blue
  diffRemoved: 'rgb(102,0,0)', // Dark red
  diffAddedDimmed: 'rgb(62,81,91)', // Dimmed blue
  diffRemovedDimmed: 'rgb(62,44,44)', // Dimmed red
  diffAddedWord: 'rgb(0,119,179)', // Medium blue
  diffRemovedWord: 'rgb(179,0,0)', // Medium red
  // Agent colors (daltonism-friendly, dark mode)
  red_FOR_SUBAGENTS_ONLY: 'rgb(255,102,102)', // Bright red
  blue_FOR_SUBAGENTS_ONLY: 'rgb(102,178,255)', // Bright blue
  green_FOR_SUBAGENTS_ONLY: 'rgb(102,255,102)', // Bright green
  yellow_FOR_SUBAGENTS_ONLY: 'rgb(255,255,102)', // Bright yellow
  purple_FOR_SUBAGENTS_ONLY: 'rgb(178,102,255)', // Bright purple
  orange_FOR_SUBAGENTS_ONLY: 'rgb(255,178,102)', // Bright orange
  pink_FOR_SUBAGENTS_ONLY: 'rgb(255,153,204)', // Bright pink
  cyan_FOR_SUBAGENTS_ONLY: 'rgb(102,204,204)', // Bright cyan
  // Grove colors
  professionalBlue: 'rgb(106,155,204)',
  // Chrome colors
  chromeYellow: 'rgb(251,188,4)', // Chrome yellow
  // TUI V2 colors
  clawd_body: 'rgb(184,225,174)',
  clawd_background: 'rgb(0,0,0)',
  userMessageBackground: 'rgb(55, 55, 55)', // Lighter grey for better visual contrast
  userMessageBackgroundHover: 'rgb(70, 70, 70)',
  messageActionsBackground: 'rgb(44, 50, 62)', // cool gray, slight blue
  selectionBg: 'rgb(38, 79, 120)', // classic dark-mode selection blue (VS Code dark default); light fgs stay readable
  bashMessageBackgroundColor: 'rgb(65, 60, 65)',

  memoryBackgroundColor: 'rgb(55, 65, 70)',
  rate_limit_fill: 'rgb(153,204,255)', // Light blue
  rate_limit_empty: 'rgb(69,92,115)', // Dark blue
  fastMode: 'rgb(255,120,20)', // Electric orange for dark bg (color-blind safe)
  fastModeShimmer: 'rgb(255,165,70)', // Lighter orange for shimmer
  briefLabelYou: 'rgb(122,180,232)', // Light blue
  briefLabelClaude: 'rgb(255,153,51)', // Orange adjusted for deuteranopia (matches deepcli)
  rainbow_red: 'rgb(235,95,87)',
  rainbow_orange: 'rgb(245,139,87)',
  rainbow_yellow: 'rgb(250,195,95)',
  rainbow_green: 'rgb(145,200,130)',
  rainbow_blue: 'rgb(130,170,220)',
  rainbow_indigo: 'rgb(155,130,200)',
  rainbow_violet: 'rgb(200,130,180)',
  rainbow_red_shimmer: 'rgb(250,155,147)',
  rainbow_orange_shimmer: 'rgb(255,185,137)',
  rainbow_yellow_shimmer: 'rgb(255,225,155)',
  rainbow_green_shimmer: 'rgb(185,230,180)',
  rainbow_blue_shimmer: 'rgb(180,205,240)',
  rainbow_indigo_shimmer: 'rgb(195,180,230)',
  rainbow_violet_shimmer: 'rgb(230,180,210)',
}

export function getTheme(themeName: ThemeName): Theme {
  switch (themeName) {
    case 'light':
      return lightTheme
    case 'light-ansi':
      return lightAnsiTheme
    case 'dark-ansi':
      return darkAnsiTheme
    case 'light-daltonized':
      return lightDaltonizedTheme
    case 'dark-daltonized':
      return darkDaltonizedTheme
    default:
      return darkTheme
  }
}

// Create a chalk instance with 256-color level for Apple Terminal
// Apple Terminal doesn't handle 24-bit color escape sequences well
const chalkForChart =
  env.terminal === 'Apple_Terminal'
    ? new Chalk({ level: 2 }) // 256 colors
    : chalk

/**
 * Converts a theme color to an ANSI escape sequence for use with asciichart.
 * Uses chalk to generate the escape codes, with 256-color mode for Apple Terminal.
 */
export function themeColorToAnsi(themeColor: string): string {
  const rgbMatch = themeColor.match(/rgb\(\s?(\d+),\s?(\d+),\s?(\d+)\s?\)/)
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]!, 10)
    const g = parseInt(rgbMatch[2]!, 10)
    const b = parseInt(rgbMatch[3]!, 10)
    // Use chalk.rgb which auto-converts to 256 colors when level is 2
    // Extract just the opening escape sequence by using a marker
    const colored = chalkForChart.rgb(r, g, b)('X')
    return colored.slice(0, colored.indexOf('X'))
  }
  // Fallback to magenta if parsing fails
  return '\x1b[35m'
}
