"""Layer 1 — text normalization engine.

Produces several non-destructive representations of the original message so
detectors can inspect them without ever mutating what the user wrote:

- original          : exact submitted text (displayed / audited)
- clean             : NFKC, homoglyph-folded, zero-width stripped, lowercased,
                      dashes/quotes unified, whitespace collapsed
- compact           : clean without any whitespace
- de_spaced         : single characters separated by spaces joined together
                      ("b h a g y a" -> "bhagya")
- symbolized        : word substitutions (at->@, dot->., slash->/, ...)
- digit_words       : number words ("nine eight seven") -> "987..."
"""
import re
import unicodedata
from dataclasses import dataclass, field
from typing import Dict

ZERO_WIDTH_RE = re.compile(
    "[\u200b\u200c\u200d\u200e\u200f\u2060\u2061\u2062\u2063\u2064\u00ad\ufeff]"
)
WHITESPACE_RE = re.compile(r"\s+")

# Common look-alike homoglyphs (cyrillic/greek/fullwidth residues after NFKC).
HOMOGLYPHS = str.maketrans({
    "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x", "і": "i",
    "ѕ": "s", "ӏ": "l", "Ь": "b", "Α": "A", "В": "B", "Е": "E", "К": "K",
    "М": "M", "Н": "H", "О": "O", "Р": "P", "С": "C", "Т": "T", "Х": "X",
})

DASH_RE = re.compile("[\u2010-\u2015\u2212\u2043\u02d7]")
QUOTE_RE = re.compile("[\u2018\u2019\u02bc\u201c\u201d\u00b4]")

DIGIT_WORDS = {
    "zero": "0", "oh": "0", "one": "1", "two": "2", "too": "2", "three": "3",
    "four": "4", "for": "4", "five": "5", "six": "6", "seven": "7", "eight": "8",
    "ate": "8", "nine": "9", "niner": "9",
}
DIGIT_WORD_SEQ_RE = re.compile(
    r"\b(" + "|".join(DIGIT_WORDS) + r")(?:[\s,.-]+(?:zero|oh|one|two|too|three|four|for|five|six|seven|eight|ate|nine|niner)){3,}\b",
    re.IGNORECASE,
)

WORD_SUBSTITUTIONS = [
    (re.compile(r"[\[\(\{]\s*at\s*[\]\)\}]|\b at \b|(?<=\w)\s+at\s+(?=\w)", re.IGNORECASE), "@"),
    (re.compile(r"[\[\(\{]\s*dot\s*[\]\)\}]|\b dot \b|(?<=\w)\s+dot\s+(?=\w)|(?<=\w)\s+dot\s*(?=[a-z])", re.IGNORECASE), "."),
    (re.compile(r"[\[\(\{]\s*underscore\s*[\]\)\}]|\b underscore \b|(?<=\w)\s+underscore\s+(?=\w)", re.IGNORECASE), "_"),
    (re.compile(r"[\[\(\{]\s*(?:dash|hyphen)\s*[\]\)\}]|\b dash \b|(?<=\w)\s+dash\s+(?=\w)", re.IGNORECASE), "-"),
    (re.compile(r"[\[\(\{]\s*(?:slash|forward slash)\s*[\]\)\}]|\b slash \b|(?<=\w)\s+slash\s+(?=\w)", re.IGNORECASE), "/"),
    (re.compile(r"[\[\(\{]\s*(?:at the rate|a ?t ?the ?rate)\s*[\]\)\}]|\b at the rate \b", re.IGNORECASE), "@"),
    (re.compile(r"\bdouble? ?zero\b", re.IGNORECASE), "00"),
]

# "x y z a" runs of single characters separated by single spaces (>= 4 chars).
# ":" segments are included so "i n s t a g r a m : b h a g y a 1 2 3" joins.
SPACED_RUN_RE = re.compile(r"(?<![\w@.])((?:[\w:][.\s]{1,2}){3,}[\w:])(?![\w.])")


@dataclass
class NormalizedText:
    original: str
    clean: str
    compact: str
    de_spaced: str
    symbolized: str
    compact_symbolized: str
    digit_words: str
    variants: Dict[str, str] = field(default_factory=dict)

    def all_variants(self) -> Dict[str, str]:
        """Deduplicated mapping of representation name -> text for detectors."""
        if not self.variants:
            seen = set()
            for name, text in (
                ("clean", self.clean), ("compact", self.compact),
                ("de_spaced", self.de_spaced), ("symbolized", self.symbolized),
                ("compact_symbolized", self.compact_symbolized), ("digit_words", self.digit_words),
            ):
                if text and text not in seen:
                    seen.add(text)
                    self.variants[name] = text
        return self.variants


def _fold_digit_words(text: str) -> str:
    def repl(match):
        words = re.split(r"[\s,.-]+", match.group(0))
        return "".join(DIGIT_WORDS.get(w.lower(), "") for w in words if w)
    return DIGIT_WORD_SEQ_RE.sub(repl, text)


def _apply_word_substitutions(text: str) -> str:
    out = text
    for pattern, replacement in WORD_SUBSTITUTIONS:
        out = pattern.sub(replacement, out)
    return out


def _join_spaced_runs(text: str) -> str:
    def repl(match):
        return re.sub(r"[\s.]", "", match.group(0))
    return SPACED_RUN_RE.sub(repl, text)


def normalize(text: str) -> NormalizedText:
    original = text or ""
    step = unicodedata.normalize("NFKC", original)
    step = ZERO_WIDTH_RE.sub("", step)
    step = step.translate(HOMOGLYPHS)
    step = DASH_RE.sub("-", step)
    step = QUOTE_RE.sub("'", step)
    clean = WHITESPACE_RE.sub(" ", step).strip().lower()

    compact = re.sub(r"\s+", "", clean)
    de_spaced = _join_spaced_runs(clean)
    de_spaced = WHITESPACE_RE.sub(" ", de_spaced).strip()
    # recursively join spaced runs that appear after word substitutions too
    symbolized = _apply_word_substitutions(clean)
    de_spaced_symbolized = _apply_word_substitutions(re.sub(r"\s+", "", de_spaced))
    digit_words = _fold_digit_words(clean)

    return NormalizedText(
        original=original,
        clean=clean,
        compact=compact,
        de_spaced=de_spaced,
        symbolized=symbolized,
        compact_symbolized=de_spaced_symbolized,
        digit_words=digit_words,
    )
