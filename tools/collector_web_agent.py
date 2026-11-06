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
from pathlib import Path
from urllib.parse import quote, urlsplit

import requests

VERSION = "0.3.0"
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
            status, message, progress=100 if status == "completed" else None, terminal=True
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
            self.send_report("running", "중지 요청 처리 중: 현재 작업을 안전하게 마무리합니다.")
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
            if message != self.last_message or time.monotonic() - self.last_reported_at > 30:
                self.last_message = message
                self.last_reported_at = time.monotonic()
                self.send_report("running", message)
            if self.seen_alive and not alive:
                if self.stop_requested:
                    self.finish("cancelled", "수집기 실행 종료 확인 후 중지 완료")
                elif any(term.lower() in message.lower() for term in FAILURE_WORDS):
                    self.finish("failed", "수집기 오류 종료: " + message)
                else:
                    self.finish("completed", "수집기 실행 종료: " + message)
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
