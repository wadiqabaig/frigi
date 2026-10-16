import type { Substitute } from '../types'

// Practical swaps per ingredient. Each substitute id must exist in INGREDIENTS
// so allergy/diet filtering can check it. Ingredients with no entry return
// "no safe swap" rather than an invented one.
export const SUBSTITUTIONS: Record<string, Substitute[]> = {
  garlic: [
    { id: 'onion', name: 'Extra onion', ratio: '¼ onion, finely grated, per 2 cloves', note: 'Sweeter and milder than garlic, but keeps the savoury base.' },
  ],
  butter: [
    { id: 'oil', name: 'Olive oil', ratio: 'Use ¾ of the amount', note: 'Works for frying and most batters. Pancakes come out slightly crisper.' },
    { id: 'yogurt', name: 'Greek yogurt', ratio: 'Use ½ of the amount', note: 'Adds moisture to batters. Not ideal for frying.' },
  ],
  milk: [
    { id: 'oatmilk', name: 'Oat milk', ratio: 'Same amount', note: 'Neutral and creamy. The closest match in sauces and batters.' },
    { id: 'yogurt', name: 'Greek yogurt + water', ratio: 'Half yogurt, half water', note: 'Adds a gentle tang. Stir in off the heat so it does not split.' },
  ],
  cheddar: [
    { id: 'mozzarella', name: 'Mozzarella', ratio: 'Same amount', note: 'Milder and stretchier. Great on toast.' },
  ],
  basil: [
    { id: 'spinach', name: 'Baby spinach', ratio: 'A small handful', note: 'Fresh and green, though without basil’s sweet aroma.' },
  ],
  scallion: [
    { id: 'onion', name: 'Onion', ratio: '¼ onion, very finely sliced', note: 'Sharper than spring onion, so use a little less.' },
  ],
  soy: [
    { id: 'tamari', name: 'Tamari', ratio: 'Same amount', note: 'Usually gluten-free soy sauce. Check the label.' },
  ],
  ginger: [
    { id: 'garlic', name: 'Extra garlic', ratio: '1 more clove', note: 'Different flavour, but keeps the base punchy.' },
  ],
  coconut: [
    { id: 'yogurt', name: 'Greek yogurt', ratio: '250 g, stirred in at the end', note: 'Tangier and lighter. Add off the heat.' },
    { id: 'oatmilk', name: 'Oat milk', ratio: 'Same amount', note: 'Thinner sauce. Simmer a few minutes longer.' },
  ],
  eggs: [
    { id: 'aquafaba', name: 'Aquafaba', ratio: '3 tbsp per egg', note: 'Works for binding in batters. Not suitable for omelettes or shakshuka.' },
  ],
  honey: [
    { id: 'maple', name: 'Maple syrup', ratio: 'Same amount', note: 'Vegan and just as glossy in glazes.' },
    { id: 'sugar', name: 'Sugar', ratio: '1 tbsp sugar per tbsp honey', note: 'Dissolve it in the sauce well.' },
  ],
  chicken: [
    { id: 'tofu', name: 'Firm tofu', ratio: 'Same weight, pressed and cubed', note: 'Brown it well first so it holds its shape.' },
    { id: 'chickpeas', name: 'Chickpeas', ratio: 'One 400 g tin per 250 g', note: 'Hearty and absorbs sauce beautifully.' },
  ],
  sesame: [],
  yogurt: [
    { id: 'coconut', name: 'Coconut milk', ratio: 'Same amount', note: 'Richer and dairy-free.' },
  ],
  chickpeas: [
    { id: 'mushroom', name: 'Mushrooms', ratio: '300 g, quartered', note: 'Meaty texture. Fry until golden before adding.' },
  ],
  spices: [
    { id: 'cumin', name: 'Cumin & paprika', ratio: '1 tsp each', note: 'Warm and earthy, a reasonable stand-in.' },
  ],
  cumin: [
    { id: 'spices', name: 'Garam masala', ratio: 'Same amount', note: 'A touch sweeter, still warming.' },
  ],
  bakingpowder: [],
  rice: [
    { id: 'bread', name: 'Toasted bread', ratio: '1–2 slices per person', note: 'For mopping up sauce instead of serving over rice.' },
  ],
  lemon: [],
  chilli: [
    { id: 'pepper', name: 'Bell pepper', ratio: '½ pepper, finely diced', note: 'Adds colour and sweetness instead of heat.' },
  ],
  flour: [],
  sugar: [
    { id: 'honey', name: 'Honey', ratio: '¾ of the amount', note: 'Reduce other liquid slightly.' },
  ],
}
