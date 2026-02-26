const ADJECTIVES = [
  "Blue", "Red", "Golden", "Silver", "Green", "Purple", "Orange", "Pink",
  "Cyan", "Magenta", "Yellow", "White", "Black", "Gray", "Brown",
  "Crimson", "Emerald", "Ruby", "Sapphire", "Amber", "Jade", "Coral",
  "Silent", "Wild", "Bright", "Dark", "Swift", "Brave", "Calm", "Bold",
  "Gentle", "Fierce", "Wise", "Happy", "Lucky", "Noble", "Royal", "Mystic",
  "Cosmic", "Electric", "Frozen", "Burning", "Rapid", "Slow", "Giant", "Tiny",
  "Clever", "Crafty", "Honest", "Kind", "Proud", "Shy", "Sly", "Strong",
  "Azure", "Copper", "Bronze", "Platinum", "Velvet", "Crystal", "Diamond",
  "Shadow", "Light", "Storm", "Thunder", "Rainbow", "Moon", "Star", "Sun"
]

const NOUNS = [
  "Panda", "Fox", "Eagle", "Tiger", "Lion", "Wolf", "Bear", "Hawk",
  "Dolphin", "Owl", "Cat", "Dog", "Rabbit", "Deer", "Falcon", "Raven",
  "Phoenix", "Dragon", "Unicorn", "Griffin", "Panther", "Leopard", "Jaguar",
  "Cheetah", "Lynx", "Cougar", "Stallion", "Mustang", "Bison", "Buffalo",
  "Cobra", "Viper", "Python", "Mamba", "Gecko", "Iguana", "Chameleon",
  "Octopus", "Squid", "Shark", "Whale", "Seal", "Otter", "Penguin",
  "Parrot", "Finch", "Sparrow", "Robin", "Cardinal", "Bluebird", "Crane",
  "Flamingo", "Peacock", "Swan", "Butterfly", "Bee", "Beetle", "Spider",
  "Turtle", "Tortoise", "Frog", "Toad", "Salamander", "Koala", "Kangaroo",
  "Raccoon", "Squirrel", "Chipmunk", "Beaver", "Hedgehog", "Badger",
  "Coyote", "Jackal", "Hyena", "Meerkat", "Lemur", "Mongoose",
  "Storm", "Fire", "Wind", "Wave", "Cloud", "Mist", "Frost", "Flame",
  "Spark", "Flash", "Bolt", "Blaze", "Glow", "Shine", "Shade", "Dawn",
  "Dusk", "Nova", "Comet", "Meteor", "Asteroid", "Galaxy", "Nebula", "Quasar"
]

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

export function generateRandomName(seed?: number): string {
  const adjIndex = seed !== undefined ? seed % ADJECTIVES.length : Math.floor(Math.random() * ADJECTIVES.length)
  const nounIndex = seed !== undefined ? (seed * 7) % NOUNS.length : Math.floor(Math.random() * NOUNS.length)
  
  return `${ADJECTIVES[adjIndex]} ${NOUNS[nounIndex]}`
}

export function generateNameFromIp(ipHash: string, postId: string): string {
  const combined = `${ipHash}:${postId}`
  const seed = hashCode(combined)
  return generateRandomName(seed)
}

export const REACTION_EMOJIS: Record<string, string> = {
  like: "👍",
  love: "❤️",
  laugh: "😂",
  wow: "😮",
  sad: "😢",
  fire: "🔥",
}

export const REACTION_TYPES = ["like", "love", "laugh", "wow", "sad", "fire"] as const
export type ReactionType = typeof REACTION_TYPES[number]
