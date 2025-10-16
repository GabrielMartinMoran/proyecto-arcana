# Architecture Documentation

## Overview

The ARCANA Combat Encounter Simulator follows **Clean Architecture** principles with clear separation of concerns across four distinct layers.

## Architectural Layers

```
┌─────────────────────────────────────────────────────┐
│                  Presentation Layer                  │
│            (CLI, Console Output, UI)                │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│                 Application Layer                    │
│        (Use Cases, Combat Orchestration)            │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│              Infrastructure Layer                    │
│     (LangChain, LLM, Document Loader, Tools)        │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│                  Domain Layer                        │
│         (Business Logic, Dice Roller, Models)       │
└─────────────────────────────────────────────────────┘
```

## Layer Details

### 1. Domain Layer (`src/domain/`)

**Purpose**: Core business logic with zero external dependencies

**Components**:
- `models.py`: Pydantic models for data validation
  - `TurnOutput`: Structured output for combat turns
  - `EncounterConfiguration`: Encounter parameters
- `dice_roller.py`: Pure dice rolling logic with exploding mechanics
  - `DiceRoller`: Stateless dice roller
  - `DiceRollResult`: Value object for roll results

**Dependencies**: None (pure Python + Pydantic)

**Principles Applied**:
- Single Responsibility: Each class has one reason to change
- Open/Closed: Extensible without modification
- No external framework dependencies

### 2. Infrastructure Layer (`src/infrastructure/`)

**Purpose**: External services, tools, and framework integrations

**Components**:
- `document_loader.py`: File system access for rule documents
  - `RuleDocumentLoader`: Loads YAML/MD documents from disk
- `langchain_tools.py`: LangChain tool implementations
  - `DiceRollerTool`: Wraps domain dice roller as LangChain tool

**Dependencies**: 
- Domain layer (depends on `DiceRoller`)
- LangChain framework
- File system

**Principles Applied**:
- Dependency Inversion: Infrastructure depends on domain abstractions
- Interface Segregation: Focused tool interfaces

### 3. Application Layer (`src/application/`)

**Purpose**: Orchestrates use cases and business workflows

**Components**:
- `combat_simulator.py`: Orchestrates combat simulation
  - `CombatSimulator`: Manages LLM agent, memory, and simulation loop
  - Coordinates between infrastructure and domain
- `combat_analyzer.py`: Orchestrates post-combat analysis
  - `CombatAnalyzer`: Manages analysis LLM chain

**Dependencies**:
- Domain layer (models)
- Infrastructure layer (tools, document loader)
- LangChain framework

**Principles Applied**:
- Single Responsibility: Each use case in its own class
- Dependency Injection: Receives dependencies via constructor

### 4. Presentation Layer (`src/presentation/`)

**Purpose**: User interface and input/output handling

**Components**:
- `cli.py`: Command-line argument parsing
  - `CLI`: Validates and parses user input
- `console_output.py`: Formatted console output
  - `ConsoleOutput`: Utility class for colored terminal output

**Dependencies**:
- Domain layer (models)
- Python standard library (argparse)

**Principles Applied**:
- Separation of Concerns: UI logic isolated from business logic
- Single Responsibility: CLI parsing separate from output formatting

## Design Patterns

### 1. **Repository Pattern** (Implicit)
- `RuleDocumentLoader` acts as a repository for rule documents
- Abstracts file system access from business logic

### 2. **Tool Pattern** (LangChain)
- `DiceRollerTool` wraps domain logic as a tool for LLM agents
- Clean interface between AI and deterministic logic

### 3. **Strategy Pattern** (Implicit)
- Different LLM models can be injected into simulators
- Combat vs. Analysis strategies separated

### 4. **Chain of Responsibility** (LangChain)
- Agent executor chains multiple tools and memory
- Prompt → Agent → Tool → Memory → Response

## SOLID Principles Application

### Single Responsibility Principle (SRP)
✓ Each class has one reason to change:
- `DiceRoller`: Only dice logic
- `CLI`: Only argument parsing
- `CombatSimulator`: Only simulation orchestration

