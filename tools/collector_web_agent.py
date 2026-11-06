# -*- coding: utf-8 -*-
"""나나 웹 통합수집기 - 중앙 Windows 실행 에이전트.

기존 nana_unified_collector_v1.4.2.py 파일을 수정하지 않고 사용합니다.
Windows 로그인 데스크톱에서 실행해야 합니다 (Tk / Chrome 사용).
관리자 화면에서 발급한 일회용 연결 코드로 등록합니다. 별도 Render 비밀키 설정은 필요하지 않습니다.
기존 환경변수 COLLECTOR_API_BASE, COLLECTOR_WORKER_TOKEN, NANA_COLLECTOR_FILE도 지원합니다.
"""

import importlib.util
import logging
from logging.handlers import RotatingFileHandler
import json
import os
import queue
import re
import socket
import sys
import threading
import time
import webbrowser
from datetime import datetime
from pathlib import Path
from urllib.parse import quote, urlsplit

import requests

VERSION = "0.3.1"
BASE_URL = os.environ.get("COLLECTOR_API_BASE", "https://nanainter.com").rstrip("/")
CONFIG_PATH = Path(os.environ.get("LOCALAPPDATA", str(Path.home() / ".config"))) / "NanaCollector" / "agent.json"


def read_config():
    try:
        return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError, OSError):
        return {}


def save_config(**values):
    data = read_config()
    data.update(values)
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    try:
        CONFIG_PATH.chmod(0o600)
    except OSError:
        pass


STORED_CONFIG = read_config()
TOKEN = os.environ.get("COLLECTOR_WORKER_TOKEN", "") or STORED_CONFIG.get("token", "")
COLLECTOR_FILE = Path(os.environ.get(
    "NANA_COLLECTOR_FILE",
    STORED_CONFIG.get("collector_file", str(Path(__file__).with_name("nana_unified_collector_v1.4.2.py"))),
)).expanduser().resolve()
WORKER_ID = re.sub(r"[^A-Za-z0-9_.-]", "-", socket.gethostname())[:64] or "nana-collector"
POLL_SECONDS = 4
PLATFORM_METHODS = {
    "ably": "start",
    "4910": "start",
    "zigzag": "start_scraping_auto",
    "domeggook": "start",
}
FAILURE_WORDS = ("오류", "실패", "차단", "접근 제한", "❌", "error")


