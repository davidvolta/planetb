import type { GameState } from '../store/gameStore';
import type { GameCommand } from '../game/CommandExecutor';
import { PromptBuilder } from './PromptBuilder';
import { OpenAIClient } from './OpenAIClient';
import { LLMResponseInterpreter } from './LLMInterpreter';
import { AIController } from '../controllers/AIController';
import { canExecuteCommand } from '../utils/canExecuteCommand';

export class LLMClient {
  static async requestStrategy(state: GameState, playerId: number): Promise<GameCommand[]> {
    const userPrompt = PromptBuilder.buildPrompt(state, playerId);

    const systemPrompt = `
YYou are an AI player in a turn-based 4X tile strategy game.
Your role is to generate a list of commands for your units this turn.

Use only this format — a JSON array of objects:
[
  { "type": "move", "animalId": "...", "x": ..., "y": ... },
  { "type": "spawn", "animalId": "..." },
  { "type": "capture", "biomeId": "..." },
  { "type": "harvest", "x": ..., "y": ..., "amount": 3 }
]

Rules:
- Only use animals owned by the current player
- Only move animals that haven’t moved this turn
- Only capture a biome if an animal is standing on the biome’s habitat tile
- Only harvest tiles with resources remaining
- Only spawn eggs owned by the player and located in lush biomes (lushness >= 9)

- DO Try to capture as many biomes as possible.
- DO Try to move your animals to capture biomes.
- DO Spawn your eggs as much as possible in the early game so you can capture biomes later.

- Do NOT return anything but valid JSON. No explanations. No markdown.
- Do NOT occupy your own habitat tile with an animal.
- Do NOT leave a unit unmoved.

`;

    console.groupCollapsed('📤 LLM PROMPT SENT');
    console.log(systemPrompt.trim());
    console.log(userPrompt);
    console.groupEnd();

    const response = await OpenAIClient.chatCompletion({
      model: 'gpt-3.5-turbo',
      //model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });

    const commands = LLMResponseInterpreter.toCommands(response.content);
    const legalCommands = commands.filter(c => canExecuteCommand(c, state, playerId));

    console.groupCollapsed('🤖 LLM FINAL COMMANDS');
    console.log('✅ All commands:', commands);
    console.log('🛡️ Legal commands:', legalCommands);
    console.groupEnd();

    if (commands.length > 0 && legalCommands.length < commands.length) {
        console.warn('⚠️ Some LLM commands were invalid and filtered out:');
      console.table(commands.map((c, i) => ({
        ...c,
        valid: canExecuteCommand(c, state, playerId)
      })));
    }

    if (legalCommands.length === 0) {
      console.warn('⚠️ LLM returned no valid commands — falling back to AIController');
      const fallbackAI = new AIController(state, playerId);
      return fallbackAI.generateCommands();
    }
    return legalCommands;

  }
}
