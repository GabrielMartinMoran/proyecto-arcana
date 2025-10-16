"""Domain models using Pydantic"""

from typing import Literal, Optional

from pydantic import BaseModel, Field


class TurnOutput(BaseModel):
    """Structured output for each combat turn"""

    turn_summary: str = Field(
        description="A concise Markdown-formatted summary of all actions, rolls, and results for the current turn."
    )
    is_combat_over: bool = Field(
        description="Flag set to 'true' only if one side has been completely defeated."
    )
    setup_info: Optional[str] = Field(
        default=None,
        description="Setup information (FASE 1) including difficulty calculation, character sheets, and enemy stats. Only present in turn 1.",
    )


class EncounterConfiguration(BaseModel):
    """Configuration for a combat encounter"""

    enemies_list: str = Field(
        description="Comma-separated list of enemies in format 'CreatureName:Quantity'"
    )
    encounter_difficulty: Literal["Fácil", "Normal", "Difícil", "Épico"] = Field(
        description="Difficulty level for the encounter"
    )
    character_preferences: Optional[str] = Field(
        default=None,
        description="Optional user preferences for character generation (e.g., 'include a healer', 'all ranged')",
    )