def apply_settings(app, platform, settings):
    """Only write known widgets on Tk's main thread; never execute remote code."""
    if not isinstance(settings, dict):
        raise ValueError("웹에서 URL과 수집 설정을 저장한 후 다시 실행하세요.")
    url = settings.get("url", "")
    keyword = settings.get("keyword", "")
    hosts = {"ably": "a-bly.com", "4910": "4910.kr", "zigzag": "zigzag.kr", "domeggook": "domeggook.com"}
    if not isinstance(url, str) or not isinstance(keyword, str) or len(url) > 2000 or len(keyword) > 500:
        raise ValueError("올바르지 않은 URL/검색어입니다.")
    if url:
        parsed = urlsplit(url)
        host = parsed.hostname or ""
        if (parsed.scheme != "https" or parsed.username or parsed.password or parsed.port not in (None, 443)
                or not (host == hosts[platform] or host.endswith("." + hosts[platform]))):
            raise ValueError("해당 플랫폼의 HTTPS URL만 사용할 수 있습니다.")
    if platform in ("ably", "zigzag") and not url:
        raise ValueError("수집 URL을 입력하세요.")
    if platform == "domeggook" and (not keyword.strip() or url):
        raise ValueError("도매꾹은 검색어를 입력하세요.")
    for key, maximum in (("limit", 10000), ("emptyRounds", 100)):
        if type(settings.get(key)) is not int or not 1 <= settings[key] <= maximum:
            raise ValueError("수집 수량/횟수는 범위 내 양의 정수여야 합니다.")
    for key in ("headless", "autoCategory", "thumbnails"):
        if type(settings.get(key)) is not bool:
            raise ValueError("올바르지 않은 실행 옵션입니다.")
    if platform == "4910" and not url and not keyword and not settings["autoCategory"]:
        raise ValueError("4910 URL, 검색어 또는 카테고리 자동 순회를 설정하세요.")
    collector = app.collectors[platform]
    def entry(name, value):
        widget = getattr(collector, name)
        widget.delete(0, "end")
        widget.insert(0, str(value))
    if platform == "ably":
        entry("kw_entry", url)
        entry("count_entry", settings["limit"])
    elif platform == "4910":
        entry("url_entry", url)
        entry("kw_entry", keyword)
        entry("count_entry", settings["limit"])
        entry("empty_rounds_entry", settings["emptyRounds"])
        collector.auto_category_mode.set(settings["autoCategory"])
    elif platform == "zigzag":
        entry("site_url_input", url)
        entry("repeat_entry", settings["limit"])
        collector.collect_thumbnails.set(settings["thumbnails"])
    else:
        entry("keyword_entry", keyword)
        entry("page_entry", settings["limit"])
    getattr(collector, "secret_mode" if platform == "domeggook" else "headless_mode").set(settings["headless"])
    namespace = app.namespaces[platform]
    # Restore original defaults on every job, so a previous job's sheet cannot leak.
    if "_web_sheet_defaults" not in namespace:
        namespace["_web_sheet_defaults"] = {key: namespace[key] for key in
            ("SPREADSHEET_ID", "WORKSHEET_NAME", "WORKSHEET_NAME_4910") if key in namespace}
    namespace.update(namespace["_web_sheet_defaults"])
    sheet = settings.get("spreadsheetId", "")
    worksheet = settings.get("worksheet", "")
    if not isinstance(sheet, str) or (sheet and not re.fullmatch(r"[A-Za-z0-9_-]{20,200}", sheet)):
        raise ValueError("Google 시트 ID가 올바르지 않습니다.")
    if not isinstance(worksheet, str) or len(worksheet) > 100:
        raise ValueError("시트 탭 이름이 올바르지 않습니다.")
    if sheet:
        namespace["SPREADSHEET_ID"] = sheet
    if worksheet:
        namespace["WORKSHEET_NAME_4910" if platform == "4910" else "WORKSHEET_NAME"] = worksheet


def request(method, path, payload=None):
    response = requests.request(
        method,
        BASE_URL + path,
        json=payload if method != "GET" else None,
        headers={"x-collector-worker-token": TOKEN},
        timeout=15,
    )
    response.raise_for_status()
    return response.json()


def load_app():
    global COLLECTOR_FILE
    if not COLLECTOR_FILE.is_file():
        from tkinter import Tk, filedialog
        root = Tk()
        root.withdraw()
        try:
            chosen = filedialog.askopenfilename(
                title="기존 나나 통합수집기 Python 파일 선택",
                filetypes=[("Python 파일", "*.py")],
            )
        finally:
            root.destroy()
        if not chosen:
            raise RuntimeError("수집기 파일을 선택해야 합니다.")
        COLLECTOR_FILE = Path(chosen).resolve()
        save_config(collector_file=str(COLLECTOR_FILE))
    spec = importlib.util.spec_from_file_location("nana_central_collector", COLLECTOR_FILE)
    if spec is None or spec.loader is None:
        raise RuntimeError("통합수집기 모듈을 읽지 못했습니다.")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module.UnifiedCollectorApp()


