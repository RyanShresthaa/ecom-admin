// Unsplash URLs for seed + backfill. Tweak photos in one place.
// After changing: run `npm run backfill:images:force` in backend/
const u = (id) =>
  `https://images.unsplash.com/photo-${id}?w=800&h=800&auto=format&fit=crop&q=86&ixlib=rb-4.0.3`;

const P = {
  store: u("1604719312566-8912e9227c6a"),
  fruitBowl: u("1601004890684-d8cbf643f5f2"),
  apple: u("1560806887-1e4cd0b6cbd6"),
  greenApple: u("1610832958506-aa56368179cf"),
  redApple: u("1619546813924-a78fa6372c10"),
  banana: u("1603833665858-e61d17a86224"),
  veg: u("1540420773420-3366772f4999"),
  market: u("1488459716781-31db52583fe1"),
  cleaningAisle: u("1643107303813-077f2061cec1"),
  milk: u("1550583724-b2692b40b0b6"),
  eggs: u("1582722872445-44dc5f5e0c0d"),
  bread: u("1509440159596-0249088772ff"),
  pantry: u("1542838132-92c53300491e"),
  citrus: u("1571771894821-ce9b6c11b08e"),
  chipsBag: u("1641693148759-843d17ceac24"),
  toothpaste: u("1711779187508-a8fac1c18be9"),
  soapBar: u("1672736810221-611f53c1fc47"),
  shampoo: u("1701992678972-d5a053ad0fb0"),
  dishBottle: u("1647577746559-c9a28c0d0870"),
  coffee: u("1509042239860-f550ce710e0a"),
  dairyCup: u("1550583724-b2692b40b0b6"),
};

export const defaultGroceryImage = P.store;

const CATEGORY = {
  Fruits: P.fruitBowl,
  Vegetables: P.veg,
  "Dairy & Eggs": P.milk,
  Bakery: P.bread,
  Snacks: P.pantry,
  Beverages: P.citrus,
  "Rice & Atta": P.market,
  "Personal Care": P.shampoo,
  "Home Cleaning": P.cleaningAisle,
};

export function categoryImageFromName(name) {
  return CATEGORY[name] || P.store;
}

const SUB = {
  Apple: P.apple,
  Banana: P.banana,
  Mango: P.fruitBowl,
  "Leafy Greens": P.veg,
  "Root Vegetables": P.veg,
  "Exotic Vegetables": P.veg,
  Milk: P.milk,
  "Curd & Yogurt": P.dairyCup,
  Eggs: P.eggs,
  Bread: P.bread,
  "Cakes & Muffins": P.bread,
  Cookies: P.pantry,
  Chips: P.chipsBag,
  Namkeen: P.pantry,
  Chocolate: P.pantry,
  Juice: P.citrus,
  "Soft Drinks": P.citrus,
  "Tea & Coffee": P.coffee,
  Rice: P.market,
  Atta: P.bread,
  Pulses: P.market,
  Shampoo: P.shampoo,
  Soap: P.soapBar,
  Toothpaste: P.toothpaste,
  Dishwash: P.dishBottle,
  "Floor Cleaner": P.cleaningAisle,
  Laundry: P.cleaningAisle,
};

export function subCategoryImageFromName(name) {
  return SUB[name] || P.store;
}

// order matters — put picky rules before the loose ones
const PRODUCT_RULES = [
  [/^royal gala|^kashmiri apple|^apple pack/i, P.redApple],
  [/^green apple$/i, P.greenApple],
  [/^robusta banana|^yelakki|organic banana|banana premium/i, P.banana],
  [/^alphonso mango|^kesar mango|^badami|mango box/i, P.fruitBowl],
  [/^spinach$|^methi|coriander|mint leaves/i, P.veg],
  [/^potato$|^onion$|^carrot$|^beetroot$/i, P.veg],
  [/broccoli|bell pepper|zucchini|mushroom/i, P.veg],
  [/^toned milk$|^full cream milk|^a2 cow|^double toned milk/i, P.milk],
  [/^fresh curd$|^greek yogurt|^sweet lassi|^buttermilk/i, P.dairyCup],
  [/farm eggs|country eggs|protein eggs|white eggs/i, P.eggs],
  [/^whole wheat bread|^brown bread|multigrain|sandwich bread/i, P.bread],
  [/muffin|tea cake|swiss roll/i, P.bread],
  [/butter cookies|choco chip|oat cookies|jeera cookies/i, P.pantry],
  [/^dishwash bar$|dishwash scrub/i, P.soapBar],
  [/^dishwash|lemon dishwash|dishwash gel|dishwash liquid/i, P.dishBottle],
  [/^orange juice$|^mixed fruit|apple juice$|^mango drink$/i, P.citrus],
  [/^cola drink$|^lemon drink|orange soda|diet cola/i, P.citrus],
  [/^ctc tea$|^green tea$|instant coffee|filter coffee/i, P.coffee],
  [/chips$|kettle|masala chips|salted|onion chips/i, P.chipsBag],
  [/bhujia|navratan|moong dal namkeen|chivda/i, P.pantry],
  [/chocolate bar$|dark chocolate|hazelnut|wafer chocolate/i, P.pantry],
  [/basmati|sona masoori|brown rice|kolam rice/i, P.market],
  [/whole wheat atta|multigrain atta|sharbati|^maida$/i, P.bread],
  [/toor dal|moong dal|chana dal|masoor dal/i, P.market],
  [/herbal shampoo|anti dandruff|protein shampoo|daily use shampoo/i, P.shampoo],
  [/whitening|sensitive|kids|herbal|toothpaste/i, P.toothpaste],
  [/moisturizing soap|sandal|neem|aloe|soap/i, P.soapBar],
  [/floor cleaner|disinfectant|bathroom cleaner|detergent|fabric conditioner|detergent bars|laundry/i, P.cleaningAisle],
];

export function productImageFromName(name) {
  if (!name || typeof name !== "string") return P.store;
  for (const [re, url] of PRODUCT_RULES) {
    if (re.test(name)) return url;
  }
  return P.store;
}
