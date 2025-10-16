"""Serializer for cards to markdown format"""

from typing import Any, Dict, Optional

import yaml


def format_uses(uses: Optional[Dict[str, Any]]) -> str:
    """Format uses information matching TypeScript logic"""
    if not uses or "type" not in uses:
        return "N/A"

    uses_type = uses.get("type")
    qty = uses.get("qty", "—")

    if uses_type == "LONG_REST":
        return f"{qty} por día de descanso"
    elif uses_type == "RELOAD":
        return f"1 (Recarga {qty}+)"
    elif uses_type == "USES":
        return str(qty)
    else:
        return "—"


def serialize_card(card: Dict[str, Any]) -> str:
    """
    Serialize a single card to markdown format.

    Args:
        card: Dictionary with card data from YAML

    Returns:
        Markdown formatted card
    """
    md = []

    # Header
    name = card.get("name", "Unknown")
    md.append(f"# {name}\n\n")

    # Level
    level = card.get("level", 0)
    md.append(f"**Nivel:** {level}\n\n")

    # Type (capitalize first letter)
    card_type = card.get("type", "")
    if card_type:
        card_type = card_type.capitalize()
    md.append(f"**Tipo:** {card_type}\n\n")

    # Cost (only for items)
    card_category = card.get("cardType", "")
    if card_category == "item":
        cost = card.get("cost", 0)
        md.append(f"**Costo:** {cost} de oro\n\n")

    # Description
    description = card.get("description", "")
    md.append(f"**Descripción:**\n{description}\n\n")

    # Tags
    tags = card.get("tags", [])
    if tags and len(tags) > 0:
        md.append(f"**Etiquetas:** {', '.join(tags)}\n\n")

    # Requirements
    requirements = card.get("requirements", [])
    if requirements and len(requirements) > 0:
        md.append(f"**Requerimientos:** {', '.join(requirements)}\n\n")
    else:
        md.append("**Requerimientos:** —\n\n")

    # Uses
    uses = card.get("uses")
    uses_text = format_uses(uses)
    if uses_text != "N/A":
        md.append(f"**Usos:** {uses_text}\n\n")

    return "".join(md)


def serialize_cards(yaml_content: str, root_key: str = "cards") -> str:
    """
    Serialize entire cards YAML to markdown format.

    Args:
        yaml_content: Raw YAML content string
        root_key: Root key in YAML ('cards' or 'items')

    Returns:
        Markdown formatted cards
    """
    try:
        data = yaml.safe_load(yaml_content)
        cards = data.get(root_key, [])

        serialized = []
        for card in cards:
            serialized.append(serialize_card(card))
            serialized.append("---\n\n")

        return "".join(serialized).rstrip("\n---\n\n")
    except Exception as e:
        print(f"Error serializing cards: {e}")
        return yaml_content  # Fallback to raw YAML
