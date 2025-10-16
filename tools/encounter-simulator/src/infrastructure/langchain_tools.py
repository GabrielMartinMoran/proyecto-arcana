"""LangChain tools for the combat simulator"""

from typing import Type

from langchain.tools import BaseTool
from pydantic import BaseModel, Field

from ..domain.dice_roller import DiceRoller


class DiceRollerInput(BaseModel):
    """Input schema for the dice roller tool"""

    formula: str = Field(
        description="Dice roll formula in format XdYe[+Z], e.g., '1d6e+3' or '2d10e+1d4'"
    )


class DiceRollerTool(BaseTool):
    """
    LangChain tool for rolling dice with exploding dice support.

    The 'e' suffix indicates the die explodes (re-rolls on max value).
    """

    name: str = "dice_roller"
    description: str = (
        "Rolls dice using the formula XdYe[+Z]... where X is number of dice, "
        "Y is die size, 'e' means exploding (re-roll on max), and Z are modifiers. "
        "Example: dice_roller('1d6e+3') or dice_roller('2d10e+1d4'). "
        "Returns formatted result like '19 (1d6e [6💥 + 6💥 + 5] + 3)'"
    )
    args_schema: Type[BaseModel] = DiceRollerInput

    def _run(self, formula: str) -> str:
        """
        Execute the dice roll.

        Args:
            formula: Dice formula string

        Returns:
            Formatted result string
        """
        try:
            result = DiceRoller.roll(formula)
            return str(result)
        except Exception as e:
            return f"Error rolling dice: {str(e)}"

    async def _arun(self, formula: str) -> str:
        """Async version - calls sync implementation"""
        return self._run(formula)
