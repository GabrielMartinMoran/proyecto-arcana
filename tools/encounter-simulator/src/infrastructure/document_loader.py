"""Document loader for ARCANA rule documents"""

from pathlib import Path
from typing import Dict

from src.infrastructure.serializers.card_serializer import serialize_cards
from src.infrastructure.serializers.creature_serializer import serialize_bestiary


class RuleDocumentLoader:
    """Loads ARCANA game rule documents from the static/docs directory"""

    def __init__(self, docs_path: str):
        """
        Initialize the document loader.

        Args:
            docs_path: Path to the directory containing rule documents
        """
        self.docs_path = Path(docs_path)
        if not self.docs_path.exists():
            raise FileNotFoundError(f"Documentation path not found: {docs_path}")

    def load_all_rules(self) -> Dict[str, str]:
        """
        Load all rule documents.

        Returns:
            Dictionary with keys: player_manual, gm_manual, bestiary, cards_list
        """
        # Load YAML files
        bestiary_yaml = self._load_file("bestiary.yml")
        cards_yaml = self._load_file("cards.yml")

        # Serialize to markdown for LLM consumption
        return {
            "player_manual": self._load_file("player.md"),
            "gm_manual": self._load_file("gm.md"),
            "bestiary": serialize_bestiary(bestiary_yaml),
            "cards_list": serialize_cards(cards_yaml, root_key="cards"),
        }

    def _load_file(self, filename: str) -> str:
        """
        Load a single file from the docs directory.

        Args:
            filename: Name of the file to load

        Returns:
            File contents as string
        """
        file_path = self.docs_path / filename

        if not file_path.exists():
            raise FileNotFoundError(f"Rule document not found: {file_path}")

        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
