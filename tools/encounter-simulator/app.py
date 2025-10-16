"""
ARCANA Combat Encounter Simulator

Main entry point for the combat simulator CLI tool.
Simulates tactical combat encounters and generates balance analysis reports.
"""

import sys
from datetime import datetime
from pathlib import Path

from src.config_provider import ConfigProvider

# Add src to Python path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from dotenv import load_dotenv
from rich.console import Console
from rich.markdown import Markdown

from src.application.combat_analyzer import CombatAnalyzer
from src.application.combat_simulator import CombatSimulator
from src.infrastructure.document_loader import RuleDocumentLoader
from src.presentation.console_output import ConsoleOutput
from src.presentation.interactive_input import InteractiveInput


def main() -> None:
    """Main execution function"""
    load_dotenv()

    # Create console instance for markdown rendering
    console = Console()

    try:
        # Get configuration interactively
        while True:
            config = InteractiveInput.get_encounter_configuration()

            # Confirm configuration
            if InteractiveInput.confirm_configuration(config):
                break
            else:
                ConsoleOutput.print_info("Restarting configuration...\n")

        # Print header
        ConsoleOutput.print_header("ARCANA COMBAT ENCOUNTER SIMULATOR")

        # Load rule documents
        ConsoleOutput.print_info("Loading ARCANA rule documents...")
        docs_path = Path(__file__).parent.parent.parent / "static" / "docs"
        loader = RuleDocumentLoader(str(docs_path))
        rules = loader.load_all_rules()
        ConsoleOutput.print_info("✓ Rules loaded successfully")

        # Initialize combat simulator
        ConsoleOutput.print_info("Initializing combat simulator...")
        simulator = CombatSimulator(rules)
        simulator.initialize_agent(config)
        ConsoleOutput.print_info("✓ Simulator initialized")

        # Simulation loop
        ConsoleOutput.print_header("COMBAT SIMULATION")
        turn_number = 1
        combat_log_parts = []
        setup_info_content = None

        while True:
            try:
                # Simulate turn
                turn_output = simulator.simulate_turn(turn_number)

                # Display setup info for turn 1
                if turn_number == 1 and turn_output.setup_info:
                    setup_info_content = turn_output.setup_info
                    print(
                        f"\n{ConsoleOutput.CYAN}{ConsoleOutput.BOLD}=== SETUP ==={ConsoleOutput.RESET}"
                    )
                    console.print(Markdown(turn_output.setup_info))

                # Display turn summary with markdown formatting
                print(
                    f"\n{ConsoleOutput.YELLOW}{ConsoleOutput.BOLD}=== ROUND {turn_number} ==={ConsoleOutput.RESET}"
                )
                console.print(Markdown(turn_output.turn_summary))

                # Append to combat log
                combat_log_parts.append(
                    f"## Round {turn_number}\n\n{turn_output.turn_summary}"
                )

                # Check if combat is over
                if turn_output.is_combat_over:
                    ConsoleOutput.print_combat_end("See analysis below")
                    break

                turn_number += 1

                # Safety check to prevent infinite loops
                if turn_number > ConfigProvider.MAX_ROUNDS:
                    ConsoleOutput.print_error(
                        "Combat exceeded 50 rounds. Terminating simulation."
                    )
                    break

            except Exception as e:
                ConsoleOutput.print_error(f"Error during turn {turn_number}: {str(e)}")
                raise

        # Compile full combat log
        full_combat_log = "\n\n".join(combat_log_parts)

        # Analysis phase
        ConsoleOutput.print_analysis_header()
        ConsoleOutput.print_info("Analyzing combat balance...")

        analyzer = CombatAnalyzer(rules)
        analysis = analyzer.analyze(full_combat_log, config.encounter_difficulty)

        # Display analysis with markdown formatting
        print(
            "\n" + ConsoleOutput.BOLD + "BALANCE ANALYSIS REPORT" + ConsoleOutput.RESET
        )
        console.print(Markdown(analysis))

        # Save simulation results to file
        results_dir = Path(__file__).parent / "simulation_results"
        results_dir.mkdir(exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        enemies_name = config.enemies_list.replace(":", "_").replace(",", "_")
        filename = (
            f"simulation_{timestamp}_{enemies_name}_{config.encounter_difficulty}.md"
        )
        filepath = results_dir / filename

        # Build complete log
        complete_log = f"""# ARCANA Combat Simulation Report

**Date:** {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
**Enemies:** {config.enemies_list}
**Difficulty:** {config.encounter_difficulty}
**Character Preferences:** {config.character_preferences or "Auto-generate balanced party"}

---

"""
        if setup_info_content:
            complete_log += f"# Setup\n\n{setup_info_content}\n\n---\n\n"

        complete_log += "# Combat Log\n\n"
        complete_log += full_combat_log
        complete_log += f"\n\n---\n\n# Balance Analysis\n\n{analysis}\n"

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(complete_log)

        ConsoleOutput.print_info(f"\n✓ Simulation results saved to: {filepath}")
        ConsoleOutput.print_info("✓ Simulation completed successfully")

    except KeyboardInterrupt:
        ConsoleOutput.print_error("\nSimulation interrupted by user")
        sys.exit(1)
    except Exception as e:
        ConsoleOutput.print_error(f"Fatal error: {str(e)}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
