import type { GameCommand } from '../game/CommandExecutor';

export class LLMResponseInterpreter {
  /**
   * Parse a raw LLM response and extract valid GameCommands.
   * This assumes the LLM is asked to return a JSON array of commands.
   */
  static toCommands(responseText: string): GameCommand[] {
    let parsed: unknown;

    try {
      // Attempt to find and parse the first JSON array in the response
      const jsonMatch = responseText.match(/\[.*\]/s);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response.');
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('❌ Failed to parse LLM response:', e, responseText);
      return [];
    }

    if (!Array.isArray(parsed)) {
      console.error('❌ Parsed response is not an array:', parsed);
      return [];
    }

    // Filter and validate commands
    const valid: GameCommand[] = [];
    for (const cmd of parsed) {
      if (!cmd || typeof cmd !== 'object') continue;

      const { type } = cmd as { type: string };

      if (type === 'move' && 'animalId' in cmd && 'x' in cmd && 'y' in cmd) {
        valid.push(cmd as GameCommand);
      } else if (type === 'spawn' && 'animalId' in cmd) {
        valid.push(cmd as GameCommand);
      } else if (type === 'capture' && 'biomeId' in cmd) {
        valid.push(cmd as GameCommand);
      } else if (type === 'harvest' && 'x' in cmd && 'y' in cmd) {
        valid.push({
          ...cmd,
          amount: cmd.amount ?? 3 // fallback to default
        } as GameCommand);
      } else {
        console.warn('⚠️ Skipping invalid command:', cmd);
      }
    }

    return valid;
  }
} 