def contact_keys(row):
    """Empty contacts are not duplicate keys. Keep distinct sellers without contacts."""
    def clean(value):
        text = str(value or "").strip()
        return "" if text.lower() in ("", "없음", "none", "nan", "null") else text
    keys = set()
    for column, kind in (("전화번호", "phone"), ("문의번호", "phone"),
                         ("이메일", "email"), ("사업자등록번호", "business"), ("URL", "url")):
        value = clean(row.get(column))
        if kind in ("phone", "business"):
            value = re.sub(r"\D", "", value)
        elif kind == "email":
            value = value.lower()
        elif kind == "url":
            value = value.split("?")[0].rstrip("/")
        if value:
            keys.add((kind, value))
    if not keys:
        fallback = tuple(clean(row.get(c)) for c in ("상호", "대표자명", "주소"))
        if any(fallback):
            keys.add(("seller", fallback))
    return keys


def append_unique_ably(namespace, dataframe, phase):
    """Filter before append; never delete existing rows or collapse blank phone/email cells."""
    import gspread
    rows = dataframe.fillna("").to_dict("records")
    phase("connecting", "엑셀 저장 완료 · Google 시트 연결 중", 88)
    sheet = namespace["get_gspread_client"]().open_by_key(namespace["SPREADSHEET_ID"])
    columns = list(namespace["GS_COLUMNS"])
    try:
        worksheet = sheet.worksheet(namespace["WORKSHEET_NAME"])
    except gspread.WorksheetNotFound:
        worksheet = sheet.add_worksheet(title=namespace["WORKSHEET_NAME"], rows="1000", cols=str(len(columns)))
    values = worksheet.get_all_values()
    if not values:
        worksheet.append_row(columns, value_input_option="RAW")
        values = [columns]
    header = list(values[0])
    if any(column not in header for column in columns if column not in ("수집날짜", "수집시간")):
        raise ValueError("Google 시트 열 이름이 수집기 설정과 다릅니다.")
    for column in ("수집날짜", "수집시간"):
        if column not in header:
            header.append(column)
            worksheet.update_cell(1, len(header), column)
    phase("deduplicating", "시트 기존 데이터와 전화번호·이메일·사업자번호 중복 확인 중", 92)
    seen = set()
    for row in values[1:]:
        seen.update(contact_keys(dict(zip(header, row))))
    added_rows = []
    now = datetime.now()
    for row in rows:
        keys = contact_keys(row)
        if keys and seen.intersection(keys):
            continue
        seen.update(keys)
        row.update({"수집날짜": now.strftime("%Y-%m-%d"), "수집시간": now.strftime("%H:%M:%S")})
        added_rows.append([str(row.get(column, "") or "") for column in header])
    added, skipped = len(added_rows), len(rows) - len(added_rows)
    if added_rows:
        phase("uploading", f"중복 {skipped}건 제외 · 신규 {added}건 Google 시트 업로드 중", 96)
        worksheet.append_rows(added_rows, value_input_option="RAW")
    return added, skipped


class UploadState:
    def __init__(self, report):
        self.report = report
        self.lock = threading.RLock()
        self.reset()

    def reset(self):
        with self.lock:
            self.phase = "collecting"
            self.message = ""
            self.error = ""
            self.added = self.skipped = self.uploads = 0
            self.uploading = False

    def set_phase(self, phase, message, progress):
        with self.lock:
            changed = (phase, message) != (self.phase, self.message)
            self.phase, self.message = phase, message
        if changed:
            self.report("running", message, progress=progress)

    def fail(self, message):
        with self.lock:
            if not self.error:
                self.error = message
        self.set_phase("upload_failed", message + " · 엑셀 결과는 PC에 보존됩니다.", 90)

    def summary(self):
        with self.lock:
            return f"Google 시트 업로드 완료 · 신규 {self.added}건 / 중복 제외 {self.skipped}건"


