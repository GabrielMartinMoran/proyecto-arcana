"""Interactive input prompts for the encounter simulator"""

from typing import Literal, Optional

from ..domain.models import EncounterConfiguration

DifficultyLevel = Literal["Fácil", "Normal", "Difícil", "Épico"]


class InteractiveInput:
    """Handles interactive user input via prompts"""

    @staticmethod
    def get_encounter_configuration() -> EncounterConfiguration:
        """
        Prompt user for all encounter configuration interactively.

        Returns:
            EncounterConfiguration with user inputs
        """
        print("\n" + "=" * 60)
        print("  ARCANA COMBAT ENCOUNTER SIMULATOR - CONFIGURATION")
        print("=" * 60 + "\n")

        # Get enemies
        enemies_list = InteractiveInput._get_enemies()

        # Get difficulty
        difficulty = InteractiveInput._get_difficulty()

        # Get character preferences
        character_preferences = InteractiveInput._get_character_preferences()

        return EncounterConfiguration(
            enemies_list=enemies_list,
            encounter_difficulty=difficulty,
            character_preferences=character_preferences,
        )

    @staticmethod
    def _get_enemies() -> str:
        """
        Prompt user to enter enemies.

        Returns:
            Comma-separated string of enemies in format "Name:Qty,Name:Qty"
        """
        print("📋 ENEMY CONFIGURATION")
        print("-" * 60)
        print("Enter enemies in format: CreatureName:Quantity")
        print("For multiple enemy types, separate with commas")
        print("\nExamples:")
        print("  • Goblin:4")
        print("  • Goblin:4,Orco:1")
        print("  • Lobo:6,Oso:2")
        print()

        while True:
            enemies = input("Enemies ➤ ").strip()

            if not enemies:
                print("❌ Enemies cannot be empty. Please try again.\n")
                continue

            # Validate format
            try:
                InteractiveInput._validate_enemies_format(enemies)
                print("✓ Enemies validated successfully\n")
                return enemies
            except ValueError as e:
                print(f"❌ {str(e)}")
                print("Please try again.\n")

    @staticmethod
    def _validate_enemies_format(enemies: str) -> None:
        """Validate enemies format"""
        parts = enemies.split(",")
        for part in parts:
            if ":" not in part:
                raise ValueError(
                    f"Invalid format: '{part}'. Expected 'CreatureName:Quantity'"
                )

            creature, quantity = part.split(":", 1)

            if not creature.strip():
                raise ValueError(f"Creature name cannot be empty in: '{part}'")

            try:
                qty = int(quantity.strip())
                if qty <= 0:
                    raise ValueError(f"Quantity must be positive in: '{part}'")
            except ValueError:
                raise ValueError(
                    f"Invalid quantity in: '{part}'. Must be a positive integer"
                )

    @staticmethod
    def _get_difficulty() -> DifficultyLevel:
        """
        Prompt user to select difficulty level.

        Returns:
            Selected difficulty level
        """
        print("⚔️  DIFFICULTY LEVEL")
        print("-" * 60)
        print("Select the encounter difficulty for party generation:")
        print()
        print("  1. Fácil   - Easy encounter, low challenge")
        print("  2. Normal  - Balanced encounter, moderate challenge")
        print("  3. Difícil - Hard encounter, high challenge")
        print("  4. Épico   - Epic encounter, extreme challenge")
        print()

        difficulty_map = {"1": "Fácil", "2": "Normal", "3": "Difícil", "4": "Épico"}

        while True:
            choice = input("Select difficulty [1-4] ➤ ").strip()

            if choice in difficulty_map:
                selected = difficulty_map[choice]
                print(f"✓ Difficulty set to: {selected}\n")
                return selected
            else:
                print("❌ Invalid choice. Please enter a number between 1 and 4.\n")

    @staticmethod
    def _get_character_preferences() -> Optional[str]:
        """
        Prompt user for character preferences/customizations.

        Returns:
            User preferences as string, or None if no preferences
        """
        print("👥 CHARACTER PREFERENCES (Optional)")
        print("-" * 60)
        print("You can specify preferences for the generated party:")
        print()
        print("Examples:")
        print("  • Include a healer and a tank")
        print("  • All ranged attackers")
        print("  • Focus on high mobility characters")
        print("  • Include at least one spellcaster with area damage")
        print("  • No magic users, only martial characters")
        print()
        print("Press ENTER to skip (auto-generate balanced party)")
        print()

        preferences = input("Character preferences ➤ ").strip()

        if preferences:
            print("✓ Preferences recorded\n")
            return preferences
        else:
            print("✓ No preferences, auto-generating balanced party\n")
            return None

    @staticmethod
    def confirm_configuration(config: EncounterConfiguration) -> bool:
        """
        Display configuration and ask for confirmation.

        Args:
            config: The configuration to confirm

        Returns:
            True if user confirms, False otherwise
        """
        print("\n" + "=" * 60)
        print("  CONFIGURATION SUMMARY")
        print("=" * 60)
        print(f"\n📋 Enemies: {config.enemies_list}")
        print(f"⚔️  Difficulty: {config.encounter_difficulty}")

        if config.character_preferences:
            print(f"👥 Character Preferences: {config.character_preferences}")
        else:
            print("👥 Character Preferences: Auto-generate balanced party")

        print("\n" + "-" * 60)

        while True:
            response = (
                input("\nProceed with this configuration? [Y/n] ➤ ").strip().lower()
            )

            if response in ("", "y", "yes"):
                return True
            elif response in ("n", "no"):
                return False
            else:
                print("❌ Please enter 'y' for yes or 'n' for no.")
