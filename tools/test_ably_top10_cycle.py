# -*- coding: utf-8 -*-
"""Offline contract tests for ABLY top-ten extraction and cycle state."""
import os
import sys
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch
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
                         "https://mobile.a-bly.com/search/search-result?query=%EA%B2%A8%EC%9A%B8+%ED%8C%A8%EB%94%A9&search_type=POPULAR")


class BatchResumeTests(unittest.TestCase):
    def make_runner(self):
        engine = SimpleNamespace(
            _read_hook_urls=lambda: {"https://m.a-bly.com/goods/1", "https://m.a-bly.com/goods/2"},
            _read_cdp_goods_urls=lambda: {"https://m.a-bly.com/goods/2"},
            parsed_rows=[], urls=set(), start=Mock(), stop=Mock(), worker=None)
        app = SimpleNamespace(
            namespaces={}, collectors={"ably": engine},
            _status_text=lambda _: "URL 10개 / 파싱 10개")
        runner = agent.PlatformRunner(app, "ably")
        runner.active = {"id": "job-1", "platform": "ably",
                         "settings": {"url": agent.ABLY_RANK_URL,
                                      "limit": 3000, "ablyTop10": True,
                                      "ablyUnlimited": True}}
        runner.ably_cycle = {
            "date": "2026-11-25", "mode": "manual",
            "keywords": [f"키워드{i}" for i in range(1, 11)],
            "next_index": 0, "completed": [], "failures": [],
            "processed_urls": {}, "retry_count": 0}
        return runner, engine

    def test_previous_day_unfinished_state_is_resumable(self):
        runner, _ = self.make_runner()
        self.assertTrue(agent.ably_has_unfinished_cycle(runner.ably_cycle))
        runner.ably_cycle["next_index"] = 10
        self.assertFalse(agent.ably_has_unfinished_cycle(runner.ably_cycle))

    def test_reader_filter_skips_successfully_saved_goods(self):
        _, engine = self.make_runner()
        agent.install_ably_url_filter(engine)
        engine._ably_skip_urls = {"https://m.a-bly.com/goods/1"}
        self.assertEqual(engine._read_hook_urls(), {"https://m.a-bly.com/goods/2"})
        self.assertEqual(engine._read_cdp_goods_urls(), {"https://m.a-bly.com/goods/2"})
        agent.install_ably_url_filter(engine)
        self.assertEqual(len(engine._read_hook_urls()), 2)

    def test_top10_keyword_uses_3000_url_target(self):
        runner, engine = self.make_runner()
        with patch.object(agent, "apply_settings") as settings:
            runner.start_ably_keyword()
        self.assertEqual(settings.call_args.args[2]["limit"], 3000)
        engine.start.assert_called_once()

    def test_3000_urls_finish_rank_after_parsing_and_upload(self):
        runner, engine = self.make_runner()
        engine.urls = {f"https://m.a-bly.com/goods/{i}" for i in range(1, 3001)}
        engine.parsed_rows = [{"URL": url} for url in engine.urls]
        engine.queue = SimpleNamespace(unfinished_tasks=0)
        runner.upload_state.uploads = 1
        runner.upload_state.added = 20
        with patch.object(agent, "write_ably_cycle") as saved, patch.object(runner, "restart_ably_keyword") as restart:
            runner.advance_ably_keyword("완료")
        self.assertEqual(runner.ably_cycle["next_index"], 1)
        self.assertEqual(runner.ably_cycle["completed"], [1])
        restart.assert_called_once()
        saved.assert_called()

    def test_resume_only_collects_remaining_urls(self):
        runner, engine = self.make_runner()
        runner.ably_cycle["processed_urls"]["0"] = [
            f"https://m.a-bly.com/goods/{i}" for i in range(1, 201)]
        with patch.object(agent, "apply_settings") as settings:
            runner.start_ably_keyword()
        self.assertEqual(settings.call_args.args[2]["limit"], 2800)
        self.assertEqual(len(engine._ably_skip_urls), 200)

    def test_parser_pending_does_not_advance_keyword(self):
        runner, engine = self.make_runner()
        engine.urls = {f"https://m.a-bly.com/goods/{i}" for i in range(1, 3001)}
        engine.parsed_rows = [{"URL": "https://m.a-bly.com/goods/1"}]
        engine.queue = SimpleNamespace(unfinished_tasks=2999)
        runner.upload_state.uploads = 1
        with patch.object(agent, "write_ably_cycle"), patch.object(runner, "restart_ably_keyword") as restart:
            runner.advance_ably_keyword("완료")
        self.assertEqual(runner.ably_cycle["next_index"], 0)
        self.assertEqual(runner.ably_cycle["processed_urls"]["0"], ["https://m.a-bly.com/goods/1"])
        restart.assert_called_once()

    def test_stop_keeps_incomplete_rank_for_later_resume(self):
        runner, engine = self.make_runner()
        engine.urls = {"https://m.a-bly.com/goods/11", "https://m.a-bly.com/goods/12"}
        engine.parsed_rows = [{"URL": "https://m.a-bly.com/goods/11"}]
        runner.upload_state.uploads = 1
        runner.stop_requested = True
        cycle = runner.ably_cycle
        with patch.object(agent, "write_ably_cycle"):
            runner.advance_ably_keyword()
        self.assertEqual(cycle["next_index"], 0)
        self.assertEqual(cycle["processed_urls"]["0"], ["https://m.a-bly.com/goods/11"])
        self.assertIsNone(runner.snapshot())
        statuses = [x["payload"]["status"] for x in list(runner.outgoing.queue) if x["terminal"]]
        self.assertEqual(statuses, ["cancelled"])

    def test_missing_upload_is_retried_and_not_mistaken_for_completed(self):
        runner, engine = self.make_runner()
        engine.urls = {"https://m.a-bly.com/goods/1"}
        engine.parsed_rows = []
        with patch.object(agent, "write_ably_cycle"), patch.object(runner, "restart_ably_keyword") as restart:
            runner.advance_ably_keyword("완료")
        self.assertEqual(runner.ably_cycle["next_index"], 0)
        self.assertEqual(runner.ably_cycle["retry_count"], 1)
        restart.assert_called_once()

    def test_memory_stop_issues_graceful_engine_stop(self):
        runner, engine = self.make_runner()
        runner.started_at = 1
        runner.ably_last_change = 1
        runner.ably_last_memory_check = 0
        with patch.object(agent, "ably_memory_pressure", return_value="Chrome 메모리 한계 근접"), \
             patch.object(agent.time, "monotonic", return_value=500):
            runner.check_ably_resources("URL 10개")
        engine.stop.assert_called_once()
        self.assertIn("Chrome 메모리", runner.ably_auto_stop_reason)



if __name__ == "__main__":
    unittest.main()