def install_upload_tracking(app, state):
    """Adapt legacy engines without editing originals, including errors they otherwise swallow."""
    for platform, namespace in app.namespaces.items():
        original_print = namespace.get("print", print)
        def tracked_print(*args, _original=original_print, **kwargs):
            text = " ".join(str(arg) for arg in args)
            _original(*args, **kwargs)
            if state.uploading and any(word in text for word in ("업로드 실패", "APIError", "중복 제거 중 오류")):
                state.fail("Google 시트 업로드 실패 · 계정 권한 또는 연결을 확인하세요")
        namespace["print"] = tracked_print

        original_flow = namespace.get("InstalledAppFlow")
        if original_flow:
            class BoundedFlow:
                @staticmethod
                def from_client_secrets_file(*args, _flow=original_flow, **kwargs):
                    flow = _flow.from_client_secrets_file(*args, **kwargs)
                    original_run = flow.run_local_server
                    def run_local_server(*args, **kwargs):
                        state.set_phase("auth_required", "Google 인증 대기 · PC 브라우저에서 로그인·허용하세요 (최대 3분)", 88)
                        kwargs.update(timeout_seconds=180, authorization_prompt_message="")
                        try:
                            credentials = original_run(*args, **kwargs)
                        except Exception:
                            state.fail("Google 인증 실패 또는 시간 초과 · PC에서 인증한 뒤 다시 실행하세요")
                            raise
                        state.set_phase("connecting", "Google 인증 완료 · 시트 연결 중", 89)
                        return credentials
                    flow.run_local_server = run_local_server
                    return flow
            namespace["InstalledAppFlow"] = BoundedFlow

        original_client = namespace.get("get_gspread_client")
        if original_client:
            def client(*args, _original=original_client, **kwargs):
                result = _original(*args, **kwargs)
                result.http_client.set_timeout((10, 30))
                if state.uploading:
                    state.set_phase("uploading", "Google 인증 확인 완료 · 중복 확인과 시트 업로드 중", 91)
                else:
                    state.set_phase("collecting", "Google 인증 확인 완료 · 수집 중", 10)
                return result
            namespace["get_gspread_client"] = client

        name = {"ably": "upload_dataframe_to_gsheet", "4910": "upload_dataframe_to_gsheet_4910",
                "zigzag": "upload_to_gsheet", "domeggook": "upload_to_gsheet"}[platform]
        original_upload = namespace[name]
        def upload(data, *args, _original=original_upload, _platform=platform, _namespace=namespace, **kwargs):
            state.uploading = True
            state.set_phase("saving", "엑셀 저장 완료 · 중복 정리와 Google 시트 업로드 준비", 87)
            try:
                if _platform in ("ably", "4910"):
                    # These engines finish/join parsing before their one final export.
                    # Release Chrome before waiting for Google authentication/upload.
                    app.collectors[_platform]._shutdown_browsers()
                if _platform == "ably":
                    added, skipped = append_unique_ably(_namespace, data, state.set_phase)
                    result = None  # legacy exporter ignores the return value
                else:
                    # Zigzag reports caught failures through its log callback, not print.
                    if _platform == "zigzag":
                        callback = args[0] if args else kwargs.get("log")
                        def log(text):
                            if callback: callback(text)
                            if "업로드 실패" in str(text):
                                state.fail("Google 시트 업로드 실패 · 계정 권한 또는 연결을 확인하세요")
                        args, kwargs = (log,), {}
                    state.set_phase("uploading", "시트 기존 데이터와 중복 확인 · Google 시트 업로드 중", 92)
                    result = _original(data, *args, **kwargs)
                    if _platform in ("4910", "domeggook"):
                        added, skipped = result[:2]
                    else:
                        added, skipped = int(result), max(0, len(data) - int(result))
                if not state.error:
                    state.added += added
                    state.skipped += skipped
                    state.uploads += 1
                    state.set_phase("uploaded", state.summary(), 98)
                return result
            except Exception:
                state.fail("Google 시트 업로드 실패 · 계정 권한, 열 이름 또는 연결을 확인하세요")
                raise
            finally:
                state.uploading = False
        namespace[name] = upload


