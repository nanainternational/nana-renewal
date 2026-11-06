"""Settings reach the legacy engine without starting browsers or network jobs."""
import copy
import importlib.util
import unittest
import threading
from unittest.mock import Mock, patch
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


class UploadTests(unittest.TestCase):
    def test_dedup_ignores_blanks_and_normalizes_contacts(self):
        import pandas as pd
        columns = ["상호", "대표자명", "전화번호", "이메일", "주소", "사업자등록번호", "통신판매업신고번호", "수집날짜", "수집시간"]
        worksheet = Mock()
        worksheet.get_all_values.return_value = [columns, ["old", "", "010-1111-2222", "EXIST@TEST.COM", "", "", "", "", ""]]
        sheet = Mock(); sheet.worksheet.return_value = worksheet
        client = Mock(); client.open_by_key.return_value = sheet
        namespace = dict(get_gspread_client=lambda: client, SPREADSHEET_ID="sheet", WORKSHEET_NAME="ably", GS_COLUMNS=columns)
        rows = pd.DataFrame([
            {"상호": "existing-phone", "전화번호": "01011112222"},
            {"상호": "existing-email", "이메일": "exist@test.com"},
            {"상호": "new1", "전화번호": "", "이메일": ""},
            {"상호": "new2", "전화번호": "없음", "이메일": "없음"},
            {"상호": "new3", "전화번호": "010-3333-4444"},
            {"상호": "new3-duplicate", "전화번호": "01033334444"},
        ])
        added, skipped = agent.append_unique_ably(namespace, rows, Mock())
        self.assertEqual((added, skipped), (3, 3))
        self.assertEqual(len(worksheet.append_rows.call_args.args[0]), 3)
        self.assertEqual(worksheet.append_rows.call_args.kwargs["value_input_option"], "RAW")
        sheet.batch_update.assert_not_called()  # No global deleteDuplicates over empty contacts.

    def test_upload_exception_is_not_swallowed_by_legacy_exporter(self):
        state = agent.UploadState(Mock())
        def original(data, log):
            log("[GSHEET] 업로드 실패: PermissionError")
            return 0  # legacy engine catches error and returns apparent zero success
        app = SimpleNamespace(namespaces={"zigzag": {"upload_to_gsheet": original}})
        agent.install_upload_tracking(app, state)
        app.namespaces["zigzag"]["upload_to_gsheet"]([{}], Mock())
        self.assertTrue(state.error)
        self.assertEqual(state.uploads, 0)

    def test_final_state_requires_upload_confirmation(self):
        for succeeded, stop, expected in ((False, False, "failed"), (True, False, "completed"), (True, True, "cancelled")):
            collector = SimpleNamespace(parsed_rows=[{}], worker=None)
            app = SimpleNamespace(namespaces={}, collectors={"ably": collector}, _status_text=lambda _: "수집 완료", after=Mock())
            worker = agent.PlatformRunner(app)
            worker.active = {"id": "job", "platform": "ably"}
            worker.seen_alive = True
            worker.stop_requested = stop
            if succeeded:
                worker.upload_state.uploads = 1
                worker.upload_state.added = 4
                worker.upload_state.skipped = 96
            worker.tick()
            reports = []
            while not worker.outgoing.empty(): reports.append(worker.outgoing.get())
            terminal = [r for r in reports if r["terminal"]]
            self.assertEqual(terminal[0]["payload"]["status"], expected)
            if succeeded:
                self.assertIn("신규 4건 / 중복 제외 96건", terminal[0]["payload"]["message"])

    def test_auth_wait_has_timeout_and_web_status(self):
        state = agent.UploadState(Mock())
        flow = SimpleNamespace(run_local_server=Mock(return_value="credentials"))
        original_run = flow.run_local_server
        flow_class = SimpleNamespace(from_client_secrets_file=Mock(return_value=flow))
        namespace = {"InstalledAppFlow": flow_class, "upload_to_gsheet": Mock(return_value=(0, 0))}
        app = SimpleNamespace(namespaces={"domeggook": namespace})
        agent.install_upload_tracking(app, state)
        wrapped = namespace["InstalledAppFlow"].from_client_secrets_file("secret", [])
        self.assertEqual(wrapped.run_local_server(port=0), "credentials")
        self.assertEqual(original_run.call_args.kwargs["timeout_seconds"], 180)
        messages = [call.args[1] for call in state.report.call_args_list]
        self.assertTrue(any("Google 인증 대기" in message for message in messages))

    def test_unchanged_auth_wait_does_not_repeat_collecting_log(self):
        app = SimpleNamespace(namespaces={}, collectors={"ably": SimpleNamespace(worker=SimpleNamespace(is_alive=lambda: True))},
                              _status_text=lambda _: "URL 100 / 파싱 100", after=Mock())
        worker = agent.PlatformRunner(app)
        worker.active = {"id": "job", "platform": "ably"}
        worker.upload_state.set_phase("auth_required", "Google 인증 대기", 88)
        worker.tick(); worker.tick()
        reports = []
        while not worker.outgoing.empty(): reports.append(worker.outgoing.get())
        self.assertEqual(len(reports), 1)
        self.assertIn("Google 인증 대기", reports[0]["payload"]["message"])


