# -*- coding: utf-8 -*-
"""나나 웹 통합수집기 - 중앙 Windows 실행 에이전트.

기존 nana_unified_collector_v1.4.2.py 파일을 수정하지 않고 사용합니다.
Windows 로그인 데스크톱에서 실행해야 합니다 (Tk / Chrome 사용).
환경변수: COLLECTOR_API_BASE, COLLECTOR_WORKER_TOKEN, NANA_COLLECTOR_FILE(선택)
"""

import importlib.util
import os
import queue
import re
import socket
import sys
import threading
import time
from pathlib import Path
from urllib.parse import quote

import requests

VERSION = "0.1.0"
BASE_URL = os.environ.get("COLLECTOR_API_BASE", "").rstrip("/")
TOKEN = os.environ.get("COLLECTOR_WORKER_TOKEN", "")
COLLECTOR_FILE = Path(os.environ.get(
    "NANA_COLLECTOR_FILE",
    str(Path(__file__).with_name("nana_unified_collector_v1.4.2.py")),
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
    if not COLLECTOR_FILE.is_file():
        raise RuntimeError("수집기 파일을 찾지 못했습니다: " + str(COLLECTOR_FILE))
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
            self.app.open_tab(platform)
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
                    "current_job": current["id"] if current else None,
                })
                if current:
                    path = "/api/internal/collector/jobs/" + current["id"] + "/status"
                    status = request("GET", path + "?worker_id=" + quote(WORKER_ID))["status"]
                    if status == "cancel_requested":
                        self.incoming.put(("cancel", current["id"]))
                elif not self.claimed:
                    data = request("POST", "/api/internal/collector/next", {"worker_id": WORKER_ID})
                    job = data.get("job")
                    if job:
                        with self.lock:
                            self.claimed = True
                        self.incoming.put(("start", job))
            except Exception as exc:
                # Never silently pretend the worker is online on network failure.
                print("[웹 연결 오류]", type(exc).__name__, str(exc)[:250], flush=True)
            time.sleep(POLL_SECONDS)

    def start(self):
        threading.Thread(target=self.network_loop, daemon=True, name="nana-web-agent").start()
        self.app.after(1000, self.tick)
        self.app.mainloop()
        self.running = False


def main():
    if not BASE_URL.startswith("https://") and not BASE_URL.startswith("http://127.0.0.1:"):
        raise SystemExit("COLLECTOR_API_BASE는 HTTPS 주소여야 합니다.")
    if len(TOKEN) < 32:
        raise SystemExit("COLLECTOR_WORKER_TOKEN은 32자 이상의 랜덤 값이어야 합니다.")
    print("중앙 수집기", VERSION, "연결:", BASE_URL)
    print("통합수집기 경로:", COLLECTOR_FILE)
    print("작업 PC:", WORKER_ID)
    app = load_app()
    WebAgent(app).start()


if __name__ == "__main__":
    main()
