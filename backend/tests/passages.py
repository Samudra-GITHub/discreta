"""English sample texts for the cryptanalysis tests (written for this project)."""

#: About 460 letters of ordinary English prose.
LONG_PASSAGE = (
    "It was a quiet morning in the harbour town and the fishermen were already mending "
    "their nets along the stone wall while the gulls circled above the boats. A young girl "
    "carried a basket of fresh bread down the narrow street, and everyone she passed wished "
    "her a good day. By noon the market was full of people trading cheese, fruit and woollen "
    "cloth, and the smell of salt and smoke drifted over the square. Nobody noticed the "
    "stranger who sat by the fountain writing letters in a small notebook, though he had "
    "arrived on the first boat and had not spoken to anyone since."
)

#: 20 letters of English: short, but its letters happen to look English.
SHORT_PASSAGE = "Meet me at the old bridge"

#: A pangram uses every letter about equally, so it does NOT look like English statistically.
PANGRAM = "The quick brown fox jumps over the lazy dog while the farmer watches quietly."

#: About 1,400 letters of English prose: the first passage followed by a second one.
VERY_LONG_PASSAGE = (
    LONG_PASSAGE
    + " "
    + "The lighthouse keeper had lived alone on the rock for nearly thirty winters, and in all that "
    "time he had learned to read the sea the way other men read a newspaper. He knew from the colour "
    "of the dawn whether the fishing fleet would sail, and he knew from the sound of the wind in the "
    "chimney whether the supply boat would be late. That morning the water was flat and silver, and "
    "the gulls were strangely quiet, so he climbed the iron stairs twice before breakfast to look at "
    "the horizon. Far to the west a line of dark cloud was growing, slowly at first and then with "
    "surprising speed, and by noon the first long swells were breaking against the foot of the tower. "
    "He lit the lamp early, checked the oil and the clockwork, and wrote a short note in the logbook "
    "for whoever might read it later. When the storm finally arrived it lasted two days and a night, "
    "and the beam turned steadily through the rain until the morning when the sky cleared and a small "
    "white sail appeared, tacking carefully towards the harbour as if nothing at all had happened."
)
