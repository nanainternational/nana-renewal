"""Settings reach the legacy engine without starting browsers or network jobs."""
import copy
import importlib.util
import unittest
from pathlib import Path
from types import SimpleNamespace

spec = importlib.util.spec_from_file_location("agent", Path(__file__).with_name("collector_web_agent.py"))
agent = importlib.util.module_from_spec(spec)
spec.loader.exec_module(agent)


class Widget:
    def __init__(self): self.value = None
    def delete(self, *_): self.value = ""
    def insert(self, _, value): self.value = value
    def set(self, value): self.value = value


def settings(**patch):
    return dict(url="https://m.a-bly.com/search?keyword=dress", keyword="dress,shirt", limit=25,
                headless=True, autoCategory=False, emptyRounds=3, thumbnails=True,
                spreadsheetId="A" * 30, worksheet="web", **patch)


class SettingsTests(unittest.TestCase):
    def setUp(self):
        names = ("kw_entry", "count_entry", "url_entry", "empty_rounds_entry", "auto_category_mode",
                 "site_url_input", "repeat_entry", "collect_thumbnails", "keyword_entry", "page_entry",
                 "secret_mode", "headless_mode")
        self.collectors = {p: SimpleNamespace(**{name: Widget() for name in names}) for p in agent.PLATFORM_METHODS}
        self.app = SimpleNamespace(collectors=self.collectors, namespaces={p: {
            "SPREADSHEET_ID": "original", "WORKSHEET_NAME": "default", "WORKSHEET_NAME_4910": "4910"
        } for p in agent.PLATFORM_METHODS})

    def test_each_platform_receives_web_fields(self):
        cases = (("ably", "https://m.a-bly.com/search", "kw_entry"),
                 ("4910", "https://4910.kr/goods/catalog", "url_entry"),
                 ("zigzag", "https://zigzag.kr/", "site_url_input"),
                 ("domeggook", "", "keyword_entry"))
        for platform, url, field in cases:
            value = settings(); value["url"] = url
            agent.apply_settings(self.app, platform, value)
            self.assertEqual(getattr(self.collectors[platform], field).value, url if platform != "domeggook" else value["keyword"])
            self.assertEqual(self.app.namespaces[platform]["SPREADSHEET_ID"], "A" * 30)
        self.assertEqual(self.collectors["4910"].count_entry.value, "25")
        self.assertFalse(self.collectors["4910"].auto_category_mode.value)
        self.assertEqual(self.collectors["zigzag"].repeat_entry.value, "25")
        self.assertTrue(self.collectors["zigzag"].collect_thumbnails.value)
        self.assertEqual(self.collectors["domeggook"].page_entry.value, "25")
        self.assertTrue(self.collectors["domeggook"].secret_mode.value)

    def test_rejects_other_hosts_credentials_and_unbounded_work(self):
        for url in ("http://m.a-bly.com/", "https://a-bly.com.evil.test/", "https://127.0.0.1/", "https://user:pass@m.a-bly.com/"):
            value = settings(); value["url"] = url
            with self.assertRaises(ValueError): agent.apply_settings(self.app, "ably", value)
        for limit in (0, -1, 10001, True, "20"):
            value = settings(); value["limit"] = limit
            with self.assertRaises(ValueError): agent.apply_settings(self.app, "ably", value)

    def test_blank_sheet_restores_local_default_not_previous_job(self):
        value = settings()
        agent.apply_settings(self.app, "ably", value)
        value.update(spreadsheetId="", worksheet="")
        agent.apply_settings(self.app, "ably", value)
        self.assertEqual(self.app.namespaces["ably"]["SPREADSHEET_ID"], "original")
        self.assertEqual(self.app.namespaces["ably"]["WORKSHEET_NAME"], "default")

    def test_missing_settings_fails_without_using_old_pc_url(self):
        with self.assertRaises(ValueError): agent.apply_settings(self.app, "ably", None)


if __name__ == "__main__": unittest.main()
