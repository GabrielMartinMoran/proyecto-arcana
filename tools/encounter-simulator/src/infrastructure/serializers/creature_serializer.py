"""Serializer for creature statblocks to markdown format"""

from typing import Any, Dict, Optional

import yaml


def format_uses(uses: Optional[Dict[str, Any]]) -> str:
    """Format uses information"""
    if not uses or "type" not in uses:
        return ""

    uses_type = uses.get("type")
    qty = uses.get("qty", "—")

    if uses_type == "RELOAD":
        return f"1 (Recarga {qty}+)"
    elif uses_type in ["USES", "LONG_REST"]:
        return str(qty)
    else:
        return ""


def get_first_key(
    obj: dict[str, Any], keys: list[str], default: Any | None = None
) -> Any | None:
    for key in keys:
        if key in obj:
            return obj[key]
    return default


def serialize_creature(creature: Dict[str, Any]) -> str:
    """
    Serialize a single creature to markdown format.

    Args:
        creature: Dictionary with creature data from YAML

    Returns:
        Markdown formatted statblock
    """
    md = []

    # Header
    name = creature.get("name", "Unknown")
    md.append(f"# {name}\n")
    md.append(f"**NA:** {creature.get('na', 0)}\n")

    # Behavior
    if "behavior" in creature and creature["behavior"]:
        md.append(f"**Comportamiento:** {creature['behavior']}\n")

    # Languages
    languages = creature.get("languages", [])
    if languages:
        md.append(f"**Lenguas:** {', '.join(languages)}\n")

    # Attributes
    md.append("\n## Atributos\n")
    attrs = creature.get("attributes", {})
    md.append(f"- **Cuerpo:** {get_first_key(attrs, ['body', 'cuerpo'], 1)}\n")
    md.append(f"- **Reflejos:** {get_first_key(attrs, ['reflexes', 'reflejos'], 1)}\n")
    md.append(f"- **Mente:** {get_first_key(attrs, ['mind', 'mente'], 1)}\n")
    md.append(f"- **Instinto:** {get_first_key(attrs, ['instinct', 'instinto'], 1)}\n")
    md.append(
        f"- **Presencia:** {get_first_key(attrs, ['presence', 'presencia'], 1)}\n"
    )

    # Stats
    md.append("\n## Estadísticas\n")
    stats = creature.get("stats", {})

    max_health = get_first_key(stats, ["maxHealth", "salud"], 0)
    md.append(f"- **Salud Máxima:** {max_health}\n")

    evasion = get_first_key(stats, ["evasion", "esquiva"], 0)
    evasion_val = evasion.get("value", 0) if isinstance(evasion, dict) else evasion
    evasion_note = evasion.get("note", "") if isinstance(evasion, dict) else ""
    md.append(f"- **Esquiva:** {evasion_val}")
    if evasion_note:
        md.append(f" ({evasion_note})")
    md.append("\n")

    phys_mit = get_first_key(stats, ["mitigacion", "mitigacionFísica"], {})
    phys_val = phys_mit.get("value", 0)
    phys_note = phys_mit.get("note", "")
    md.append(f"- **Mitigación Física:** {phys_val}")
    if phys_note:
        md.append(f" ({phys_note})")
    md.append("\n")

    mag_mit = stats.get("magicalMitigation", {})
    mag_val = mag_mit.get("value", 0)
    mag_note = mag_mit.get("note", "")
    md.append(f"- **Mitigación Mágica:** {mag_val}")
    if mag_note:
        md.append(f" ({mag_note})")
    md.append("\n")

    speed = get_first_key(stats, ["velocidad", "speed"], {})
    speed_val = speed.get("value", 0)
    speed_note = speed.get("note", "")
    md.append(f"- **Velocidad:** {speed_val}")
    if speed_note:
        md.append(f" ({speed_note})")
    md.append("\n")

    md.append(
        f"- **Iniciativa:** {get_first_key(attrs, ['reflexes', 'reflejos'], 1)}\n"
    )

    # Attacks
    attacks = creature.get("attacks", [])
    if attacks:
        md.append("\n## Ataques\n")
        for attack in attacks:
            name = attack.get("name", "")
            bonus = attack.get("bonus", 0)
            damage = attack.get("damage", "")
            note = attack.get("note", "")
            md.append(f"- **{name}:** Modificador de ataque: +{bonus}. Daño: {damage}")
            if note:
                md.append(f" ({note})")
            md.append("\n")

    # Traits
    traits = creature.get("traits", [])
    if traits:
        md.append("\n## Rasgos\n")
        for trait in traits:
            name = trait.get("name", "")
            detail = trait.get("detail", "")
            md.append(f"- **{name}:** {detail}\n")

    # Actions
    actions = creature.get("actions", [])
    if actions:
        md.append("\n## Acciones\n")
        for action in actions:
            name = action.get("name", "")
            detail = action.get("detail", "")
            uses = action.get("uses")
            md.append(f"- **{name}:** {detail}")
            if uses:
                uses_text = format_uses(uses)
                if uses_text:
                    md.append(f" (Usos: {uses_text})")
            md.append("\n")

    # Reactions
    reactions = creature.get("reactions", [])
    if reactions:
        md.append("\n## Reacciones\n")
        for reaction in reactions:
            name = reaction.get("name", "")
            detail = reaction.get("detail", "")
            uses = reaction.get("uses")
            md.append(f"- **{name}:** {detail}")
            if uses:
                uses_text = format_uses(uses)
                if uses_text:
                    md.append(f" (Usos: {uses_text})")
            md.append("\n")

    return "".join(md)


def serialize_bestiary(yaml_content: str) -> str:
    """
    Serialize entire bestiary YAML to markdown format.

    Args:
        yaml_content: Raw YAML content string

    Returns:
        Markdown formatted bestiary
    """
    try:
        data = yaml.safe_load(yaml_content)
        creatures = data.get("creatures", [])

        serialized = []
        for creature in creatures:
            serialized.append(serialize_creature(creature))
            serialized.append("\n---\n\n")

        return "".join(serialized).rstrip("\n---\n\n")
    except Exception as e:
        print(f"Error serializing bestiary: {e}")
        return yaml_content  # Fallback to raw YAML