### Open/Closed Principle (OCP)
✓ Extensible without modification:
- New tools can be added without changing `CombatSimulator`
- New output formats can be added without changing core logic
- New LLM models can be injected via constructor

### Liskov Substitution Principle (LSP)
✓ Subtypes are substitutable:
- `DiceRollerTool` properly implements `BaseTool`
- Any `ChatVertexAI` model can replace another

### Interface Segregation Principle (ISP)
✓ Focused interfaces:
- `DiceRollerTool` has single focused method
- `CLI` exposes only parsing functionality
- No client forced to depend on unused methods

### Dependency Inversion Principle (DIP)
✓ Depend on abstractions:
- Application layer depends on domain abstractions
- Infrastructure implements domain interfaces
- High-level modules don't depend on low-level details

## Data Flow

```
User Input (CLI)
    ↓
CLI Parser (validates)
    ↓
EncounterConfiguration (domain model)
    ↓
CombatSimulator.initialize_agent()
    ↓
  ┌─────────────────────────────────┐
  │  LangChain Agent Executor       │
  │  ┌─────────────────────┐        │
  │  │ LLM (Vertex AI)     │        │
  │  └──────────┬──────────┘        │
  │             │                    │
  │  ┌──────────▼──────────┐        │
  │  │ Conversation Memory │        │
  │  └──────────┬──────────┘        │
  │             │                    │
  │  ┌──────────▼──────────┐        │
  │  │  DiceRollerTool     │────────┼───► DiceRoller (domain)
  │  └─────────────────────┘        │
  └─────────────────────────────────┘
    ↓
TurnOutput (structured output)
    ↓
ConsoleOutput (formatted display)
    ↓
User sees result
```

## Testing Strategy

### Unit Tests
- **Domain Layer**: Pure functions, easy to test
  - `DiceRoller`: Test distribution, explosion mechanics
  - `Models`: Test validation logic

### Integration Tests
- **Infrastructure Layer**: Test tool integration
  - `DiceRollerTool`: Verify LangChain compatibility
  - `RuleDocumentLoader`: Test file loading

### End-to-End Tests
- **Full Simulation**: Test complete workflow
  - Mock LLM responses
  - Verify output format

## Extension Points

### Adding New Tools
1. Create tool in `infrastructure/langchain_tools.py`
2. Implement `BaseTool` interface
3. Add to `CombatSimulator.tools` list

### Adding New Output Formats
1. Create formatter in `presentation/`
2. Inject into main application flow
3. No changes to core logic required

### Adding New LLM Providers
1. Change import in application layer (e.g., `langchain_openai.ChatOpenAI`)
2. Update model parameter in constructor
3. Configure API credentials in .env file
4. Interface remains the same (LangChain abstraction)

### Adding New Rule Sources
1. Extend `RuleDocumentLoader`
2. Add new loading methods
3. Update initialization in main

## Error Handling Strategy

- **Domain Layer**: Raises domain-specific exceptions
- **Application Layer**: Catches and logs errors, provides context
- **Presentation Layer**: User-friendly error messages
- **Infrastructure Layer**: Wraps external errors

## Performance Considerations

- **Memory Management**: ConversationBufferMemory may grow large
  - Consider switching to `ConversationBufferWindowMemory` for long combats
- **LLM Calls**: Most expensive operation
  - GPT-4o provides good balance of speed and quality
  - Use gpt-3.5-turbo for faster/cheaper simulations
  - Use caching for rule documents
- **Dice Rolling**: Negligible overhead
  - Pure computation, no I/O

## Security Considerations

- **Input Validation**: All CLI inputs validated before processing
- **File Access**: Limited to specific rule document directory
- **LLM Prompts**: Rule injection prevented via structured templates
- **Credentials**: Environment variables only, never hardcoded

## Future Enhancements

1. **Persistence Layer**: Save simulation logs to database
2. **Web Interface**: REST API + React frontend
3. **Parallel Simulations**: Run multiple encounters concurrently
4. **Statistical Analysis**: Aggregate data from multiple runs
5. **Visualization**: Combat flow diagrams and charts
