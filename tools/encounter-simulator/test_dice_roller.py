"""
Test script for the dice roller functionality.
Run this independently to verify dice mechanics work correctly.
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from src.domain.dice_roller import DiceRoller


def test_basic_roll():
    """Test basic dice roll without explosion"""
    print("Test 1: Basic 1d6 roll")
    result = DiceRoller.roll("1d6")
    print(f"  Result: {result}")
    assert 1 <= result.total <= 6, "Basic roll out of range"
    print("  ✓ Passed\n")


def test_exploding_roll():
    """Test exploding dice"""
    print("Test 2: Exploding 1d8e roll (may explode)")
    for i in range(5):
        result = DiceRoller.roll("1d8e")
        print(f"  Roll {i + 1}: {result}")
    print("  ✓ Passed (check for 💥 symbols)\n")


def test_with_modifier():
    """Test roll with modifier"""
    print("Test 3: 1d8e+3 roll")
    result = DiceRoller.roll("1d8e+3")
    print(f"  Result: {result}")
    assert 4 <= result.total <= 100, "Modified roll out of reasonable range"
    print("  ✓ Passed\n")


def test_complex_formula():
    """Test complex formula with multiple dice types"""
    print("Test 4: Complex formula 2d10e+1d4+5")
    result = DiceRoller.roll("2d10e+1d4+5")
    print(f"  Result: {result}")
    assert 8 <= result.total, "Complex roll too low"
    print("  ✓ Passed\n")


def test_multiple_exploding():
    """Test multiple exploding dice"""
    print("Test 5: Multiple exploding 3d6e")
    for i in range(3):
        result = DiceRoller.roll("3d6e")
        print(f"  Roll {i + 1}: {result}")
    print("  ✓ Passed\n")


def main():
    """Run all tests"""
    print("=" * 60)
    print("ARCANA Dice Roller Test Suite")
    print("=" * 60)
    print()

    try:
        test_basic_roll()
        test_exploding_roll()
        test_with_modifier()
        test_complex_formula()
        test_multiple_exploding()

        print("=" * 60)
        print("All tests passed! ✓")
        print("=" * 60)

    except Exception as e:
        print(f"\n✗ Test failed: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
