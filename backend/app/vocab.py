"""Fixed word lists shared with the app (docs/api-contract.md, "Fixed vocabularies")."""

from typing import Literal

Allergy = Literal["peanut", "tree_nut", "dairy", "egg", "gluten", "soy", "fish", "shellfish", "sesame"]
Diet = Literal["none", "vegetarian", "vegan", "pescatarian", "halal"]

# Detector class order. Must match the training data (data.yaml), because
# the model returns class ids as positions in this list.
CLASS_NAMES = [
    "apple", "banana", "beef", "blueberries", "bread", "butter_or_spread", "carrot", "cheese",
    "chicken", "chicken_breast", "chocolate", "corn", "eggs", "flour", "goat_cheese", "green_beans",
    "ground_beef", "ham", "cream", "lime", "milk", "mushrooms", "onion", "potato", "shrimp",
    "spinach", "strawberries", "sugar", "sweet_potato", "tomato", "eggplant", "cabbage",
    "bell_pepper", "cucumber", "ginger", "green_chili", "leafy_greens", "fizzy_drink", "juice",
    "water_bottle", "yogurt", "plant_milk",
]

DISPLAY_NAMES = {name: name.replace("_", " ").capitalize() for name in CLASS_NAMES}

# Common items the camera often misses; the app asks about any not detected (FR5).
STAPLES = [
    {"id": "milk", "name": "Milk"},
    {"id": "eggs", "name": "Eggs"},
    {"id": "butter_or_spread", "name": "Butter"},
    {"id": None, "name": "Salt"},
    {"id": None, "name": "Cooking oil"},
]
