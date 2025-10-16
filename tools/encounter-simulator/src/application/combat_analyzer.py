"""Combat analyzer using LangChain"""

from pathlib import Path
from typing import Dict

from langchain.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI


class CombatAnalyzer:
    """Analyzes completed combat encounters for balance assessment"""

    def __init__(self, rules: Dict[str, str], llm_model: str = "gpt-4o"):
        """
        Initialize the combat analyzer.

        Args:
            rules: Dictionary containing rule documents
            llm_model: Name of the LLM model to use (default: gpt-4o)
        """
        self.rules = rules
        self.llm = ChatOpenAI(model=llm_model, temperature=0.3)

    def analyze(self, combat_log: str, encounter_difficulty: str) -> str:
        """
        Analyze a complete combat log.

        Args:
            combat_log: Complete log of the combat encounter
            encounter_difficulty: Configured difficulty level

        Returns:
            Detailed analysis report as markdown string
        """
        # Load the analyzer prompt
        prompt_path = (
            Path(__file__).parent.parent.parent / "prompts" / "combat_analyzer.md"
        )
        with open(prompt_path, "r", encoding="utf-8") as f:
            analyzer_prompt_template = f.read()

        # Format the prompt with rules and combat log
        formatted_prompt = analyzer_prompt_template.format(
            player_manual=self.rules["player_manual"],
            gm_manual=self.rules["gm_manual"],
            bestiary=self.rules["bestiary"],
            cards_list=self.rules["cards_list"],
            combat_log=combat_log,
            encounter_difficulty=encounter_difficulty,
        )

        # Create prompt template
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", formatted_prompt),
                (
                    "human",
                    "Please provide your detailed analysis of this combat encounter.",
                ),
            ]
        )

        # Create chain
        chain = prompt | self.llm

        # Execute analysis
        result = chain.invoke({})

        return result.content
