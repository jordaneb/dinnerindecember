'use strict';

// Everything you'd want to change lives here. Edit, restart, done.

const closingDate = '15 November at 5pm';

// Admin-only bill estimate: an average drinks spend per person who has ordered.
const drinksPerPerson = 20;

const site = {
  kicker: 'Dinner in December',
  heading: 'Dinner in December',
  intro:
    'Pick your main, tell us if there’s anything you’d like left off, and let us know about any allergies or special requirements.',
  closingDate,
  closingNote: `You can come back and change this any time using the same link, until ${closingDate}.`,
  footer: 'Any trouble at all, just message us.',
};

// Prices are numbers so the admin page can add up the estimated bill.
// They are never shown to guests.
const mainCategories = [
  {
    id: 'mains',
    name: 'Mains',
    items: [
      {
        id: 'corned-beef-hash',
        name: 'Corned Beef Hash',
        price: 18,
        desc: 'Topped with melted cheese and a fried egg.',
        amends: ['Melted cheese', 'Fried egg'],
      },
      {
        id: 'pie-of-the-day',
        name: 'Pie of the Day',
        price: 21,
        desc: 'Served with gravy and seasonal veg.',
        choice: { label: 'Potatoes', options: ['Mash', 'Chips'] },
        amends: ['Gravy', 'Seasonal veg'],
      },
      {
        id: 'fish-and-chips',
        name: 'Harvey’s Beer Battered Fish',
        price: 21,
        desc: 'Chips, garden peas and tartare sauce.',
        amends: ['Chips', 'Garden peas', 'Tartare sauce'],
      },
      {
        id: 'house-burger',
        name: 'House Burger',
        price: 21,
        desc: 'With cheese, fries, coleslaw, burger relish and crispy onions.',
        amends: ['Cheese', 'Coleslaw', 'Burger relish', 'Crispy onions'],
      },
      {
        id: 'beetroot-burger',
        name: 'Beetroot Burger',
        price: 20,
        desc: 'With fries, coleslaw, burger relish and crispy onions.',
        tags: ['V', 'VE'],
        amends: ['Coleslaw', 'Burger relish', 'Crispy onions'],
      },
      {
        id: 'cajun-chicken-burger',
        name: 'Cajun Chicken Burger',
        price: 21,
        desc: 'With bacon and cheese, fries, coleslaw, burger relish and crispy onions.',
        tags: ['GF available'],
        amends: ['Bacon', 'Cheese', 'Coleslaw', 'Burger relish', 'Crispy onions'],
      },
      {
        id: 'king-prawn-linguini',
        name: 'Linguini with King Prawns and Chilli',
        price: 18,
        desc: 'Served with garlic bread.',
        amends: ['Chilli', 'Garlic bread'],
      },
      {
        id: 'rump-steak',
        name: 'Rump Steak',
        price: 25,
        desc: 'With grilled tomato, garlic mushrooms, chips and salad.',
        tags: ['GF'],
        amends: ['Grilled tomato', 'Garlic mushrooms', 'Salad'],
      },
      {
        id: 'sirloin-steak',
        name: 'Sirloin Steak',
        price: 29,
        desc: 'With grilled tomato, garlic mushrooms, chips and salad.',
        amends: ['Grilled tomato', 'Garlic mushrooms', 'Salad'],
      },
      {
        id: 'scottish-mussels',
        name: 'Scottish Mussels',
        price: 19,
        desc: 'In a cream and white wine sauce, served with a bowl of fries.',
        amends: ['Fries'],
      },
      {
        id: 'thai-vegetable-curry',
        name: 'Chef’s Thai Vegetable Curry',
        price: 18,
        desc: 'Served with rice and a poppadom.',
        tags: ['V'],
        amends: ['Poppadom'],
      },
      {
        id: 'roasted-salmon',
        name: 'Roasted Salmon Fillet',
        price: 20,
        desc: 'On a bed of mange tout, cherry tomatoes and spring onions with sauté potatoes and herb butter.',
        tags: ['GF'],
        amends: ['Mange tout', 'Cherry tomatoes', 'Spring onions', 'Herb butter'],
      },
      {
        id: 'hebridean-chicken',
        name: 'Hebridean Chicken',
        price: 21,
        desc: 'Chicken breast filled with Scottish black pudding, served with neeps and tatties, roasted root veg and a peppercorn sauce.',
        amends: ['Black pudding', 'Peppercorn sauce'],
      },
    ],
  },
  {
    id: 'light-bites',
    name: 'Lunchtime light bites',
    note: 'Toasted ciabatta with salad.',
    items: [
      {
        id: 'blt-ciabatta',
        name: 'Bacon, Lettuce & Tomato',
        price: 12.5,
        desc: 'Toasted ciabatta with salad.',
        amends: ['Salad'],
      },
      {
        id: 'cheddar-red-onion-ciabatta',
        name: 'Cheddar & Red Onion',
        price: 12,
        desc: 'Toasted ciabatta with salad.',
        amends: ['Salad'],
      },
      {
        id: 'sausage-onion-jam-ciabatta',
        name: 'Sausage & Onion Jam',
        price: 12.5,
        desc: 'Toasted ciabatta with salad.',
        amends: ['Salad'],
      },
      {
        id: 'fish-goujon-ciabatta',
        name: 'Fish Goujon & Tartare Sauce',
        price: 13.5,
        desc: 'Toasted ciabatta with salad.',
        amends: ['Tartare sauce', 'Salad'],
      },
      {
        id: 'hummus-red-pepper-ciabatta',
        name: 'Hummus & Red Pepper',
        price: 12,
        desc: 'Toasted ciabatta with salad.',
        tags: ['V', 'VE'],
        amends: ['Salad'],
      },
    ],
  },
  {
    id: 'smaller-portions',
    name: 'Smaller portions',
    note: 'A lighter lunch.',
    items: [
      {
        id: 'small-macaroni-cheese',
        name: 'Chef’s Macaroni Cheese',
        price: 10,
        desc: 'With garlic bread.',
        tags: ['V'],
        amends: ['Garlic bread'],
      },
      {
        id: 'small-cod-goujons',
        name: 'Cod Goujons & Chips',
        price: 10,
        desc: 'With mushy peas and tartare sauce.',
        amends: ['Mushy peas', 'Tartare sauce'],
      },
      {
        id: 'small-cottage-pie',
        name: 'Cottage Pie',
        price: 10,
        desc: 'With seasonal vegetables.',
        tags: ['GF'],
        amends: ['Seasonal vegetables'],
      },
      {
        id: 'small-sausage-mash',
        name: 'Sausage & Mash',
        price: 10,
        desc: 'With onion gravy and garden peas.',
        amends: ['Onion gravy', 'Garden peas'],
      },
    ],
  },
];

