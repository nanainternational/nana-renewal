# -*- coding: utf-8 -*-
"""Offline contract tests for ABLY top-ten extraction and cycle state."""
import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import collector_web_agent as agent


class AblyRankedCycleTest(unittest.TestCase):
    def test_ranked_labels_are_not_guessed(self):
        sample = "검색\n인기 검색어\n" + "\n".join(f"{i}\n키워드{i}" for i in range(1, 11))
        self.assertEqual(agent.parse_ably_rankings(sample), [f"키워드{i}" for i in range(1, 11)])
        with self.assertRaises(RuntimeError):
            agent.parse_ably_rankings("추천 검색어\n1\n원피스\n2\n가방")

    def test_reject_duplicate_or_missing_rank(self):
        sample = "실시간 검색어\n" + "\n".join(f"{i}\n동일어" for i in range(1, 11))
        with self.assertRaises(RuntimeError):
            agent.parse_ably_rankings(sample)

    def test_resume_state_round_trip(self):
        original = agent.ABLY_CYCLE_PATH
        with tempfile.TemporaryDirectory() as directory:
            try:
                agent.ABLY_CYCLE_PATH = Path(directory) / "cycle.json"
                state = {"date": "2026-11-25", "mode": "manual",
                         "keywords": [str(i) for i in range(10)], "next_index": 4}
                agent.write_ably_cycle(state)
                self.assertEqual(agent.read_ably_cycle(), state)
            finally:
                agent.ABLY_CYCLE_PATH = original

    def test_keyword_url_is_encoded(self):
        self.assertEqual(agent.ably_keyword_url("겨울 패딩"),
                         "https://m.a-bly.com/search?keyword=%EA%B2%A8%EC%9A%B8+%ED%8C%A8%EB%94%A9")


if __name__ == "__main__":
    unittest.main()
