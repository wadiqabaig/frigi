import { normalize, words } from './text'

// Picks an icon and a category for ANY ingredient name, so recipes from
// Spoonacular or Gemini get a sensible picture without a per-recipe list.
// Order of lookup: exact phrase -> head word (English names put the food last:
// "ground beef", "chicken breast") -> any other word -> neutral plate.

export type FoodCategory =
  | 'meat' | 'poultry' | 'seafood' | 'dairy' | 'egg' | 'vegetable' | 'fruit' | 'grain'
  | 'legume' | 'nut' | 'herb' | 'spice' | 'sauce' | 'sweet' | 'drink' | 'other'

export type GlyphKey =
  | 'steak' | 'mince' | 'ham' | 'sausage' | 'chicken' | 'fish' | 'salmon' | 'shrimp'
  | 'milk' | 'plantmilk' | 'cream' | 'cheese' | 'softcheese' | 'butter' | 'yogurt' | 'eggs'
  | 'tomato' | 'onion' | 'garlic' | 'carrot' | 'potato' | 'sweetpotato' | 'pepper' | 'chilli'
  | 'greenchilli' | 'broccoli' | 'leafy' | 'cabbage' | 'cucumber' | 'eggplant' | 'mushroom'
  | 'corn' | 'greenbeans' | 'scallion' | 'ginger'
  | 'apple' | 'banana' | 'lemon' | 'lime' | 'orange' | 'strawberry' | 'berries' | 'coconut'
  | 'bread' | 'pasta' | 'rice' | 'flour' | 'beans' | 'tofu' | 'nut' | 'sesame'
  | 'herb' | 'spice' | 'salt' | 'oil' | 'sauce' | 'stock' | 'sugar' | 'honey' | 'chocolate'
  | 'juice' | 'can' | 'water' | 'plate'

type Rule = [GlyphKey, FoodCategory]

const PHRASES: Record<string, Rule> = {
  'ground beef': ['mince', 'meat'], 'minced beef': ['mince', 'meat'], 'ground lamb': ['mince', 'meat'],
  'ground pork': ['mince', 'meat'], 'ground turkey': ['mince', 'poultry'], 'ground chicken': ['mince', 'poultry'],
  'peanut butter': ['nut', 'nut'], 'almond butter': ['nut', 'nut'], 'nut butter': ['nut', 'nut'],
  'cocoa butter': ['chocolate', 'sweet'], 'butter bean': ['beans', 'legume'], 'butternut squash': ['sweetpotato', 'vegetable'],
  'coconut milk': ['coconut', 'fruit'], 'coconut cream': ['coconut', 'fruit'], 'plant milk': ['plantmilk', 'drink'],
  'oat milk': ['plantmilk', 'drink'], 'soy milk': ['plantmilk', 'drink'], 'almond milk': ['plantmilk', 'drink'],
  'rice milk': ['plantmilk', 'drink'], 'sweet potato': ['sweetpotato', 'vegetable'], 'bell pepper': ['pepper', 'vegetable'],
  'black pepper': ['spice', 'spice'], 'white pepper': ['spice', 'spice'], 'green chili': ['greenchilli', 'vegetable'],
  'green chilli': ['greenchilli', 'vegetable'], 'green bean': ['greenbeans', 'vegetable'], 'spring onion': ['scallion', 'vegetable'],
  'green onion': ['scallion', 'vegetable'], 'leafy green': ['leafy', 'vegetable'], 'fizzy drink': ['can', 'drink'],
  'water bottle': ['water', 'drink'], 'sour cream': ['cream', 'dairy'], 'ice cream': ['cream', 'sweet'],
  'cream cheese': ['softcheese', 'dairy'], 'goat cheese': ['softcheese', 'dairy'], 'egg plant': ['eggplant', 'vegetable'],
  'soy sauce': ['sauce', 'sauce'], 'fish sauce': ['sauce', 'sauce'], 'baking powder': ['flour', 'grain'],
  'baking soda': ['flour', 'grain'], 'corn starch': ['flour', 'grain'], 'olive oil': ['oil', 'sauce'],
}

