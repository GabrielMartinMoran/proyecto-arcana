"""Dice roller implementation with exploding dice support"""

import random
import re
from typing import List, Tuple


class DiceRollResult:
    """Represents the result of a dice roll"""

    def __init__(self, total: int, breakdown: str):
        self.total = total
        self.breakdown = breakdown

    def __str__(self) -> str:
        return f"{self.total} ({self.breakdown})"


class DiceRoller:
    """
    Handles dice rolling with exploding dice notation.
    Format: XdYe[+Z]...
    The 'e' indicates the die explodes on max value
    """

    DICE_PATTERN = re.compile(r"(\d+)d(\d+)(e)?")
    MODIFIER_PATTERN = re.compile(r"([+-]\d+)")

    @staticmethod
    def roll(formula: str) -> DiceRollResult:
        """
        Parse and execute a dice roll formula.

        Args:
            formula: Dice formula like "1d6e+3" or "2d10e+1d4"

        Returns:
            DiceRollResult with total and breakdown
        """
        formula = formula.replace(" ", "").lower()
        total = 0
        breakdown_parts: List[str] = []

        # Track position to handle all parts in order
        processed_positions: set = set()

        # Find all dice rolls
        for match in DiceRoller.DICE_PATTERN.finditer(formula):
            num_dice = int(match.group(1))
            die_size = int(match.group(2))
            exploding = match.group(3) == "e"

            roll_result, roll_breakdown = DiceRoller._roll_dice(
                num_dice, die_size, exploding
            )

            total += roll_result
            dice_notation = f"{num_dice}d{die_size}{'e' if exploding else ''}"
            breakdown_parts.append(f"{dice_notation} [{roll_breakdown}]")

            # Mark positions as processed
            for i in range(match.start(), match.end()):
                processed_positions.add(i)

        # Find all modifiers (numbers with +/-)
        for match in DiceRoller.MODIFIER_PATTERN.finditer(formula):
            # Skip if this overlaps with a dice roll
            if match.start() in processed_positions:
                continue

            modifier = int(match.group(1))
            total += modifier
            breakdown_parts.append(str(modifier))

            for i in range(match.start(), match.end()):
                processed_positions.add(i)

        breakdown = " + ".join(breakdown_parts)
        return DiceRollResult(total, breakdown)

    @staticmethod
    def _roll_dice(num_dice: int, die_size: int, exploding: bool) -> Tuple[int, str]:
        """
        Roll dice with optional exploding mechanics.

        Args:
            num_dice: Number of dice to roll
            die_size: Size of each die
            exploding: Whether dice explode on max value

        Returns:
            Tuple of (total, breakdown_string)
        """
        results: List[str] = []
        total = 0

        for _ in range(num_dice):
            die_total = 0
            die_results: List[int] = []

            while True:
                roll = random.randint(1, die_size)
                die_results.append(roll)
                die_total += roll

                # Check for explosion
                if exploding and roll == die_size:
                    continue  # Roll again
                else:
                    break  # Stop rolling this die

            total += die_total

            # Format with explosion indicator
            if len(die_results) > 1:  # Exploded at least once
                formatted_results = []
                for i, roll_val in enumerate(die_results):
                    if i < len(die_results) - 1 and roll_val == die_size:
                        formatted_results.append(f"{roll_val}💥")
                    else:
                        formatted_results.append(str(roll_val))
                results.append(" + ".join(formatted_results))
            else:
                results.append(str(die_results[0]))

        breakdown = ", ".join(results) if num_dice > 1 else results[0]
        return total, breakdown
