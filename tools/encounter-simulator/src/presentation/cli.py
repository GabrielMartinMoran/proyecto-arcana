"""Command-line interface for the encounter simulator"""

import argparse
from typing import Literal

from ..domain.models import EncounterConfiguration

DifficultyLevel = Literal["Fácil", "Normal", "Difícil", "Épico"]


class CLI:
    """Handles command-line argument parsing"""

    @staticmethod
    def parse_arguments() -> EncounterConfiguration:
        """
        Parse command-line arguments.

        Returns:
            EncounterConfiguration with validated parameters
        """
        parser = argparse.ArgumentParser(
            description="ARCANA Combat Encounter Simulator - Generate playtesting data and balance analysis",
            formatter_class=argparse.RawDescriptionHelpFormatter,
            epilog="""
Examples:
  %(prog)s --enemies "Goblin:4,Orco:1" --difficulty "Normal"
  %(prog)s --enemies "Lobo:6" --difficulty "Fácil"
  %(prog)s --enemies "Dragón Joven:1" --difficulty "Épico"
            """,
        )

        parser.add_argument(
            "--enemies",
            type=str,
            required=True,
            help='Enemies in format "CreatureName:Quantity,CreatureName:Quantity". Example: "Goblin:4,Orco:1"',
        )

        parser.add_argument(
            "--difficulty",
            type=str,
            required=True,
            choices=["Fácil", "Normal", "Difícil", "Épico"],
            help="Encounter difficulty level for party creation",
        )

        args = parser.parse_args()

        # Validate enemies format
        CLI._validate_enemies_format(args.enemies)

        return EncounterConfiguration(
            enemies_list=args.enemies, encounter_difficulty=args.difficulty
        )

    @staticmethod
    def _validate_enemies_format(enemies: str) -> None:
        """
        Validate the enemies parameter format.

        Args:
            enemies: Enemies string to validate

        Raises:
            ValueError: If format is invalid
        """
        if not enemies or not enemies.strip():
            raise ValueError("Enemies parameter cannot be empty")

        parts = enemies.split(",")
        for part in parts:
            if ":" not in part:
                raise ValueError(
                    f"Invalid enemy format: '{part}'. Expected format: 'CreatureName:Quantity'"
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
