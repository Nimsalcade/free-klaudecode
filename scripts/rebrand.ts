import fs from 'fs';
import path from 'path';

const TARGET_DIR = path.resolve(__dirname, '../src');
const OTHER_DIRS = [
  path.resolve(__dirname, '../package.json'),
  path.resolve(__dirname, '../README.md'),
  path.resolve(__dirname, '../run-deepseek.sh')
];

// Patterns we explicitly DO NOT want to change to prevent breaking the code
const IGNORE_PATTERNS = [
  /@anthropic-ai/i,
  /api\.anthropic\.com/i,
  /claude\.ai/i,
  /claude-3-/i,
  /anthropic_api_key/i,
  /anthropic\.message/i,
  /anthropic\.beta/i,
];

function shouldIgnoreLine(line: string): boolean {
  for (const pattern of IGNORE_PATTERNS) {
    if (pattern.test(line)) {
      return true;
    }
  }
  return false;
}

const REPLACEMENTS = [
  // Exact names
  { regex: /\bClaude Code\b/g, replace: 'DeepCLI' },
  { regex: /\bFree Code\b/g, replace: 'DeepCLI' },
  { regex: /\bfree-klaudecode\b/g, replace: 'deepcli' },
  { regex: /\bklaudecode\b/g, replace: 'deepcli' },
  
  // Environment variables
  { regex: /\bCLAUDE_CODE_/g, replace: 'DEEPCLI_' },
  { regex: /\bCLAUDE_/g, replace: 'DEEPCLI_' },

  // Codenames
  { regex: /\bTengu\b/g, replace: 'Agent' },
  { regex: /\btengu\b/g, replace: 'agent' },

  // Generic Claude replacements
  { regex: /\bClaude\b/g, replace: 'DeepCLI' },
  { regex: /\bclaude\b/g, replace: 'deepcli' },

  // Missed camelCase and compound words
  { regex: /claudeInChrome/g, replace: 'deepcliInChrome' },
  { regex: /claudeAiLimits/g, replace: 'deepcliAiLimits' },
  { regex: /claudeApi/g, replace: 'deepcliApi' },
  { regex: /claudemd/g, replace: 'deepclimd' },
  { regex: /good-claude/g, replace: 'good-deepcli' },
  { regex: /claude_code/g, replace: 'deepcli_code' },
  { regex: /claudeai/g, replace: 'deepcliAi' },
  { regex: /claudeCodeGuideAgent/g, replace: 'deepcliCodeGuideAgent' },
  { regex: /claudeCodeHints/g, replace: 'deepcliCodeHints' },
  { regex: /ClaudeMdExternalIncludesDialog/g, replace: 'DeepCLIMdExternalIncludesDialog' },
  { regex: /ClaudeInChromeOnboarding/g, replace: 'DeepCLIInChromeOnboarding' },
  { regex: /usePromptsFromClaudeInChrome/g, replace: 'usePromptsFromDeepCLIInChrome' },
  { regex: /useClaudeCodeHintRecommendation/g, replace: 'useDeepCLICodeHintRecommendation' },
  { regex: /ClaudeCodeHint/g, replace: 'DeepCLICodeHint' },
  { regex: /claudeai/g, replace: 'deepcliai' },
  
  // Documentation URLs
  { regex: /code\.claude\.com/g, replace: 'docs.deepcli.dev' },
  { regex: /code\.deepcli\.com/g, replace: 'docs.deepcli.dev' },
  
  // Anthropic replacements (only if it doesn't match an ignore pattern, handled per-line)
  { regex: /\bAnthropic\b/g, replace: 'NexusAI' },
  { regex: /\banthropic\b/g, replace: 'nexusai' },
  
  // Config directory mapping
  { regex: /\~\/\.claude/g, replace: '~/.deepcli' },
  { regex: /\.claude\//g, replace: '.deepcli/' }
];

function processFile(filePath: string) {
  if (filePath.includes('node_modules') || filePath.includes('.git')) return;
  if (!fs.existsSync(filePath)) return;
  
  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    const files = fs.readdirSync(filePath);
    for (const file of files) {
      processFile(path.join(filePath, file));
    }
    return;
  }
  
  if (!filePath.match(/\.(ts|tsx|md|json|sh|js)$/)) return;

  const originalContent = fs.readFileSync(filePath, 'utf-8');
  const lines = originalContent.split('\n');
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    const originalLine = lines[i];
    if (shouldIgnoreLine(originalLine)) {
      continue;
    }

    let modifiedLine = originalLine;
    for (const { regex, replace } of REPLACEMENTS) {
      if (modifiedLine.match(regex)) {
        modifiedLine = modifiedLine.replace(regex, replace);
      }
    }

    if (modifiedLine !== originalLine) {
      lines[i] = modifiedLine;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    console.log(`Updated: ${path.relative(__dirname, filePath)}`);
  }
}

console.log('Starting rebrand...');
processFile(TARGET_DIR);
for (const file of OTHER_DIRS) {
  processFile(file);
}
console.log('Done!');