const WORDS: Record<string, Rule> = {
  // meat
  beef: ['steak', 'meat'], steak: ['steak', 'meat'], lamb: ['steak', 'meat'], mutton: ['steak', 'meat'],
  veal: ['steak', 'meat'], venison: ['steak', 'meat'], goat: ['steak', 'meat'], brisket: ['steak', 'meat'],
  rib: ['steak', 'meat'], meat: ['steak', 'meat'], mince: ['mince', 'meat'], meatball: ['mince', 'meat'],
  burger: ['mince', 'meat'], pork: ['ham', 'meat'], ham: ['ham', 'meat'], bacon: ['ham', 'meat'],
  prosciutto: ['ham', 'meat'], pancetta: ['ham', 'meat'], salami: ['sausage', 'meat'], pepperoni: ['sausage', 'meat'],
  chorizo: ['sausage', 'meat'], sausage: ['sausage', 'meat'], hotdog: ['sausage', 'meat'],
  // poultry
  chicken: ['chicken', 'poultry'], turkey: ['chicken', 'poultry'], duck: ['chicken', 'poultry'],
  breast: ['chicken', 'poultry'], thigh: ['chicken', 'poultry'], drumstick: ['chicken', 'poultry'], wing: ['chicken', 'poultry'],
  // seafood
  fish: ['fish', 'seafood'], cod: ['fish', 'seafood'], tuna: ['fish', 'seafood'], haddock: ['fish', 'seafood'],
  tilapia: ['fish', 'seafood'], mackerel: ['fish', 'seafood'], sardine: ['fish', 'seafood'], anchovy: ['fish', 'seafood'],
  trout: ['salmon', 'seafood'], salmon: ['salmon', 'seafood'], shrimp: ['shrimp', 'seafood'], prawn: ['shrimp', 'seafood'],
  crab: ['shrimp', 'seafood'], lobster: ['shrimp', 'seafood'], mussel: ['shrimp', 'seafood'], clam: ['shrimp', 'seafood'],
  squid: ['shrimp', 'seafood'], calamari: ['shrimp', 'seafood'], scallop: ['shrimp', 'seafood'],
  // dairy and eggs
  milk: ['milk', 'dairy'], buttermilk: ['milk', 'dairy'], cream: ['cream', 'dairy'], cheese: ['cheese', 'dairy'],
  cheddar: ['cheese', 'dairy'], parmesan: ['cheese', 'dairy'], gouda: ['cheese', 'dairy'], mozzarella: ['softcheese', 'dairy'],
  feta: ['softcheese', 'dairy'], ricotta: ['softcheese', 'dairy'], paneer: ['softcheese', 'dairy'], halloumi: ['softcheese', 'dairy'],
  butter: ['butter', 'dairy'], spread: ['butter', 'dairy'], ghee: ['butter', 'dairy'], margarine: ['butter', 'dairy'],
  yogurt: ['yogurt', 'dairy'], yoghurt: ['yogurt', 'dairy'], curd: ['yogurt', 'dairy'], egg: ['eggs', 'egg'],
  // vegetables
  tomato: ['tomato', 'vegetable'], onion: ['onion', 'vegetable'], shallot: ['onion', 'vegetable'], leek: ['scallion', 'vegetable'],
  scallion: ['scallion', 'vegetable'], garlic: ['garlic', 'vegetable'], carrot: ['carrot', 'vegetable'], potato: ['potato', 'vegetable'],
  pepper: ['pepper', 'vegetable'], capsicum: ['pepper', 'vegetable'], chili: ['chilli', 'vegetable'], chilli: ['chilli', 'vegetable'],
  chile: ['chilli', 'vegetable'], chily: ['chilli', 'vegetable'], jalapeno: ['greenchilli', 'vegetable'],
  broccoli: ['broccoli', 'vegetable'], cauliflower: ['broccoli', 'vegetable'], spinach: ['leafy', 'vegetable'],
  lettuce: ['leafy', 'vegetable'], kale: ['leafy', 'vegetable'], greens: ['leafy', 'vegetable'], green: ['leafy', 'vegetable'],
  rocket: ['leafy', 'vegetable'], arugula: ['leafy', 'vegetable'], chard: ['leafy', 'vegetable'], cabbage: ['cabbage', 'vegetable'],
  sprout: ['cabbage', 'vegetable'], cucumber: ['cucumber', 'vegetable'], zucchini: ['cucumber', 'vegetable'],
  courgette: ['cucumber', 'vegetable'], celery: ['scallion', 'vegetable'], asparagus: ['greenbeans', 'vegetable'],
  eggplant: ['eggplant', 'vegetable'], aubergine: ['eggplant', 'vegetable'], mushroom: ['mushroom', 'vegetable'],
  corn: ['corn', 'vegetable'], sweetcorn: ['corn', 'vegetable'], pea: ['greenbeans', 'vegetable'], okra: ['greenbeans', 'vegetable'],
  ginger: ['ginger', 'vegetable'], beetroot: ['onion', 'vegetable'], radish: ['onion', 'vegetable'], squash: ['sweetpotato', 'vegetable'],
  pumpkin: ['sweetpotato', 'vegetable'], yam: ['sweetpotato', 'vegetable'], avocado: ['lime', 'fruit'], olive: ['lime', 'fruit'],
  // fruit
  apple: ['apple', 'fruit'], pear: ['apple', 'fruit'], banana: ['banana', 'fruit'], plantain: ['banana', 'fruit'],
  lemon: ['lemon', 'fruit'], lime: ['lime', 'fruit'], orange: ['orange', 'fruit'], mandarin: ['orange', 'fruit'],
  clementine: ['orange', 'fruit'], grapefruit: ['orange', 'fruit'], peach: ['orange', 'fruit'], apricot: ['orange', 'fruit'],
  mango: ['orange', 'fruit'], pineapple: ['orange', 'fruit'], melon: ['lime', 'fruit'], watermelon: ['lime', 'fruit'],
  kiwi: ['lime', 'fruit'], strawberry: ['strawberry', 'fruit'], raspberry: ['strawberry', 'fruit'], cherry: ['strawberry', 'fruit'],
  blueberry: ['berries', 'fruit'], berry: ['berries', 'fruit'], blackberry: ['berries', 'fruit'], grape: ['berries', 'fruit'],
  raisin: ['berries', 'fruit'], date: ['berries', 'fruit'], fig: ['berries', 'fruit'], coconut: ['coconut', 'fruit'],
  // grains and bakery
  bread: ['bread', 'grain'], toast: ['bread', 'grain'], bun: ['bread', 'grain'], roll: ['bread', 'grain'],
  bagel: ['bread', 'grain'], baguette: ['bread', 'grain'], naan: ['bread', 'grain'], pita: ['bread', 'grain'],
  tortilla: ['bread', 'grain'], wrap: ['bread', 'grain'], breadcrumb: ['bread', 'grain'], pasta: ['pasta', 'grain'],
  spaghetti: ['pasta', 'grain'], penne: ['pasta', 'grain'], macaroni: ['pasta', 'grain'], noodle: ['pasta', 'grain'],
  lasagna: ['pasta', 'grain'], fusilli: ['pasta', 'grain'], rice: ['rice', 'grain'], quinoa: ['rice', 'grain'],
  couscous: ['rice', 'grain'], bulgur: ['rice', 'grain'], oat: ['rice', 'grain'], oatmeal: ['rice', 'grain'],
  barley: ['rice', 'grain'], cereal: ['rice', 'grain'], flour: ['flour', 'grain'], cornmeal: ['flour', 'grain'], yeast: ['flour', 'grain'],
  // legumes, nuts, seeds
  bean: ['beans', 'legume'], chickpea: ['beans', 'legume'], lentil: ['beans', 'legume'], dal: ['beans', 'legume'],
  hummus: ['beans', 'legume'], tofu: ['tofu', 'legume'], tempeh: ['tofu', 'legume'], edamame: ['greenbeans', 'legume'],
  nut: ['nut', 'nut'], peanut: ['nut', 'nut'], almond: ['nut', 'nut'], cashew: ['nut', 'nut'], walnut: ['nut', 'nut'],
  pistachio: ['nut', 'nut'], hazelnut: ['nut', 'nut'], pecan: ['nut', 'nut'], sesame: ['sesame', 'nut'], tahini: ['sesame', 'nut'],
  seed: ['sesame', 'nut'],
  // herbs and spices
  basil: ['herb', 'herb'], parsley: ['herb', 'herb'], coriander: ['herb', 'herb'], cilantro: ['herb', 'herb'],
  mint: ['herb', 'herb'], dill: ['herb', 'herb'], thyme: ['herb', 'herb'], rosemary: ['herb', 'herb'], oregano: ['herb', 'herb'],
  sage: ['herb', 'herb'], chive: ['scallion', 'herb'], leaf: ['herb', 'herb'], leave: ['herb', 'herb'], herb: ['herb', 'herb'],
  salt: ['salt', 'spice'], cumin: ['spice', 'spice'], paprika: ['spice', 'spice'], turmeric: ['spice', 'spice'],
  cinnamon: ['spice', 'spice'], nutmeg: ['spice', 'spice'], masala: ['spice', 'spice'], curry: ['spice', 'spice'],
  powder: ['spice', 'spice'], spice: ['spice', 'spice'], seasoning: ['spice', 'spice'], clove: ['spice', 'spice'],
  cardamom: ['spice', 'spice'], saffron: ['spice', 'spice'], vanilla: ['spice', 'spice'], flake: ['spice', 'spice'],
  // sauces, oils, stocks
  oil: ['oil', 'sauce'], vinegar: ['oil', 'sauce'], sauce: ['sauce', 'sauce'], ketchup: ['sauce', 'sauce'],
  mayonnaise: ['sauce', 'sauce'], mayo: ['sauce', 'sauce'], mustard: ['sauce', 'sauce'], pesto: ['sauce', 'sauce'],
  salsa: ['sauce', 'sauce'], dressing: ['sauce', 'sauce'], paste: ['sauce', 'sauce'], puree: ['sauce', 'sauce'],
  stock: ['stock', 'sauce'], broth: ['stock', 'sauce'], bouillon: ['stock', 'sauce'],
  // sweet things
  sugar: ['sugar', 'sweet'], honey: ['honey', 'sweet'], syrup: ['honey', 'sweet'], jam: ['honey', 'sweet'],
  chocolate: ['chocolate', 'sweet'], cocoa: ['chocolate', 'sweet'], cake: ['chocolate', 'sweet'], biscuit: ['chocolate', 'sweet'],
  cookie: ['chocolate', 'sweet'],
  // drinks
  water: ['water', 'drink'], juice: ['juice', 'drink'], soda: ['can', 'drink'], cola: ['can', 'drink'],
  drink: ['can', 'drink'], wine: ['juice', 'drink'], beer: ['can', 'drink'], coffee: ['can', 'drink'], tea: ['herb', 'drink'],
}

export interface IngredientVisual { glyph: GlyphKey; category: FoodCategory }

const FALLBACK: IngredientVisual = { glyph: 'plate', category: 'other' }

// Picks the glyph and category for an ingredient name, using the detector id when known.
export function ingredientVisual(name: string, id?: string | null): IngredientVisual {
  for (const source of [id ?? '', name]) {
    if (!source) continue
    const phrase = words(source).join(' ')
    for (const [p, rule] of Object.entries(PHRASES)) {
      if (phrase === p || phrase.endsWith(' ' + p) || phrase.startsWith(p + ' ') || phrase.includes(' ' + p + ' ')) {
        return { glyph: rule[0], category: rule[1] }
      }
    }
    const w = words(source)
    for (let i = w.length - 1; i >= 0; i--) {
      const rule = WORDS[w[i]] ?? WORDS[normalize(w[i])]
      if (rule) return { glyph: rule[0], category: rule[1] }
    }
  }
  return FALLBACK
}
