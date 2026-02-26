import random

ADJECTIVES = [
    "Blue",
    "Red",
    "Golden",
    "Silver",
    "Green",
    "Purple",
    "Orange",
    "Pink",
    "Cyan",
    "Magenta",
    "Yellow",
    "White",
    "Black",
    "Gray",
    "Brown",
    "Crimson",
    "Emerald",
    "Ruby",
    "Sapphire",
    "Amber",
    "Jade",
    "Coral",
    "Silent",
    "Wild",
    "Bright",
    "Dark",
    "Swift",
    "Brave",
    "Calm",
    "Bold",
    "Gentle",
    "Fierce",
    "Wise",
    "Happy",
    "Lucky",
    "Noble",
    "Royal",
    "Mystic",
    "Cosmic",
    "Electric",
    "Frozen",
    "Burning",
    "Rapid",
    "Slow",
    "Giant",
    "Tiny",
    "Clever",
    "Crafty",
    "Honest",
    "Kind",
    "Proud",
    "Shy",
    "Sly",
    "Strong",
    "Azure",
    "Copper",
    "Bronze",
    "Platinum",
    "Velvet",
    "Crystal",
    "Diamond",
    "Shadow",
    "Light",
    "Storm",
    "Thunder",
    "Rainbow",
    "Moon",
    "Star",
    "Sun",
]

NOUNS = [
    "Panda",
    "Fox",
    "Eagle",
    "Tiger",
    "Lion",
    "Wolf",
    "Bear",
    "Hawk",
    "Dolphin",
    "Owl",
    "Cat",
    "Dog",
    "Rabbit",
    "Deer",
    "Falcon",
    "Raven",
    "Phoenix",
    "Dragon",
    "Unicorn",
    "Griffin",
    "Panther",
    "Leopard",
    "Jaguar",
    "Cheetah",
    "Lynx",
    "Cougar",
    "Stallion",
    "Mustang",
    "Bison",
    "Buffalo",
    "Cobra",
    "Viper",
    "Python",
    "Mamba",
    "Gecko",
    "Iguana",
    "Chameleon",
    "Octopus",
    "Squid",
    "Shark",
    "Whale",
    "Seal",
    "Otter",
    "Penguin",
    "Parrot",
    "Finch",
    "Sparrow",
    "Robin",
    "Cardinal",
    "Bluebird",
    "Crane",
    "Flamingo",
    "Peacock",
    "Swan",
    "Butterfly",
    "Bee",
    "Beetle",
    "Spider",
    "Turtle",
    "Tortoise",
    "Frog",
    "Toad",
    "Salamander",
    "Koala",
    "Kangaroo",
    "Panda",
    "Raccoon",
    "Squirrel",
    "Chipmunk",
    "Beaver",
    "Hedgehog",
    "Badger",
    "Fox",
    "Wolf",
    "Coyote",
    "Jackal",
    "Hyena",
    "Meerkat",
    "Lemur",
    "Mongoose",
    "Storm",
    "Fire",
    "Wind",
    "Wave",
    "Cloud",
    "Mist",
    "Frost",
    "Flame",
    "Spark",
    "Flash",
    "Bolt",
    "Blaze",
    "Glow",
    "Shine",
    "Shade",
    "Dawn",
    "Dusk",
    "Nova",
    "Comet",
    "Meteor",
    "Asteroid",
    "Galaxy",
    "Nebula",
    "Quasar",
]


def generate_random_name(seed: int) -> str:
    if seed is not None:
        random.seed(seed)

    adjective = random.choice(ADJECTIVES)
    noun = random.choice(NOUNS)

    return f"{adjective} {noun}"


def get_display_name(ip_hash: str, post_id: str, db) -> str:
    existing = db.fetchrow(
        "SELECT display_name FROM commenters WHERE post_id = $1 AND ip_hash = $2",
        post_id,
        ip_hash,
    )

    if existing:
        return existing["display_name"]

    import hashlib

    seed = int(hashlib.md5(f"{ip_hash}:{post_id}".encode()).hexdigest(), 16)
    display_name = generate_random_name(seed)

    attempts = 0
    while attempts < 10:
        conflict = db.fetchrow(
            "SELECT 1 FROM commenters WHERE post_id = $1 AND display_name = $2",
            post_id,
            display_name,
        )
        if not conflict:
            break
        display_name = generate_random_name(seed + attempts + 1)
        attempts += 1

    return display_name


async def get_or_create_display_name(ip_hash: str, post_id: str, db) -> str:
    existing = await db.fetchrow(
        "SELECT display_name FROM commenters WHERE post_id = $1 AND ip_hash = $2",
        post_id,
        ip_hash,
    )

    if existing:
        return existing["display_name"]

    import hashlib

    seed = int(hashlib.md5(f"{ip_hash}:{post_id}".encode()).hexdigest(), 16)
    display_name = generate_random_name(seed)

    attempts = 0
    while attempts < 10:
        conflict = await db.fetchrow(
            "SELECT 1 FROM commenters WHERE post_id = $1 AND display_name = $2",
            post_id,
            display_name,
        )
        if not conflict:
            break
        display_name = generate_random_name(seed + attempts + 1)
        attempts += 1

    await db.execute(
        "INSERT INTO commenters (post_id, ip_hash, display_name) VALUES ($1, $2, $3)",
        post_id,
        ip_hash,
        display_name,
    )

    return display_name
