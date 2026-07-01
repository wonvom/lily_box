import pathlib
import subprocess
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[1]

EXPECTED_SKILLS = {
    "naver-blog-research",
    "naver-news-search",
    "geeknews-search",
    "real-estate-search",
    "gongsijiga-search",
    "iros-registry-automation",
    "korean-law-search",
    "korean-privacy-terms",
    "nts-business-registration",
    "biz-health-check",
    "national-pension-workplace",
    "nts-tax-delinquency",
    "fsc-corporate-info",
    "g2b-sanctioned-supplier",
    "g2b-order-plan-search",
    "localdata-business-status",
    "kstartup-search",
    "olive-young-search",
    "daiso-product-search",
    "ohou-today-deal",
    "bunjang-search",
    "daangn-used-goods-search",
    "daangn-realty-search",
    "daangn-jobs-search",
    "daangn-cars-search",
    "delivery-tracking",
    "korea-weather",
    "seoul-subway-arrival",
}

BANNED_BRAND = "k-" + "skill"
SOURCE_CLONE_DIR = BANNED_BRAND
BANNED_MARKERS = (
    BANNED_BRAND.casefold(),
    ("K" + "SKILL").casefold(),
    ("nom" + "adamas").casefold(),
    ("skill" + "-proxy").casefold(),
    ("https://k" + "-").casefold(),
)

EXCLUDED_SCAN_DIRS = {
    ".git",
    "__pycache__",
    "node_modules",
    SOURCE_CLONE_DIR,
}

TEXT_SUFFIXES = {
    ".md",
    ".py",
    ".sh",
    ".json",
    ".js",
    ".yaml",
    ".yml",
    ".txt",
    ".gitignore",
}

class BundleIntegrityTest(unittest.TestCase):
    def test_expected_skill_directories_exist(self):
        actual = {
            path.name
            for path in ROOT.iterdir()
            if path.is_dir() and (path / "SKILL.md").exists()
        }
        self.assertEqual(EXPECTED_SKILLS, actual)

    def test_readme_names_lily_box(self):
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        self.assertIn("lily-box", readme)

    def test_no_k_skill_branding_in_publishable_text(self):
        offenders = []
        for path in ROOT.rglob("*"):
            if not path.is_file():
                continue
            if any(part in EXCLUDED_SCAN_DIRS for part in path.relative_to(ROOT).parts):
                continue
            if path.suffix not in TEXT_SUFFIXES and path.name not in {".gitignore", ".env.example"}:
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            folded = text.casefold()
            for marker in BANNED_MARKERS:
                if marker in folded:
                    offenders.append(f"{path.relative_to(ROOT)}: {marker}")
        self.assertEqual([], offenders)

    def test_gitignore_excludes_upstream_source_clone(self):
        result = subprocess.run(
            ["git", "check-ignore", "-q", SOURCE_CLONE_DIR],
            cwd=ROOT,
            check=False,
        )
        self.assertEqual(0, result.returncode)


if __name__ == "__main__":
    unittest.main()