class ParallelTests(unittest.TestCase):
    def app(self):
        collectors = {p: SimpleNamespace(start=Mock(), start_scraping_auto=Mock(), stop=Mock(),
                      worker=SimpleNamespace(is_alive=lambda: True)) for p in agent.PLATFORM_METHODS}
        return SimpleNamespace(collectors=collectors, namespaces={}, _status_text=lambda p: p + " 수집 중",
                               after=Mock())

    def test_claims_different_platforms_while_first_is_running_and_cancels_independently(self):
        app = self.app(); worker = agent.WebAgent(app)
        jobs = [{"id": p, "platform": p, "settings": {}} for p in ("ably", "domeggook")]
        queued = list(jobs)
        def server(method, path, payload=None):
            if path.endswith("/next"):
                return {"job": queued.pop(0) if queued else None}
            if "/status?" in path: return {"status": "running"}
            return {"ok": True}
        with patch.object(agent, "request", side_effect=server) as http, patch.object(agent, "apply_settings"):
            worker.network_cycle()
            worker.tick()
            self.assertTrue(app.collectors["ably"].start.called)
            self.assertTrue(app.collectors["domeggook"].start.called)
            self.assertEqual(worker.available_platforms(), ["4910", "zigzag"])
            worker.runners["domeggook"].upload_state.added = 9
            worker.incoming.put(("cancel", "ably")); worker.tick()
            app.collectors["ably"].stop.assert_called_once()
            app.collectors["domeggook"].stop.assert_not_called()
            self.assertEqual(worker.runners["domeggook"].upload_state.added, 9)
            claims = [call.args[2]["platforms"] for call in http.call_args_list if call.args[1].endswith("/next")]
            self.assertNotIn("ably", claims[1])

    def test_failed_terminal_report_retries_before_releasing_only_its_platform(self):
        worker = agent.WebAgent(self.app())
        for p in ("ably", "domeggook"):
            worker.runners[p].active = {"id": p, "platform": p}
            worker.runners[p].claimed = True
        worker.runners["ably"].finish("completed", "saved")
        with patch.object(agent, "request", side_effect=OSError("offline")):
            with self.assertRaises(OSError): worker.network_cycle()
        self.assertTrue(worker.runners["ably"].claimed)
        self.assertIsNotNone(worker.pending_report)
        with patch.object(agent, "request", side_effect=lambda method, path, payload=None: {"status": "running", "job": None}) as http:
            worker.network_cycle()
        self.assertFalse(worker.runners["ably"].claimed)
        self.assertTrue(worker.runners["domeggook"].claimed)
        self.assertTrue(http.call_args_list[0].args[1].endswith("/ably/report"))

    def test_upload_state_is_bound_to_platform(self):
        namespaces = {p: {"upload_to_gsheet": Mock(return_value=(2, 3))} for p in ("zigzag", "domeggook")}
        app = SimpleNamespace(namespaces=namespaces, collectors={})
        # Domeggook upload changes only its own tracking, even while another engine is collecting.
        worker = agent.WebAgent(app)
        namespaces["domeggook"]["upload_to_gsheet"]([])
        self.assertEqual(worker.runners["domeggook"].upload_state.added, 2)
        self.assertEqual(worker.runners["zigzag"].upload_state.uploads, 0)

    def test_overlapping_uploads_wait_before_reading_and_appending(self):
        entered = threading.Event(); release = threading.Event(); second_entered = threading.Event()
        def first_upload(data):
            entered.set()
            self.assertTrue(release.wait(2))
            return (1, 0)
        def second_upload(data, log):
            second_entered.set()
            return 1
        app = SimpleNamespace(namespaces={"domeggook": {"upload_to_gsheet": first_upload},
                              "zigzag": {"upload_to_gsheet": second_upload}}, collectors={})
        worker = agent.WebAgent(app)
        first = threading.Thread(target=lambda: app.namespaces["domeggook"]["upload_to_gsheet"]([{}]))
        second = threading.Thread(target=lambda: app.namespaces["zigzag"]["upload_to_gsheet"]([{}]))
        try:
            first.start(); self.assertTrue(entered.wait(1)); second.start()
            self.assertFalse(second_entered.wait(.1), "A second dedup/read/append must not overlap")
            self.assertEqual(worker.runners["zigzag"].upload_state.phase, "waiting_to_save")
        finally:
            release.set(); first.join(3); second.join(3)
        self.assertTrue(second_entered.is_set())
        self.assertEqual(worker.runners["zigzag"].upload_state.uploads, 1)


if __name__ == "__main__": unittest.main()