class WebAgent:
    def __init__(self, app):
        self.app = app
        self.incoming = queue.Queue()
        self.outgoing = queue.Queue()
        self.lock = threading.Lock()
        self.active = None
        self.claimed = False
        self.stop_requested = False
        self.seen_alive = False
        self.started_at = 0.0
        self.last_message = ""
        self.last_reported_at = 0.0
        self.running = True
        self.closing = False
        self.connection_status = "연결 확인 중"
        self.tray = None
        self.upload_state = UploadState(self.send_report)
        install_upload_tracking(app, self.upload_state)

    def snapshot(self):
        with self.lock:
            return dict(self.active) if self.active else None

    def send_report(self, status, message, progress=None, terminal=False):
        job = self.snapshot()
        if not job:
            return
        self.outgoing.put({
            "path": "/api/internal/collector/jobs/" + job["id"] + "/report",
            "payload": {
                "worker_id": WORKER_ID,
                "status": status,
                "message": str(message)[:900],
                "progress": progress,
            },
            "terminal": terminal,
        })

    def finish(self, status, message):
        self.send_report(
            status, message, progress=100 if status == "completed" or
            (status == "cancelled" and self.upload_state.uploads) else None, terminal=True
        )
        with self.lock:
            self.active = None
        self.stop_requested = False
        self.seen_alive = False
        self.last_message = ""
        self.last_reported_at = 0.0

    def current_thread(self):
        job = self.snapshot()
        if not job:
            return None
        obj = self.app.collectors.get(job["platform"])
        if obj is None:
            return None
        return getattr(obj, "worker", None) or getattr(obj, "worker_thread", None)

    def start_job(self, job):
        platform = str(job.get("platform", ""))
        if platform not in PLATFORM_METHODS:
            # The backend rejects unknown platforms, so this is a defensive check.
            with self.lock:
                self.active = dict(job)
            self.finish("failed", "지원하지 않는 수집기입니다: " + platform)
            return
        with self.lock:
            self.active = dict(job)
        self.stop_requested = False
        self.seen_alive = False
        self.started_at = time.monotonic()
        self.last_message = ""
        self.last_reported_at = 0
        self.upload_state.reset()
        try:
            apply_settings(self.app, platform, job.get("settings"))
            collector = self.app.collectors[platform]
            getattr(collector, PLATFORM_METHODS[platform])()
            self.send_report("running", "중앙 수집기에서 " + platform + " 시작 명령 실행")
        except Exception as exc:
            self.finish("failed", "시작 오류: " + str(exc))
            return

    def handle_cancel(self):
        if self.stop_requested or not self.snapshot():
            return
        self.stop_requested = True
        job = self.snapshot()
        try:
            self.app.collectors[job["platform"]].stop()
            message = "중지 요청 · 수집된 데이터의 중복 정리와 시트 저장 후 종료합니다."
            if self.upload_state.phase == "auth_required":
                message = self.upload_state.message + " · 중지 요청 접수, 저장 후 종료"
            self.send_report("running", message)
        except Exception as exc:
            self.send_report("running", "중지 호출 실패: " + str(exc))

    def tick(self):
        while True:
            try:
                kind, data = self.incoming.get_nowait()
            except queue.Empty:
                break
            if kind == "start":
                if self.snapshot() is None:
                    self.start_job(data)
            elif kind == "cancel":
                if self.snapshot() and self.snapshot()["id"] == data:
                    self.handle_cancel()
            elif kind == "show":
                self.app.deiconify()
                self.app.lift()
            elif kind == "quit":
                self.closing = True
                self.handle_cancel()

        job = self.snapshot()
        if job:
            current = self.current_thread()
            alive = bool(current and current.is_alive())
            self.seen_alive = self.seen_alive or alive
            try:
                message = self.app._status_text(job["platform"])
            except Exception:
                message = "상태 확인 중"
            engine_message = message
            if self.upload_state.phase != "collecting":
                message = self.upload_state.message
                self.last_message = message  # pipeline phase changes already queued a report
            elif message != self.last_message:
                self.last_message = message
                self.last_reported_at = time.monotonic()
                self.send_report("running", message)
            if self.seen_alive and not alive:
                if self.upload_state.error:
                    self.finish("failed", self.upload_state.error + " · 엑셀 결과 보존, 재업로드 필요")
                elif any(term.lower() in engine_message.lower() for term in FAILURE_WORDS):
                    self.finish("failed", "수집기 오류 종료: " + engine_message)
                elif self.upload_state.uploads:
                    self.finish("cancelled" if self.stop_requested else "completed",
                                self.upload_state.summary() + (" · 중지 완료" if self.stop_requested else " · 작업 종료"))
                elif self.result_count(job["platform"]):
                    self.finish("failed", "시트 업로드 성공을 확인하지 못했습니다. 엑셀 결과를 확인하세요.")
                else:
                    self.finish("cancelled" if self.stop_requested else "completed", "수집 결과 0건 · 업로드 없이 종료")
            elif not self.seen_alive and time.monotonic() - self.started_at > 30:
                self.finish("failed", "시작 후 30초 동안 수집 작업 스레드를 확인하지 못했습니다.")

        if self.closing and self.snapshot() is None and not self.claimed:
            self.running = False
            if self.tray:
                self.tray.stop()
            self.app.destroy()
            return
        if self.running:
            self.app.after(1000, self.tick)

    def result_count(self, platform):
        collector = self.app.collectors[platform]
        return len(getattr(collector, "parsed_rows", None) or getattr(collector, "results", None) or [])

    def network_loop(self):
        pending = None
        while self.running:
            try:
                # Keep failed reports for retry and never claim the next job first.
                while True:
                    if pending is None:
                        try:
                            pending = self.outgoing.get_nowait()
                        except queue.Empty:
                            break
                    request("POST", pending["path"], pending["payload"])
                    if pending["terminal"]:
                        with self.lock:
                            self.claimed = False
                    pending = None
                current = self.snapshot()
                request("POST", "/api/internal/collector/heartbeat", {
                    "worker_id": WORKER_ID,
                    "worker_name": socket.gethostname(),
                    "version": VERSION,
                    "web_settings": True,
                    "current_job": current["id"] if current else None,
                })
                self.connection_status = "홈페이지 연결됨"
                if current:
                    path = "/api/internal/collector/jobs/" + current["id"] + "/status"
                    status = request("GET", path + "?worker_id=" + quote(WORKER_ID))["status"]
                    if status == "cancel_requested":
                        self.incoming.put(("cancel", current["id"]))
                elif not self.claimed and not self.closing:
                    data = request("POST", "/api/internal/collector/next", {"worker_id": WORKER_ID, "web_settings": True})
                    job = data.get("job")
                    if job:
                        with self.lock:
                            self.claimed = True
                        self.incoming.put(("start", job))
            except Exception as exc:
                self.connection_status = "연결 끊김 · 재연결 중"
                # Never silently pretend the worker is online on network failure.
                print("[웹 연결 오류]", type(exc).__name__, str(exc)[:250], flush=True)
            time.sleep(POLL_SECONDS)

    def start(self):
        import pystray
        from PIL import Image, ImageDraw
        image = Image.new("RGB", (64, 64), "#0f766e")
        ImageDraw.Draw(image).text((17, 12), "N", fill="white", font_size=36)
        self.tray = pystray.Icon("NanaCollector", image, "나나 수집기", menu=pystray.Menu(
            pystray.MenuItem(lambda item: self.connection_status, None, enabled=False),
            pystray.MenuItem("홈페이지에서 관리", lambda: webbrowser.open(BASE_URL + "/admin/collector"), default=True),
            pystray.MenuItem("PC 설정 / 로그인 확인", lambda: self.incoming.put(("show", None))),
            pystray.MenuItem("수집 중지 후 종료", lambda: self.incoming.put(("quit", None))),
        ))
        self.app.withdraw()
        self.app.protocol("WM_DELETE_WINDOW", self.app.withdraw)
        self.app.after(0, self.app.withdraw)
        self.tray.run_detached()
        threading.Thread(target=self.network_loop, daemon=True, name="nana-web-agent").start()
        self.app.after(1000, self.tick)
        self.app.mainloop()
        self.running = False
        self.tray.stop()


