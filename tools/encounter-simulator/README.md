# ARCANA Combat Encounter Simulator

A sophisticated CLI tool that simulates tactical combat encounters for the ARCANA TTRPG system using LangChain and LLM agents. Generates detailed playtesting data and balance analysis reports.

## Features

- **Automated Combat Simulation**: Simulates complete combat encounters turn-by-turn following ARCANA rules
- **Exploding Dice Mechanics**: Custom dice roller supporting exploding dice notation (XdYe)
- **LLM-Powered Decision Making**: Uses Google Vertex AI for intelligent tactical decisions
- **Balance Analysis**: Generates comprehensive post-combat analysis reports
- **Clean Architecture**: SOLID principles with clear separation of concerns

## Architecture

The project follows Clean Architecture principles:

```
src/
├── domain/           # Business logic and entities
│   ├── models.py     # Pydantic models
│   └── dice_roller.py # Dice rolling logic
├── application/      # Use cases and orchestration
│   ├── combat_simulator.py
│   └── combat_analyzer.py
├── infrastructure/   # External services and tools
│   ├── document_loader.py
│   └── langchain_tools.py
└── presentation/     # CLI and user interface
    ├── cli.py
    └── console_output.py
```

## Installation

1. Create and activate virtual environment:
```bash
cd tools/encounter-simulator
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure OpenAI API key:
```bash
export OPENAI_API_KEY="sk-your-api-key-here"
# or create a .env file with your API key
```

## Usage

The simulator runs in **interactive mode**. Simply execute:

```bash
python app.py
```

You will be prompted for:

1. **Enemies**: Enter enemies in format `CreatureName:Quantity,CreatureName:Quantity`
   - Example: `Goblin:4,Orco:1`
   - Creature names must match those in the bestiary
   - Quantities must be positive integers

2. **Difficulty**: Select from a numbered menu (1-4)
   - 1. Fácil (Easy)
   - 2. Normal
   - 3. Difícil (Hard)
   - 4. Épico (Epic)

3. **Character Preferences** (Optional): Specify preferences for party generation
   - Examples:
     - "Include a healer and a tank"
     - "All ranged attackers"
     - "Focus on high mobility characters"
     - "At least one spellcaster with area damage"
   - Press ENTER to skip and auto-generate a balanced party

4. **Confirmation**: Review and confirm your configuration before simulation starts

### Example Session

```
📋 ENEMY CONFIGURATION
Enter enemies in format: CreatureName:Quantity
Enemies ➤ Goblin:4,Orco:1
✓ Enemies validated successfully

⚔️  DIFFICULTY LEVEL
Select difficulty [1-4] ➤ 2
✓ Difficulty set to: Normal

👥 CHARACTER PREFERENCES (Optional)
Character preferences ➤ Include a healer
✓ Preferences recorded

CONFIGURATION SUMMARY
📋 Enemies: Goblin:4,Orco:1
⚔️  Difficulty: Normal
👥 Character Preferences: Include a healer

Proceed with this configuration? [Y/n] ➤ y
```

## Output

The simulator produces:

1. **Setup Phase**: Generated party character sheets
2. **Combat Log**: Turn-by-turn combat summary with:
   - Initiative order
   - Attack rolls and results
   - Damage calculations
   - HP tracking
   - Status effects
3. **Balance Analysis**: Comprehensive report including:
   - Executive summary
   - Creature performance metrics
   - Balance evaluation
   - Rule compliance audit

## Dice Notation

The simulator uses exploding dice notation:
- `XdYe`: Roll X dice of size Y, exploding on max value
- Example: `1d6e+3` = Roll 1d6 (exploding) + 3
- Explosions: `6💥` indicates the die exploded and was re-rolled

## Dependencies

- **LangChain**: Agent orchestration and memory management
- **OpenAI GPT-4**: LLM for combat simulation and analysis
- **Pydantic**: Data validation and structured outputs

## Development

### Code Style

The codebase follows:
- **SOLID principles**
- **Clean Code** practices
- **Clean Architecture** patterns
- Type hints throughout
- Comprehensive docstrings

### Testing

To test the dice roller independently:
```python
from src.domain.dice_roller import DiceRoller

result = DiceRoller.roll("2d6e+3")
print(result)  # e.g., "15 (2d6e [6💥 + 6💥 + 3] + 3)"
```

## Troubleshooting

**LLM not responding**: Verify OPENAI_API_KEY environment variable is set
**Rules not found**: Ensure `static/docs/` directory contains all required files
**Import errors**: Verify virtual environment is activated and dependencies installed

## License

Part of the ARCANA TTRPG project.
