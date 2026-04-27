/**
 * Debug utilities for character loading issues
 */

import { useAppStore } from '../store/useAppStore';
import { CHARACTERS, DEFAULT_CHARACTER_ID } from '../config/characters';

/**
 * Reset character to default (Haru) if there's an issue
 */
export function resetCharacterToDefault() {
  const store = useAppStore.getState();
  console.log('[Debug] Current character:', store.character);
  console.log('[Debug] Resetting to default:', DEFAULT_CHARACTER_ID);
  store.setCharacter(DEFAULT_CHARACTER_ID);
  window.location.reload();
}

/**
 * Check if all character files exist
 */
export async function validateCharacterFiles(characterId: string) {
  const character = CHARACTERS[characterId];
  if (!character) {
    console.error(`[Debug] Character "${characterId}" not found in registry`);
    return false;
  }

  console.log(`[Debug] Validating character: ${character.label} (${character.id})`);
  console.log(`[Debug] Model path: ${character.modelPath}`);

  try {
    const response = await fetch(character.modelPath);
    if (!response.ok) {
      console.error(`[Debug] Failed to fetch model3.json: ${response.status} ${response.statusText}`);
      return false;
    }
    const modelData = await response.json();
    console.log('[Debug] Model3.json loaded successfully:', modelData);
    
    // Check if required files exist
    const basePath = character.modelPath.substring(0, character.modelPath.lastIndexOf('/'));
    const filesToCheck = [
      modelData.FileReferences.Moc,
      ...(modelData.FileReferences.Textures || []),
    ];

    for (const file of filesToCheck) {
      const filePath = `${basePath}/${file}`;
      console.log(`[Debug] Checking file: ${filePath}`);
      const fileResponse = await fetch(filePath, { method: 'HEAD' });
      if (!fileResponse.ok) {
        console.error(`[Debug] Missing file: ${filePath}`);
        return false;
      }
    }

    console.log('[Debug] All character files validated successfully');
    return true;
  } catch (error) {
    console.error('[Debug] Validation error:', error);
    return false;
  }
}

/**
 * List all available characters
 */
export function listCharacters() {
  console.log('[Debug] Available characters:');
  Object.values(CHARACTERS).forEach(char => {
    console.log(`  - ${char.label} (${char.id}): ${char.modelPath}`);
  });
}

// Expose to window for easy console access
if (typeof window !== 'undefined') {
  (window as any).debugCharacter = {
    reset: resetCharacterToDefault,
    validate: validateCharacterFiles,
    list: listCharacters,
    getCurrentCharacter: () => useAppStore.getState().character,
    setCharacter: (id: string) => {
      useAppStore.getState().setCharacter(id);
      window.location.reload();
    },
  };
  console.log('💡 Debug tools available: window.debugCharacter');
  console.log('   - debugCharacter.list() - List all characters');
  console.log('   - debugCharacter.getCurrentCharacter() - Get current character');
  console.log('   - debugCharacter.setCharacter("haru") - Switch character');
  console.log('   - debugCharacter.validate("ren_pro") - Validate character files');
  console.log('   - debugCharacter.reset() - Reset to default character');
}