def main():
    global TOKEN
    if sys.platform == "win32":
        import ctypes
        kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel.CreateMutexW.restype = ctypes.c_void_p
        kernel.CreateMutexW.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_wchar_p]
        global _instance_handle
        _instance_handle = kernel.CreateMutexW(None, False, "Local\\NanaCollector-" + WORKER_ID)
        if not _instance_handle:
            raise OSError(ctypes.get_last_error(), "수집기 실행 잠금을 만들 수 없습니다.")
        if ctypes.get_last_error() == 183:
            raise SystemExit("수집기가 이미 실행 중입니다. 트레이 아이콘을 확인하세요.")
    if not BASE_URL.startswith("https://") and not BASE_URL.startswith("http://127.0.0.1:"):
        raise SystemExit("COLLECTOR_API_BASE는 HTTPS 주소여야 합니다.")
    if len(TOKEN) < 32:
        print("홈페이지 관리자 통합수집기 메뉴에서 '연결 코드 발급'을 누르세요.")
        if sys.stdin is not None and sys.stdin.isatty():
            code = input("연결 코드 입력 (예: A1B2-C3D4-E5F6-7890): ").strip()
        else:
            from tkinter import Tk, simpledialog
            root = Tk(); root.withdraw()
            try:
                code = simpledialog.askstring("나나 수집기 연결", "홈페이지 관리자 통합수집기에서 발급한 연결 코드를 입력하세요.", parent=root)
            finally:
                root.destroy()
            if not code:
                raise SystemExit("연결 코드 입력을 취소했습니다.")
            code = code.strip()
        try:
            response = requests.post(
                BASE_URL + "/api/internal/collector/pair",
                json={"worker_id": WORKER_ID, "worker_name": socket.gethostname(), "code": code},
                timeout=15,
            )
            response.raise_for_status()
            result = response.json()
            TOKEN = result["token"]
            if len(TOKEN) < 32:
                raise ValueError("서버에서 올바른 연결 토큰을 받지 못했습니다.")
            save_config(token=TOKEN, worker_id=WORKER_ID)
            print("홈페이지와 인증 연결을 완료했습니다.")
        except (requests.RequestException, ValueError, KeyError) as exc:
            raise SystemExit("연결 실패. 코드를 다시 발급해 확인하세요: " + str(exc)) from exc
    print("중앙 수집기", VERSION, "연결:", BASE_URL)
    print("통합수집기 경로:", COLLECTOR_FILE)
    print("작업 PC:", WORKER_ID)
    app = load_app()
    WebAgent(app).start()


if __name__ == "__main__":
    # pythonw.exe has no console. Keep startup/network errors available locally.
    if sys.stdout is None or sys.stderr is None:
        CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
        handler = RotatingFileHandler(CONFIG_PATH.with_name("agent.log"), maxBytes=2_000_000, backupCount=2, encoding="utf-8")
        class LogStream:
            def write(self, text):
                if text.strip(): logging.getLogger("collector").info(text.strip())
            def flush(self): pass
        logging.basicConfig(handlers=[handler], level=logging.INFO)
        logging.getLogger("google_auth_oauthlib.flow").setLevel(logging.WARNING)
        sys.stdout = sys.stderr = LogStream()
    try:
        main()
    except Exception:
        import traceback
        traceback.print_exc()
        from tkinter import Tk, messagebox
        root = Tk(); root.withdraw()
        messagebox.showerror("나나 수집기 시작 실패", "수집기를 시작하지 못했습니다. Python 패키지와 통합수집기 경로를 확인하세요.\n로그: " + str(CONFIG_PATH.with_name("agent.log")), parent=root)
        root.destroy()
        raise
