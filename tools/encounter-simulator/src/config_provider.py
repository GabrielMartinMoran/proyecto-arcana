import os

from dotenv.main import load_dotenv


class ConfigProvider:
    load_dotenv()

    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    MAX_ROUND_ITERATIONS: int = 40

    MAX_ROUNDS: int = 50

    ROLLS_TO_PRE_COMPUTE: int = 15