// Dessert prices weren't listed on the menu — these are estimates so the
// admin total is roughly right. Change them freely.
const desserts = [
  {
    id: 'sticky-toffee-pudding',
    name: 'Chef’s Sticky Toffee Pudding',
    price: 7,
    desc: 'With toffee sauce and vanilla ice cream.',
    amends: ['Toffee sauce', 'Vanilla ice cream'],
  },
  {
    id: 'chocolate-brownie',
    name: 'Chocolate Brownie',
    price: 7,
    desc: 'With vanilla ice cream.',
    amends: ['Vanilla ice cream'],
  },
  {
    id: 'bread-and-butter-pudding',
    name: 'Pantone Bread and Butter Pudding',
    price: 7,
    desc: 'With custard.',
    amends: ['Custard'],
  },
  {
    id: 'lemon-lime-cheesecake',
    name: 'Chef’s Lemon and Lime Cheesecake',
    price: 7,
    desc: 'With cream.',
    amends: ['Cream'],
  },
  {
    id: 'black-cherry-trifle',
    name: 'Black Cherry and White Chocolate Trifle',
    price: 7,
    desc: '',
    amends: [],
  },
  {
    id: 'millionaires-tart',
    name: 'Chocolate Millionaires Tart',
    price: 7,
    desc: 'With raspberry sorbet.',
    amends: ['Raspberry sorbet'],
  },
  {
    id: 'ice-cream-sorbet',
    name: 'Ice Cream or Sorbet',
    price: 2.5,
    desc: 'Decide on the day which flavour you’d like.',
    amends: [],
  },
];

const allMains = mainCategories.flatMap((category) => category.items);

const findMain = (id) => allMains.find((item) => item.id === id) || null;
const findDessert = (id) => desserts.find((item) => item.id === id) || null;

const priceOf = (item) => (item && typeof item.price === 'number' ? item.price : 0);

module.exports = {
  site,
  drinksPerPerson,
  mainCategories,
  allMains,
  desserts,
  findMain,
  findDessert,
  priceOf,
};
