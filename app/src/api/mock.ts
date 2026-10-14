// Fake responses copied from docs/api-contract.md, used when EXPO_PUBLIC_USE_MOCK=true.

import type { ChefQuestion, DetectResult, Ingredient, OptionsResult, Profile, Recipe, SwapResult } from './types';

const wait = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

let profile: Profile = {
  id: 1, name: 'Sara', email: 'sara@example.com', age: 24,
  allergies: ['peanut'], diet: 'halal', household_size: 3,
};

export const mock = {
  async auth(name = 'Sara', email = 'sara@example.com') {
    await wait();
    profile = { ...profile, name, email };
    return { token: 'mock-token', user: { id: 1, name, email } };
  },

  async getProfile() {
    await wait(200);
    return profile;
  },

  async updateProfile(changes: Partial<Profile>) {
    await wait(300);
    profile = { ...profile, ...changes };
    return profile;
  },

  async ingredients(): Promise<{ detectable: Ingredient[]; staples: Ingredient[] }> {
    return {
      detectable: ['apple', 'banana', 'bread', 'carrot', 'cheese', 'chicken_breast', 'eggs', 'milk', 'onion', 'potato', 'tomato']
        .map((id) => ({ id, name: id.replace('_', ' ').replace(/^./, (c) => c.toUpperCase()) })),
      staples: [
        { id: 'milk', name: 'Milk' }, { id: 'eggs', name: 'Eggs' }, { id: 'butter_or_spread', name: 'Butter' },
        { id: null, name: 'Salt' }, { id: null, name: 'Cooking oil' },
      ],
    };
  },

  async detect(photoCount: number): Promise<DetectResult> {
    await wait(1200);
    return {
      photos: Array.from({ length: photoCount }, (_, index) => ({ index, width: 1000, height: 1000, detections: [] })),
      ingredients: [
        { id: 'eggs', name: 'Eggs', confidence: 0.91, count: 6, photos: [0] },
        { id: 'tomato', name: 'Tomato', confidence: 0.84, count: 3, photos: [0] },
        { id: 'onion', name: 'Onion', confidence: 0.77, count: 1, photos: [0] },
        { id: 'chicken_breast', name: 'Chicken breast', confidence: 0.69, count: 1, photos: [0] },
      ],
      ask_about_staples: [{ id: 'milk', name: 'Milk' }, { id: null, name: 'Salt' }, { id: null, name: 'Cooking oil' }],
      model: 'mock',
      elapsed_ms: 1200,
    };
  },

  async questions(): Promise<{ questions: ChefQuestion[] }> {
    return {
      questions: [
        { key: 'cuisine', text: 'What kind of food are you in the mood for?', options: ['Any', 'Italian', 'Indian', 'Asian', 'Middle Eastern', 'Mexican'] },
        { key: 'mood', text: 'How are you feeling?', options: ['Something quick', 'Comfort food', 'Something healthy', 'Something new'] },
        { key: 'max_minutes', text: 'How much time do you have?', options: ['15', '30', '60'] },
        { key: 'servings', text: 'How many people are eating?', options: ['1', '2', '3', '4', '6'] },
      ],
    };
  },

  async options(): Promise<OptionsResult> {
    await wait(1500);
    return {
      options: [
        { option_id: 'opt_1', title: 'Shakshuka', summary: 'Eggs poached in a spiced tomato sauce.', minutes: 25,
          uses: ['Eggs', 'Tomato', 'Onion'], missing: ['Cumin'], image_url: null, source: 'spoonacular' },
        { option_id: 'opt_2', title: 'Chicken Tomato Skillet', summary: 'Juicy chicken simmered with tomato and onion.', minutes: 30,
          uses: ['Chicken breast', 'Tomato', 'Onion'], missing: ['Garlic'], image_url: null, source: 'spoonacular' },
        { option_id: 'opt_3', title: 'Veggie Omelette', summary: 'A quick, fluffy omelette packed with vegetables.', minutes: 10,
          uses: ['Eggs', 'Onion', 'Tomato'], missing: [], image_url: null, source: 'llm' },
      ],
      removed_by_safety_filter: 1,
      notice: null,
    };
  },

  async recipe(servings: number): Promise<Recipe> {
    await wait(800);
    const k = servings / 2;
    return {
      recipe_id: 'rec_1', title: 'Shakshuka', servings, minutes: 25, image_url: null,
      ingredients: [
        { name: 'Eggs', quantity: 4 * k, unit: '', have: true },
        { name: 'Tomato', quantity: 3 * k, unit: '', have: true },
        { name: 'Onion', quantity: 1 * k, unit: '', have: true },
        { name: 'Cumin', quantity: 0.5 * k, unit: 'tsp', have: false },
      ],
      steps: ['Dice the onion and tomatoes.', 'Cook the onion for 5 minutes, add tomatoes and cumin, simmer for 10 minutes.',
        'Make wells, crack in the eggs, cover and cook for 6 minutes.'],
      safety: { checked: true, allergies: profile.allergies, diet: profile.diet },
    };
  },

  async swap(missing: string): Promise<SwapResult> {
    await wait(800);
    return { missing, swaps: [{ name: 'Paprika', note: 'Use the same amount for a smoky flavour.' }, { name: 'Coriander', note: 'Ground coriander, half the amount.' }] };
  },
};
