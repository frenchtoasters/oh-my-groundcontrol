import * as fs from 'node:fs';
import * as path from 'node:path';
import { createContractorAgent } from '../src/agents/contractor';
import { createDesignerAgent } from '../src/agents/designer';
import { createExplorerAgent } from '../src/agents/explorer';
import { createFixerAgent } from '../src/agents/fixer';
import { createGroundcontrolAgent } from '../src/agents/groundcontrol';
import { createLibrarianAgent } from '../src/agents/librarian';
import { createOracleAgent } from '../src/agents/oracle';
import { createOrchestratorAgent } from '../src/agents/orchestrator';
import { createPreFlightAgent } from '../src/agents/pre-flight';
import { createVerificationAgent } from '../src/agents/verification';

const defaultModel = 'gemini-3.1-pro-preview';

const agents = [
  { name: 'contractor', def: createContractorAgent(defaultModel) },
  { name: 'designer', def: createDesignerAgent(defaultModel) },
  { name: 'explorer', def: createExplorerAgent(defaultModel) },
  { name: 'fixer', def: createFixerAgent(defaultModel) },
  { name: 'groundcontrol', def: createGroundcontrolAgent(defaultModel) },
  { name: 'librarian', def: createLibrarianAgent(defaultModel) },
  { name: 'oracle', def: createOracleAgent(defaultModel) },
  { name: 'orchestrator', def: createOrchestratorAgent(defaultModel) },
  { name: 'pre-flight', def: createPreFlightAgent(defaultModel) },
  { name: 'verification', def: createVerificationAgent(defaultModel) },
];

const outputDir = path.join(__dirname, '..', 'gepa-tuning', 'data');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const prompts = agents.map((a) => {
  const promptText = a.def.config.prompt || '';
  if (!promptText) {
    console.warn(`Warning: Extracted empty prompt for agent '${a.name}'`);
  }
  return {
    agent_name: a.name,
    prompt: promptText,
  };
});

const outputPath = path.join(outputDir, 'seed_prompts.json');
fs.writeFileSync(outputPath, JSON.stringify(prompts, null, 2), 'utf-8');
console.log(
  `Successfully extracted ${prompts.length} agent prompts to ${outputPath}`,
);
