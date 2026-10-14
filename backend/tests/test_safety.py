import pytest

from app.services.safety import violations


@pytest.mark.parametrize("texts, allergies, diet", [
    (["2 tbsp peanut butter"], ["peanut"], "none"),
    (["pecans"], ["tree_nut"], "none"),
    (["pesto"], ["tree_nut"], "none"),
    (["grated parmesan"], ["dairy"], "none"),
    (["eggs"], ["egg"], "none"),
    (["mayonnaise"], ["egg"], "none"),
    (["plain flour"], ["gluten"], "none"),
    (["soy sauce"], ["gluten"], "none"),
    (["prawns"], ["shellfish"], "none"),
    (["tahini"], ["sesame"], "none"),
    (["Worcestershire sauce"], ["fish"], "none"),
    (["Worcestershire sauce"], [], "vegetarian"),
    (["chicken breast"], [], "vegetarian"),
    (["fish sauce"], [], "vegetarian"),
    (["bacon"], [], "halal"),
    (["red wine"], [], "halal"),
    (["gelatine"], [], "halal"),
    (["honey"], [], "vegan"),
    (["butter"], [], "vegan"),
    (["beef mince"], [], "pescatarian"),
])
def test_blocks_unsafe(texts, allergies, diet):
    assert violations(texts, allergies, diet)


@pytest.mark.parametrize("texts, allergies, diet", [
    (["eggplant"], ["egg"], "none"),
    (["coconut milk", "almond milk"], ["dairy"], "none"),
    (["peanut butter"], ["dairy"], "none"),
    (["butternut squash"], ["dairy", "tree_nut"], "none"),
    (["nutmeg", "coconut"], ["tree_nut"], "none"),
    (["rice flour", "rice noodles"], ["gluten"], "none"),
    (["vegetable stock"], [], "vegetarian"),
    (["salmon"], [], "pescatarian"),
    (["red wine vinegar"], [], "halal"),
    (["chicken", "rice"], [], "halal"),
    (["tomato", "onion", "eggs"], ["peanut"], "vegetarian"),
])
def test_allows_safe(texts, allergies, diet):
    assert not violations(texts, allergies, diet)
