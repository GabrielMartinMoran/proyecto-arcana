"""Combat simulator using LangChain with tool calling"""

import json
import re
from pathlib import Path
from typing import Dict

from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from src.config_provider import ConfigProvider

from ..domain.dice_roller import DiceRoller
from ..domain.models import EncounterConfiguration, TurnOutput


class InMemoryChatHistory(BaseChatMessageHistory):
    """In-memory chat message history for maintaining conversation state."""

    def __init__(self):
        self.messages: list[BaseMessage] = []

    def add_message(self, message: BaseMessage) -> None:
        """Add a message to the history."""
        self.messages.append(message)

    def clear(self) -> None:
        """Clear all messages from history."""
        self.messages = []


class CombatSimulator:
    """Orchestrates combat simulation using LangChain with direct tool calling"""

    def __init__(self, rules: Dict[str, str], llm_model: str = "gpt-4o"):
        """
        Initialize the combat simulator.

        Args:
            rules: Dictionary containing rule documents
            llm_model: Name of the LLM model to use (default: gpt-4o)
        """
        self.rules = rules
        self.llm = ChatOpenAI(model=llm_model, temperature=0.7)
        self.chat_history = InMemoryChatHistory()
        self.dice_roller = DiceRoller()
        self.system_prompt = None

    def initialize_agent(self, config: EncounterConfiguration) -> None:
        """
        Initialize the combat simulator with the prompt.

        Args:
            config: Encounter configuration with enemies and difficulty
        """
        # Load the combat simulator prompt
        prompt_path = (
            Path(__file__).parent.parent.parent / "prompts" / "combat_simulator.md"
        )
        with open(prompt_path, "r", encoding="utf-8") as f:
            simulator_prompt_template = f.read()

        # Format the prompt with rules and configuration
        character_prefs = (
            config.character_preferences
            or "Ninguna preferencia especificada. Genera un grupo balanceado y sinérgico."
        )

        self.system_prompt = simulator_prompt_template.format(
            player_manual=self.rules["player_manual"],
            gm_manual=self.rules["gm_manual"],
            bestiary=self.rules["bestiary"],
            cards_list=self.rules["cards_list"],
            enemies_list=config.enemies_list,
            encounter_difficulty=config.encounter_difficulty,
            character_preferences=character_prefs,
        )

        # Add tool usage instructions
        self.system_prompt += """

## HERRAMIENTA DISPONIBLE: dice_roller

Tienes acceso a una herramienta llamada `dice_roller` para realizar tiradas de dados.

**FLUJO OBLIGATORIO EN DOS PASOS:**

**PASO 1 - Solicitar Tiradas:**
Primero, identifica TODAS las tiradas que necesitas para esta ronda completa.
Escribe cada llamada con un ID único que identifique para qué es la tirada:

```
ROLL[Elara_Initiative]: dice_roller('1d6e+3')
ROLL[Kaelen_Initiative]: dice_roller('1d6e+2')
ROLL[Elara_Attack]: dice_roller('1d6e+3')
ROLL[Elara_Damage]: dice_roller('1d4')
```

El ID debe ser único y descriptivo (ej: NombrePersonaje_TipoDeTirada).
Espera a recibir TODOS los resultados antes de continuar.

**PASO 2 - Generar JSON con Resultados:**
Solo DESPUÉS de recibir todos los resultados, genera el JSON final usando esos valores concretos.

**Ejemplos válidos:**
- `dice_roller('1d6e+3')`
- dice_roller("2d10e")
- TOOL_CALL: dice_roller("1d4+2")

**INCORRECTO - NO hagas esto:**
- dice_roller("1d6e+2, 1d6e+1, 1d4") ❌ (NO juntes fórmulas con comas)
- Generar JSON antes de hacer las tiradas ❌
- Inventar números (ej: "7 (1d6e [4] + 3)") sin haber llamado a dice_roller() ❌

**IMPORTANTE:**
- **NUNCA inventes resultados de dados**. SIEMPRE usa dice_roller().
- Si recibes un rechazo porque pusiste dice_roller() en el JSON, NO inventes los números. Vuelve al PASO 1.
- Si recibes un rechazo porque no hiciste tiradas, NO inventes los números. Ve al PASO 1 y llama a dice_roller().
- **Cada tirada debe ser una llamada separada**, no juntes múltiples fórmulas con comas.
- **NUNCA incluyas llamadas a dice_roller() dentro del JSON final**. Solo incluye los resultados ya ejecutados.
- Ejemplo CORRECTO: Llamas `dice_roller('1d6e+3')` → recibes "7 (1d6e [4] + 3)" → en JSON escribes "Tirada: 7 (1d6e [4] + 3)"
- Ejemplo INCORRECTO: Sin llamar a dice_roller(), escribes en JSON "Tirada: 7 (1d6e [4] + 3)"

## FORMATO DE SALIDA REQUERIDO

Al finalizar tu turno completo (después de todas las tiradas necesarias), debes responder ÚNICAMENTE con un objeto JSON válido:

**Para el turno 1 (con FASE 1: SETUP):**
```json
{{
    "setup_info": "TODO el contenido de FASE 1 en Markdown: cálculo de dificultad, hojas de personaje completas de los PJs, estadísticas de enemigos",
    "turn_summary": "Resumen completo en Markdown del turno de combate con todos los resultados",
    "is_combat_over": false
}}
```

**Para turnos subsiguientes:**
```json
{{
    "turn_summary": "Resumen completo en Markdown del turno con todos los resultados",
    "is_combat_over": false
}}
```

NO incluyas ningún texto adicional fuera del JSON cuando termines el turno.
"""

    def _execute_tool_calls(self, text: str) -> tuple[str, list[str]]:
        """
        Execute any tool calls found in the text.

        Returns:
            Tuple of (text_without_tool_calls, list_of_tool_results)
        """
        tool_results = []

        # Pattern with ID: ROLL[ID]: dice_roller('formula')
        pattern_with_id = r'ROLL\[([^\]]+)\]:\s*dice_roller\(["\']([^"\']+)["\']\)'

        # Legacy patterns (no ID):
        # 1. TOOL_CALL: dice_roller("formula")
        # 2. `dice_roller('formula')` (in backticks)
        # 3. dice_roller("formula") (anywhere)
        legacy_patterns = [
            r'TOOL_CALL:\s*dice_roller\(["\']([^"\']+)["\']\)',
            r'`dice_roller\(["\']([^"\']+)["\']\)`',
            r'dice_roller\(["\']([^"\']+)["\']\)',
        ]

        # First, try to find calls with IDs
        matches_with_id = list(re.finditer(pattern_with_id, text, re.IGNORECASE))

        if matches_with_id:
            # Use ID-based calls (no deduplication needed - each ID is unique)
            for match in matches_with_id:
                roll_id = match.group(1)
                formula = match.group(2)
                try:
                    result = self.dice_roller.roll(formula)
                    tool_results.append(f"ROLL[{roll_id}]: {result}")
                except Exception as e:
                    tool_results.append(f"ROLL[{roll_id}]: ERROR: {str(e)}")

            # Remove ID-based calls from text
            cleaned_text = re.sub(pattern_with_id, "[DICE_EXECUTED]", text)
            return cleaned_text, tool_results

        # Fallback to legacy patterns (with deduplication)
        all_matches = []
        for pattern in legacy_patterns:
            matches = list(re.finditer(pattern, text, re.IGNORECASE))
            all_matches.extend(matches)

        if not all_matches:
            return text, tool_results

        # Remove duplicates based on formula for legacy format
        seen_formulas = set()
        unique_matches = []
        for match in all_matches:
            formula = match.group(1)
            if formula not in seen_formulas:
                seen_formulas.add(formula)
                unique_matches.append(match)

        # Execute each unique tool call
        for match in unique_matches:
            formula = match.group(1)
            try:
                result = self.dice_roller.roll(formula)
                tool_results.append(f"dice_roller('{formula}') = {result}")
            except Exception as e:
                tool_results.append(f"dice_roller('{formula}') = ERROR: {str(e)}")

        # Remove tool calls from text
        cleaned_text = text
        for pattern in legacy_patterns:
            cleaned_text = re.sub(pattern, "[DICE_EXECUTED]", cleaned_text)

        return cleaned_text, tool_results

    def simulate_turn(self, turn_number: int) -> TurnOutput:
        """
        Simulate a single turn of combat.

        Args:
            turn_number: Current turn number

        Returns:
            TurnOutput with turn summary and combat status
        """
        if self.system_prompt is None:
            raise RuntimeError(
                "Simulator not initialized. Call initialize_agent() first."
            )

        # Prepare messages
        messages = [SystemMessage(content=self.system_prompt)]
        messages.extend(self.chat_history.messages)

        if turn_number == 1:
            input_message = (
                "Execute FASE 1: SETUP and then FASE 2: COMBATE for round 1. "
                'Use TOOL_CALL: dice_roller("formula") for all dice rolls. '
                "When done, respond ONLY with the JSON object."
            )
        else:
            input_message = (
                f"Execute FASE 2: COMBATE for round {turn_number}. "
                'Use TOOL_CALL: dice_roller("formula") for all dice rolls. '
                "When done, respond ONLY with the JSON object."
            )

        messages.append(HumanMessage(content=input_message))

        # Interaction loop with tool calling

        iteration = 0
        tool_calls_made = False  # Track if any dice rolls were executed

        if ConfigProvider.DEBUG:
            print(f"\n{'─' * 60}")
            print(f"Starting turn {turn_number} simulation...")
            print(f"{'─' * 60}\n")

        while iteration < ConfigProvider.MAX_ROUND_ITERATIONS:
            iteration += 1

            if ConfigProvider.DEBUG:
                print(f"🔄 Iteration {iteration}/{ConfigProvider.MAX_ROUND_ITERATIONS}")

            # Get LLM response
            response = self.llm.invoke(messages)
            response_text = response.content

            if ConfigProvider.DEBUG:
                # Show a preview of the response
                preview = response_text[:200].replace("\n", " ")
                if len(response_text) > 200:
                    preview += "..."
                print(f"💬 LLM: {preview}\n")

            # Check if this is final JSON first
            if self._is_final_json(response_text):
                # Check if JSON contains pending dice_roller calls (invalid)
                if self._has_pending_tool_calls(response_text):
                    print("⚠️  JSON contains pending dice_roller calls. Rejecting...\n")
                    messages.append(AIMessage(content=response_text))
                    messages.append(
                        HumanMessage(
                            content="ERROR: Your JSON output contains dice_roller() calls. "
                            "You must execute ALL dice rolls BEFORE generating the final JSON. "
                            "The JSON should only contain the results (e.g., '7 (1d6e [4] + 3)'), not calls to dice_roller(). "
                            "Please make all necessary dice_roller() calls first, then provide the JSON with results."
                        )
                    )
                    continue

                # Check if any dice rolls were made at all (for turn 1, mandatory)
                if turn_number == 0 and not tool_calls_made:
                    print("⚠️  No dice_roller calls were executed. Rejecting...\n")
                    messages.append(AIMessage(content=response_text))
                    messages.append(
                        HumanMessage(
                            content="ERROR: You provided a JSON with dice results but you NEVER called dice_roller().\n\n"
                            "You CANNOT invent results like '7 (1d6e [4] + 3)' without calling the tool first.\n\n"
                            "MANDATORY PROCESS:\n"
                            "1. First call dice_roller('formula') for EACH roll you need\n"
                            "2. Wait for the results\n"
                            "3. THEN generate the JSON using those exact results\n\n"
                            "Start over from STEP 1. Call dice_roller() now for all initiative, attack, and damage rolls."
                        )
                    )
                    continue

                # Valid final JSON with no pending calls
                print("✅ Final JSON output received\n")

                # Parse and return
                turn_output = self._parse_json_output(response_text)

                # Save to history (save original input and final output only)
                self.chat_history.add_message(HumanMessage(content=input_message))
                self.chat_history.add_message(AIMessage(content=response_text))

                return turn_output

            # Not final JSON yet - check for tool calls to execute
            cleaned_text, tool_results = self._execute_tool_calls(response_text)

            if tool_results:
                tool_calls_made = (
                    True  # Mark that we've executed at least one dice roll
                )

                if ConfigProvider.DEBUG:
                    # Tool calls were made, show and provide results
                    print(f"🎲 Executing {len(tool_results)} dice roll(s):")
                    for result in tool_results:
                        print(f"   ├─ {result}")
                    print()

                messages.append(AIMessage(content=response_text))
                tool_results_text = "TOOL RESULTS:\n" + "\n".join(tool_results)
                messages.append(HumanMessage(content=tool_results_text))
                continue

            # No tool calls and no final JSON - prompt for output
            print("⚠️  No final JSON yet, prompting for output...\n")
            messages.append(AIMessage(content=response_text))
            messages.append(
                HumanMessage(content="Please provide the final JSON output now.")
            )

        # Max iterations reached
        print("\n❌ Max iterations reached without final output\n")
        raise RuntimeError(
            f"Max iterations ({ConfigProvider.MAX_ROUND_ITERATIONS}) reached without getting final JSON output"
        )

    def _is_final_json(self, text: str) -> bool:
        """Check if text contains the final JSON output."""
        return '"turn_summary"' in text and '"is_combat_over"' in text

    def _has_pending_tool_calls(self, text: str) -> bool:
        """Check if text contains any pending dice_roller calls."""
        patterns = [
            r'dice_roller\(["\']([^"\']+)["\']\)',
        ]
        for pattern in patterns:
            if re.search(pattern, text):
                return True
        return False

    def _parse_json_output(self, text: str) -> TurnOutput:
        """Parse JSON output from LLM response."""
        # Try to extract JSON from markdown code blocks
        json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
        else:
            # Try to find JSON object directly
            json_match = re.search(
                r'\{[^{}]*"turn_summary"[^{}]*"is_combat_over"[^{}]*\}', text, re.DOTALL
            )
            if json_match:
                json_str = json_match.group(0)
            else:
                # Try to parse entire text as JSON
                json_str = text.strip()

        try:
            parsed = json.loads(json_str)
            return TurnOutput(**parsed)
        except json.JSONDecodeError as e:
            print(f"Warning: Could not parse JSON output: {e}")
            print(f"Attempted to parse: {json_str[:200]}...")
            # Fallback: use entire text as summary
            return TurnOutput(turn_summary=text, is_combat_over=False)
