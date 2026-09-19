// answers.js
// The curated list of possible SECRET words for BLINDLE, grouped by
// word length (4 through 20 letters). Every word here is a real,
// recognizable English word - and deliberately NOT a word that's just
// another (shorter) word in this file with a lazy "s" tacked on (we
// use FOOD, not FOODS; MINERAL, not MINERALS; TELECOMMUNICATION, not
// TELECOMMUNICATIONS). Longer lengths naturally have fewer options -
// genuinely common 18-20 letter English words are rare - but every
// length has at least a couple of solid choices.
//
// This is separate from the guess dictionary (see dictionary.js), which
// is enormous (370,000+ words) and used only to check whether a viewer's
// comment is a real, guessable word.

export const ANSWER_WORDS = {
  4: [
    "bear", "beef", "bell", "belt", "bird", "book",
    "boot", "cake", "calf", "camp", "cape", "chef",
    "clam", "club", "colt", "cook", "corn", "crab",
    "crow", "deer", "desk", "drum", "duck", "fawn",
    "fire", "fish", "flag", "foal", "frog", "game",
    "gift", "goat", "gold", "gong", "harp", "hawk",
    "hero", "hike", "horn", "jump", "king", "knot",
    "lake", "lamb", "lamp", "leaf", "lion", "lynx",
    "maid", "meat", "milk", "moon", "mule", "pork",
    "puma", "race", "rain", "rice", "ring", "robe",
    "rope", "salt", "seal", "seed", "ship", "shoe",
    "snow", "sock", "soup", "star", "swim", "team",
    "tent", "toad", "tree", "veil", "vest", "wolf",
  ],
  5: [
    "apple", "basil", "beach", "blaze", "bread", "cable",
    "candy", "chaos", "crown", "dance", "dress", "drift",
    "eagle", "earth", "empty", "fable", "flame", "frost",
    "ghost", "glide", "grape", "graph", "heart", "hence",
    "honey", "hotel", "igloo", "image", "intro", "ivory",
    "joker", "jolly", "juice", "karma", "knife", "knock",
    "laser", "lemon", "lemur", "lodge", "lurch", "magic",
    "mango", "medal", "niche", "noble", "north", "oasis",
    "ocean", "opine", "orbit", "piano", "plant", "queen",
    "quilt", "river", "robot", "sauna", "scrub", "shark",
    "siege", "slept", "storm", "tiger", "today", "train",
    "ultra", "unity", "vivid", "voice", "watch", "witch",
    "yield", "youth", "zebra", "zesty",
  ],
  6: [
    "almond", "anchor", "basket", "bridge", "canyon", "castle",
    "doodle", "dragon", "emblem", "engine", "falcon", "forest",
    "galaxy", "garden", "global", "guitar", "hammer", "harbor",
    "icicle", "insect", "island", "jacket", "jigsaw", "jungle",
    "kettle", "lagoon", "marble", "master", "nature", "notion",
    "orange", "output", "pickle", "planet", "purple", "quartz",
    "quiver", "rabbit", "ribbon", "silver", "spirit", "temple",
    "turtle", "unique", "velvet", "voyage", "walnut", "window",
    "wizard", "yellow", "yogurt", "zenith", "zodiac",
  ],
  7: [
    "amazing", "anxiety", "cabinet", "capital", "captain", "capture",
    "century", "chicken", "delight", "diamond", "dolphin", "elegant",
    "evening", "fantasy", "fortune", "freedom", "gallery", "glacier",
    "harmony", "healthy", "holiday", "imagine", "jealous", "journal",
    "journey", "kingdom", "kitchen", "knuckle", "lantern", "leopard",
    "machine", "mammoth", "morning", "network", "notable", "octopus",
    "opinion", "organic", "package", "painter", "picture", "plastic",
    "popcorn", "problem", "pumpkin", "purpose", "quality", "quantum",
    "rainbow", "reality", "reptile", "sadness", "sandbox", "scholar",
    "shampoo", "shelter", "silence", "society", "special", "station",
    "student", "surface", "teacher", "texture", "theater", "thunder",
    "tornado", "tourist", "trouble", "trumpet", "unicorn", "uniform",
    "vampire", "vehicle", "village", "volcano", "weather", "welcome",
    "whisper", "wildcat",
  ],
  8: [
    "aquarium", "backpack", "baseball", "birthday", "bookcase", "boundary",
    "calendar", "computer", "elephant", "exercise", "favorite", "festival",
    "hospital", "medicine", "mountain", "official", "original", "painting",
    "personal", "physical", "possible", "powerful", "practice", "princess",
    "resource", "romantic", "sandwich", "sapphire", "seashore", "shoulder",
    "solution", "specimen", "spectrum", "standard", "strategy", "sunlight",
    "sunshine", "surprise", "symphony", "template", "terminal", "textbook",
    "tomorrow", "training", "traveler", "treasure", "triangle", "tricycle",
    "umbrella", "vacation", "valuable", "vertical", "wardrobe", "wildlife",
  ],
  9: [
    "adventure", "blueberry", "bookshelf", "butterfly", "chocolate", "education",
    "furniture", "generator", "geography", "inventory", "knowledge", "landscape",
    "marketing", "mechanism", "messenger", "migration", "monastery", "necessary",
    "newspaper", "nightmare", "obviously", "operation", "orchestra", "passenger",
    "playhouse", "porcupine", "principle", "procedure", "satellite", "situation",
    "sophomore", "structure", "telephone", "telescope", "territory", "therapist",
    "variation", "vegetable", "versatile", "violation", "volunteer", "warehouse",
    "waterfall", "xylophone", "zookeeper",
  ],
  10: [
    "ambassador", "basketball", "demolition", "dictionary", "discipline", "earthquake",
    "economical", "evaluation", "eyewitness", "footprints", "foundation", "generation",
    "government", "greenhouse", "homecoming", "importance", "indication", "invitation",
    "journalist", "laboratory", "literature", "medication", "membership", "microphone",
    "microscope", "motivation", "mysterious", "nomination", "occupation", "paintbrush",
    "particular", "passageway", "perception", "permission", "persuasive", "philosophy",
    "photograph", "population", "prevention", "production", "proportion", "protection",
    "questioner", "reflection", "regulation", "relaxation", "renovation", "reputation",
    "resistance", "resolution", "restaurant", "revelation", "revolution", "separation",
    "simplicity", "skateboard", "specialist", "strawberry", "suggestion", "supervisor",
    "surrounded", "technician", "technology", "television", "terrifying", "thermostat",
    "thoughtful", "tournament", "transition", "tremendous", "undergoing", "understand",
    "unforeseen", "university", "vegetarian", "vocabulary", "volleyball", "watermelon",
    "wilderness", "xenophobia", "yesteryear",
  ],
  11: [
    "celebration", "combination", "communicate", "corporation", "correlation", "electricity",
    "elimination", "engineering", "environment", "examination", "exploration", "fascinating",
    "handwriting", "imagination", "improvement", "information", "inspiration", "institution",
    "instruction", "integration", "involvement", "legislation", "magnificent", "maintenance",
    "mathematics", "negotiation", "observation", "opportunity", "orientation", "originality",
    "partnership", "penetration", "performance", "personality", "perspective", "possibility",
    "prehistoric", "preparation", "probability", "publication", "punctuation", "quicksilver",
    "realization", "recognition", "refreshment", "remembrance", "requirement", "responsible",
    "restoration", "scholarship", "sensitivity", "significant", "spectacular", "stimulation",
    "substantial", "supervision", "sustainable", "sympathetic", "temperature", "terminology",
    "transaction", "translation", "uncertainty", "undertaking", "universally", "unnecessary",
    "vaccination", "warehousing",
  ],
  12: [
    "appreciation", "championship", "choreography", "circumstance", "congregation", "constructing",
    "construction", "consultation", "conversation", "coordination", "deregulation", "distribution",
    "encyclopedia", "exhilarating", "experimental", "illustration", "inauguration", "independence",
    "installation", "intervention", "introduction", "manipulation", "metropolitan", "nonrenewable",
    "notification", "organization", "prescription", "presentation", "preservation", "professional",
    "refrigerator", "registration", "relationship", "reproduction", "respectively", "satisfaction",
    "subscription", "substitution", "surveillance", "transmission", "unemployment", "verification",
    "veterinarian",
  ],
  13: [
    "autobiography", "biotechnology", "collaboration", "commemoration", "comprehension", "concentration",
    "confrontation", "consideration", "constellation", "contamination", "deforestation", "demonstration",
    "determination", "documentation", "dysfunctional", "effectiveness", "enlightenment", "entertainment",
    "establishment", "gravitational", "incontestable", "incorporation", "investigation", "manufacturing",
    "mediterranean", "microorganism", "participation", "qualification", "reforestation", "revolutionary",
    "sophisticated", "specification", "understanding", "unpredictable", "visualization", "vulnerability",
  ],
  14: [
    "accountability", "administration", "classification", "discrimination", "implementation", "industrialized",
    "infrastructure", "interpretation", "multiplication", "nanotechnology", "overpopulation", "philanthropist",
    "photosynthesis", "recommendation", "reconstruction", "representation", "responsiveness", "transportation",
    "uncontrollable", "understatement",
  ],
  15: [
    "congratulations", "counterargument", "deindustrialize", "disillusionment", "extraordinarily", "incompatibility",
    "individualistic", "interdependence", "overachievement", "overcomplicated", "overrepresented", "photojournalism",
    "professionalism", "reconceptualize", "recontextualize", "straightforward", "underestimation", "underpopulation",
  ],
  16: [
    "characterization", "compartmentalize", "counterintuitive", "disestablishment", "disproportionate", "entrepreneurship",
    "environmentalism", "extraterrestrial", "hypersensitivity", "hyperventilating", "immunodeficiency", "incomprehensible",
    "incontrovertible", "institutionalize", "internationalize", "irresponsibility", "microengineering", "misappropriation",
    "misunderstanding", "multiculturalism", "multidimensional", "overcompensation", "transcontinental", "unaccountability",
    "uncharacteristic", "unconstitutional", "unconventionally", "underachievement", "underrepresented", "unsustainability",
  ],
  17: [
    "constitutionality", "counterproductive", "indistinguishable", "industrialization", "interdisciplinary", "intergovernmental",
    "internationalized", "interrelationship", "irreproducibility", "misrepresentation", "nondiscriminatory", "overqualification",
    "telecommunication",
  ],
  18: [
    "deinstitutionalize", "disproportionately", "interconnectedness", "overgeneralization", "underqualification",
  ],
  19: [
    "counterproductively", "deindustrialization", "professionalization", "reindustrialization",
  ],
  20: [
    "counterrevolutionary", "internationalization",
  ],
};

export const MIN_WORD_LENGTH = 4;
export const MAX_WORD_LENGTH = 20;