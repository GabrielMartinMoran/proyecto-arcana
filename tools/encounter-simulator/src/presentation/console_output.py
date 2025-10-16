"""Console output formatting utilities"""


class ConsoleOutput:
    """Handles formatted console output"""

    # ANSI color codes
    BOLD = "\033[1m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    RED = "\033[91m"
    RESET = "\033[0m"

    @staticmethod
    def print_header(text: str) -> None:
        """Print a bold header"""
        print(f"\n{ConsoleOutput.BOLD}{text}{ConsoleOutput.RESET}")
        print("=" * len(text))

    @staticmethod
    def print_section(title: str, content: str) -> None:
        """Print a section with title and content"""
        print(f"\n{ConsoleOutput.CYAN}{ConsoleOutput.BOLD}{title}{ConsoleOutput.RESET}")
        print(content)

    @staticmethod
    def print_turn(turn_number: int, turn_summary: str) -> None:
        """Print a turn summary"""
        print(
            f"\n{ConsoleOutput.YELLOW}{ConsoleOutput.BOLD}=== ROUND {turn_number} ==={ConsoleOutput.RESET}"
        )
        print(turn_summary)

    @staticmethod
    def print_combat_end(victor: str) -> None:
        """Print combat end message"""
        print(
            f"\n{ConsoleOutput.GREEN}{ConsoleOutput.BOLD}*** COMBAT ENDED ***{ConsoleOutput.RESET}"
        )
        print(f"Vencedor: {victor}")

    @staticmethod
    def print_analysis_header() -> None:
        """Print analysis phase header"""
        print(f"\n\n{ConsoleOutput.BLUE}{ConsoleOutput.BOLD}")
        print("╔" + "═" * 60 + "╗")
        print("║" + " " * 15 + "BALANCE ANALYSIS PHASE" + " " * 23 + "║")
        print("╚" + "═" * 60 + "╝")
        print(ConsoleOutput.RESET)

    @staticmethod
    def print_error(message: str) -> None:
        """Print an error message"""
        print(
            f"{ConsoleOutput.RED}{ConsoleOutput.BOLD}ERROR:{ConsoleOutput.RESET} {message}"
        )

    @staticmethod
    def print_info(message: str) -> None:
        """Print an info message"""
        print(f"{ConsoleOutput.CYAN}ℹ{ConsoleOutput.RESET} {message}")
