# -*- coding: utf-8 -*-
"""웰빙내과 수액실 — 서버 (파이썬 표준 라이브러리만 사용)

켜기:  python server.py            → http://127.0.0.1:8897
자료:  저장소 밖 ~/wb-dev-data/iv/iv.sqlite3  (WB_IV_DATA 로 바꿀 수 있음)

상담앱과 같은 방식(http.server + SQLite + index.html 한 장)이라
나중에 consult-app 안으로 옮길 때 표·API 이름을 그대로 쓸 수 있다.
"""
import contextlib
import datetime as dt
import json
import os
import re
import sqlite3
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import catalog as C  # noqa: E402
import engine as E   # noqa: E402

PORT = int(os.environ.get("WB_IV_PORT", "8897"))
DATA_DIR = os.environ.get("WB_IV_DATA") or os.path.join(os.path.expanduser("~"), "wb-dev-data", "iv")

SCHEMA = """
CREATE TABLE IF NOT EXISTS patients(
  id INTEGER PRIMARY KEY, chart_no TEXT UNIQUE, name TEXT, birth TEXT, sex TEXT,
  phone TEXT, memo TEXT, created TEXT);
CREATE TABLE IF NOT EXISTS iv_courses(
  id INTEGER PRIMARY KEY, patient_id INTEGER, program TEXT, tier TEXT,
  total INTEGER, per_week INTEGER, start_date TEXT, price INTEGER, price_each INTEGER,
  status TEXT DEFAULT '수액중', subtype TEXT, focus TEXT, meds TEXT, note TEXT,
  oral_plan TEXT, created TEXT, ended TEXT);
CREATE TABLE IF NOT EXISTS iv_sessions(
  id INTEGER PRIMARY KEY, course_id INTEGER, n INTEGER, d TEXT,
  vitals TEXT, checks TEXT, recipe TEXT, minutes INTEGER, gtt INTEGER,
  start_time TEXT, end_time TEXT, reactions TEXT, nurse TEXT, doctor_ok INTEGER DEFAULT 0,
  note TEXT, created TEXT);
CREATE TABLE IF NOT EXISTS iv_scores(
  id INTEGER PRIMARY KEY, course_id INTEGER, d TEXT, scale TEXT, value INTEGER,
  detail TEXT, created TEXT);
CREATE TABLE IF NOT EXISTS iv_oral(
  id INTEGER PRIMARY KEY, course_id INTEGER, sup TEXT, d TEXT, packs INTEGER,
  days INTEGER, price INTEGER, created TEXT);
CREATE TABLE IF NOT EXISTS iv_settings(k TEXT PRIMARY KEY, v TEXT);
"""


def now():
    return dt.datetime.now().strftime("%Y-%m-%d %H:%M")


def today():
    return dt.date.today().isoformat()


class DB:
    def __init__(self, path):
        d = os.path.dirname(path)
        if d:
            os.makedirs(d, exist_ok=True)
        self.path = path
        with self.conn() as c:
            c.executescript(SCHEMA)

    @contextlib.contextmanager
    def conn(self):
        """with 블록이 끝나면 저장(commit)하고 닫는다."""
        c = sqlite3.connect(self.path)
        c.row_factory = sqlite3.Row
        try:
            yield c
            c.commit()
        except Exception:
            c.rollback()
            raise
        finally:
            c.close()

    # ── 설정 덮어쓰기 ──
    def overrides(self):
        with self.conn() as c:
            r = c.execute("SELECT v FROM iv_settings WHERE k='catalog'").fetchone()
        return json.loads(r["v"]) if r else {}

    def save_overrides(self, ov):
        with self.conn() as c:
            c.execute("INSERT OR REPLACE INTO iv_settings(k,v) VALUES('catalog',?)",
                      (json.dumps(ov, ensure_ascii=False),))

    def catalog(self):
        cat = C.apply_overrides(C.default_catalog(), self.overrides())
        cat["conflicts"] = E.check_catalog(cat)   # 같은 백 금지 조합을 어긴 등급
        return cat


def _row(r):
    if r is None:
        return None
    d = dict(r)
    for k in ("vitals", "checks", "recipe", "reactions", "detail", "oral_plan", "focus"):
        if k in d and isinstance(d[k], str) and d[k][:1] in "[{":
            try:
                d[k] = json.loads(d[k])
            except ValueError:
                pass
    return d


class App:
    """API 처리. HTTP와 분리해 두어 시험에서 바로 부를 수 있다."""

    def __init__(self, db):
        self.db = db

    # ── 환자 ──
    def patients(self, q=""):
        with self.db.conn() as c:
            if q:
                like = "%" + q + "%"
                rs = c.execute("SELECT * FROM patients WHERE chart_no LIKE ? OR name LIKE ? "
                               "ORDER BY id DESC LIMIT 50", (like, like)).fetchall()
            else:
                rs = c.execute("SELECT * FROM patients ORDER BY id DESC LIMIT 50").fetchall()
        return [_row(r) for r in rs]

    def add_patient(self, b):
        name = (b.get("name") or "").strip()
        chart = (b.get("chart_no") or "").strip()
        if not name or not chart:
            raise ValueError("차트번호와 이름을 넣어 주세요")
        with self.db.conn() as c:
            ex = c.execute("SELECT id FROM patients WHERE chart_no=?", (chart,)).fetchone()
            if ex:
                return {"id": ex["id"], "existing": True}
            cur = c.execute("INSERT INTO patients(chart_no,name,birth,sex,phone,memo,created) "
                            "VALUES(?,?,?,?,?,?,?)",
                            (chart, name, b.get("birth"), b.get("sex"), b.get("phone"),
                             b.get("memo"), now()))
            return {"id": cur.lastrowid}

    def patient(self, pid):
        with self.db.conn() as c:
            p = _row(c.execute("SELECT * FROM patients WHERE id=?", (pid,)).fetchone())
            if not p:
                raise KeyError("환자 없음")
            cs = [self._course_full(c, r) for r in
                  c.execute("SELECT * FROM iv_courses WHERE patient_id=? ORDER BY id DESC", (pid,))]
        p["courses"] = cs
        return p

    # ── 코스 ──
    def _course_full(self, c, r):
        co = _row(r)
        co["sessions"] = [_row(x) for x in c.execute(
            "SELECT * FROM iv_sessions WHERE course_id=? ORDER BY n", (co["id"],))]
        co["scores"] = [_row(x) for x in c.execute(
            "SELECT * FROM iv_scores WHERE course_id=? ORDER BY d, id", (co["id"],))]
        co["oral"] = [_row(x) for x in c.execute(
            "SELECT * FROM iv_oral WHERE course_id=? ORDER BY d, id", (co["id"],))]
        done = [s["d"] for s in co["sessions"]]
        co["plan_dates"] = E.plan_dates(co["start_date"], co["total"], co["per_week"])
        co["next_due"] = E.next_due(done, co["start_date"], co["total"], co["per_week"])
        co["done"] = len(done)
        # 보충제 다음 구매일
        last = {}
        for o in co["oral"]:
            due = E.refill_due(o["d"], o["days"] or 30)
            if o["sup"] not in last or due > last[o["sup"]]["due"]:
                last[o["sup"]] = {"sup": o["sup"], "last": o["d"], "due": due}
        co["refills"] = sorted(last.values(), key=lambda x: x["due"])
        return co

    def course(self, cid):
        with self.db.conn() as c:
            r = c.execute("SELECT * FROM iv_courses WHERE id=?", (cid,)).fetchone()
            if not r:
                raise KeyError("코스 없음")
            return self._course_full(c, r)

    def add_course(self, pid, b):
        cat = self.db.catalog()
        prog = b.get("program")
        tier = b.get("tier") or "basic"
        if prog not in cat["programs"]:
            raise ValueError("프로그램을 골라 주세요")
        if tier not in cat["programs"][prog]["tiers"]:
            raise ValueError("등급을 골라 주세요")
        P = cat["programs"][prog]
        opt = P["course_options"][int(b.get("option") or 0)]
        total = int(b.get("total") or opt["total"])
        per_week = int(b.get("per_week") if b.get("per_week") is not None else opt["per_week"])
        each = P["tiers"][tier]["price"]
        price = b.get("price")
        if price in (None, ""):
            price = C.package_price(each, total, cat["package_discount"])
        subtype = b.get("subtype") if prog == "gut" else None
        focus = b.get("focus") or []
        plan = E.oral_plan(prog, cat, subtype=subtype, focus=focus)
        with self.db.conn() as c:
            if not c.execute("SELECT 1 FROM patients WHERE id=?", (pid,)).fetchone():
                raise KeyError("환자 없음")
            cur = c.execute(
                "INSERT INTO iv_courses(patient_id,program,tier,total,per_week,start_date,price,"
                "price_each,subtype,focus,meds,note,oral_plan,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (pid, prog, tier, total, per_week, b.get("start_date") or today(), price, each,
                 subtype, json.dumps(focus, ensure_ascii=False), b.get("meds") or "",
                 b.get("note") or "", json.dumps(plan, ensure_ascii=False), now()))
            return {"id": cur.lastrowid, "price": price}

    def update_course(self, cid, b):
        allowed = ("status", "tier", "meds", "note", "price", "subtype", "total")
        sets, vals = [], []
        for k in allowed:
            if k in b:
                sets.append(k + "=?")
                vals.append(b[k])
        if "focus" in b:
            sets.append("focus=?")
            vals.append(json.dumps(b["focus"], ensure_ascii=False))
        if b.get("status") in ("종료", "중단"):
            sets.append("ended=?")
            vals.append(today())
        if "subtype" in b or "focus" in b:
            co = self.course(cid)
            plan = E.oral_plan(co["program"], self.db.catalog(),
                               subtype=b.get("subtype", co["subtype"]),
                               focus=b.get("focus", co["focus"] or []))
            sets.append("oral_plan=?")
            vals.append(json.dumps(plan, ensure_ascii=False))
        if not sets:
            return {"ok": True}
        with self.db.conn() as c:
            c.execute("UPDATE iv_courses SET %s WHERE id=?" % ",".join(sets), vals + [cid])
        return {"ok": True}

    # ── 오늘 확인 → 조제 미리보기 ──
    def preview(self, b):
        cat = self.db.catalog()
        r = E.build_recipe(b.get("program"), b.get("tier") or "basic", b.get("vitals") or {},
                           b.get("checks") or [], cat, weight=(b.get("vitals") or {}).get("weight"))
        minutes = int(b.get("minutes") or r["minutes"])
        r["drip"] = E.drip(r["volume_ml"], minutes, int(b.get("gtt_set") or 20))
        r["minutes_used"] = minutes
        return r

    # ── 회차 기록 ──
    def add_session(self, cid, b):
        co = self.course(cid)
        if co["done"] >= co["total"]:
            raise ValueError("이미 %d회 모두 맞았습니다" % co["total"])
        cat = self.db.catalog()
        tier = b.get("tier") or co["tier"]
        r = E.build_recipe(co["program"], tier, b.get("vitals") or {}, b.get("checks") or [], cat)
        if r["stops"] and not b.get("doctor_ok"):
            raise ValueError("원장님 확인이 필요합니다: " + " / ".join(r["stops"]))
        minutes = int(b.get("minutes") or r["minutes"])
        d = b.get("d") or today()
        n = co["done"] + 1
        with self.db.conn() as c:
            cur = c.execute(
                "INSERT INTO iv_sessions(course_id,n,d,vitals,checks,recipe,minutes,gtt,start_time,"
                "end_time,reactions,nurse,doctor_ok,note,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (cid, n, d, json.dumps(b.get("vitals") or {}, ensure_ascii=False),
                 json.dumps(b.get("checks") or [], ensure_ascii=False),
                 json.dumps(r, ensure_ascii=False), minutes,
                 E.drip(r["volume_ml"], minutes, int(b.get("gtt_set") or 20))["gtt_per_min"],
                 b.get("start_time"), b.get("end_time"),
                 json.dumps(b.get("reactions") or [], ensure_ascii=False),
                 b.get("nurse"), 1 if b.get("doctor_ok") else 0, b.get("note"), now()))
            sid = cur.lastrowid
            # 수액을 다 맞으면 → 경구 유지 단계로
            if n >= co["total"] and co["status"] == "수액중":
                plan = co.get("oral_plan") or {}
                nxt = "경구유지" if (plan.get("after") or plan.get("with")) else "종료"
                c.execute("UPDATE iv_courses SET status=?, ended=? WHERE id=?",
                          (nxt, d if nxt == "종료" else None, cid))
        co2 = self.course(cid)
        sess = dict(n=n, vitals=b.get("vitals") or {}, minutes=minutes,
                    start_time=b.get("start_time"), end_time=b.get("end_time"),
                    reactions=b.get("reactions") or [], note=b.get("note"),
                    next_due=co2["next_due"])
        return {"id": sid, "n": n, "emr": E.emr_text(co2, sess, r), "next_due": co2["next_due"],
                "status": co2["status"]}

    def update_session(self, sid, b):
        sets, vals = [], []
        for k in ("start_time", "end_time", "note", "nurse"):
            if k in b:
                sets.append(k + "=?")
                vals.append(b[k])
        if "reactions" in b:
            sets.append("reactions=?")
            vals.append(json.dumps(b["reactions"], ensure_ascii=False))
        if sets:
            with self.db.conn() as c:
                c.execute("UPDATE iv_sessions SET %s WHERE id=?" % ",".join(sets), vals + [sid])
        return self.session_emr(sid)

    def session_emr(self, sid):
        with self.db.conn() as c:
            s = _row(c.execute("SELECT * FROM iv_sessions WHERE id=?", (sid,)).fetchone())
        if not s:
            raise KeyError("회차 없음")
        co = self.course(s["course_id"])
        s["next_due"] = co["next_due"] if s["n"] == co["done"] else None
        return {"emr": E.emr_text(co, s, s["recipe"])}

    def delete_session(self, sid):
        with self.db.conn() as c:
            s = c.execute("SELECT course_id, n FROM iv_sessions WHERE id=?", (sid,)).fetchone()
            if not s:
                raise KeyError("회차 없음")
            c.execute("DELETE FROM iv_sessions WHERE id=?", (sid,))
            # 뒤 회차 번호 당기기
            c.execute("UPDATE iv_sessions SET n=n-1 WHERE course_id=? AND n>?", (s["course_id"], s["n"]))
            c.execute("UPDATE iv_courses SET status='수액중', ended=NULL WHERE id=? AND status IN ('경구유지','종료')",
                      (s["course_id"],))
        return {"ok": True}

    # ── 증상 점수 ──
    def add_score(self, cid, b):
        co = self.course(cid)
        scale = co["program"]
        detail = b.get("detail") or {}
        if scale == "gut" and detail:
            res = E.ibs_sss(detail.get("pain"), detail.get("pain_days"), detail.get("bloat"),
                            detail.get("bowel_unsat"), detail.get("life"))
            value = res["total"]
            detail["grade"] = res["grade"]
        else:
            value = int(b.get("value"))
        with self.db.conn() as c:
            cur = c.execute("INSERT INTO iv_scores(course_id,d,scale,value,detail,created) VALUES(?,?,?,?,?,?)",
                            (cid, b.get("d") or today(), scale, value,
                             json.dumps(detail, ensure_ascii=False), now()))
        return {"id": cur.lastrowid, "value": value, "grade": detail.get("grade")}

    def delete_score(self, sid):
        with self.db.conn() as c:
            c.execute("DELETE FROM iv_scores WHERE id=?", (sid,))
        return {"ok": True}

    # ── 보충제 지급 ──
    def add_oral(self, cid, b):
        self.course(cid)
        cat = self.db.catalog()
        sup = b.get("sup")
        if sup not in cat["supplements"]:
            raise ValueError("보충제를 골라 주세요")
        s = cat["supplements"][sup]
        packs = int(b.get("packs") or 1)
        days = int(b.get("days") or (s.get("days_per_pack") or 30) * packs)
        price = b.get("price")
        if price in (None, "") and s.get("price"):
            price = s["price"] * packs
        with self.db.conn() as c:
            cur = c.execute("INSERT INTO iv_oral(course_id,sup,d,packs,days,price,created) VALUES(?,?,?,?,?,?,?)",
                            (cid, sup, b.get("d") or today(), packs, days, price, now()))
        return {"id": cur.lastrowid, "due": E.refill_due(b.get("d") or today(), days)}

    def delete_oral(self, oid):
        with self.db.conn() as c:
            c.execute("DELETE FROM iv_oral WHERE id=?", (oid,))
        return {"ok": True}

    # ── 오늘 할 일 ──
    def board(self, days=7, on=None):
        on = on or today()
        until = (dt.date.fromisoformat(on) + dt.timedelta(days=int(days))).isoformat()
        due, refill, followup = [], [], []
        cat = self.db.catalog()
        with self.db.conn() as c:
            rows = c.execute("SELECT co.*, p.name, p.chart_no FROM iv_courses co "
                             "JOIN patients p ON p.id=co.patient_id "
                             "WHERE co.status IN ('수액중','경구유지')").fetchall()
            for r in rows:
                co = self._course_full(c, r)
                base = {"course_id": co["id"], "patient_id": co["patient_id"], "name": r["name"],
                        "chart_no": r["chart_no"], "program": co["program"],
                        "program_name": cat["programs"][co["program"]]["name"],
                        "tier": co["tier"], "done": co["done"], "total": co["total"]}
                if co["status"] == "수액중" and co["next_due"] and co["next_due"] <= until:
                    due.append(dict(base, d=co["next_due"], late=co["next_due"] < on))
                for rf in co["refills"]:
                    if rf["due"] <= until:
                        refill.append(dict(base, d=rf["due"], sup=rf["sup"],
                                           sup_name=cat["supplements"].get(rf["sup"], {}).get("name", rf["sup"]),
                                           late=rf["due"] < on))
                # 점수 다시 잴 때(시작일 + n주)
                fw = cat["programs"][co["program"]].get("followup_weeks") or []
                have = {s["d"] for s in co["scores"]}
                start = dt.date.fromisoformat(co["start_date"])
                for w in fw:
                    when = (start + dt.timedelta(weeks=w)).isoformat()
                    near = any(abs((dt.date.fromisoformat(h) - dt.date.fromisoformat(when)).days) <= 7
                               for h in have)
                    if not near and when <= until and when >= (dt.date.fromisoformat(on) - dt.timedelta(days=14)).isoformat():
                        followup.append(dict(base, d=when, week=w))
        key = lambda x: x["d"]
        return {"on": on, "due": sorted(due, key=key), "refill": sorted(refill, key=key),
                "followup": sorted(followup, key=key)}

    # ── 설정 ──
    def set_catalog(self, b):
        ov = self.db.overrides()
        for kk, vv in (b.get("ingredients") or {}).items():
            ov.setdefault("ingredients", {})[kk] = vv
        for k in ("programs", "supplements"):
            for kk, vv in (b.get(k) or {}).items():
                ov.setdefault(k, {}).setdefault(kk, {})
                if k == "programs":
                    for tk, tv in (vv.get("tiers") or {}).items():
                        ov[k][kk].setdefault("tiers", {}).setdefault(tk, {}).update(tv)
                else:
                    ov[k][kk].update(vv)
        if "package_discount" in b:
            ov["package_discount"] = int(b["package_discount"])
        if b.get("reset"):
            ov = {}
        self.db.save_overrides(ov)
        return self.db.catalog()


ROUTES = [
    ("GET", r"/api/catalog$", lambda a, m, q, b: a.db.catalog()),
    ("PUT", r"/api/catalog$", lambda a, m, q, b: a.set_catalog(b)),
    ("GET", r"/api/board$", lambda a, m, q, b: a.board(q.get("days", 7), q.get("on"))),
    ("GET", r"/api/patients$", lambda a, m, q, b: a.patients(q.get("q", ""))),
    ("POST", r"/api/patients$", lambda a, m, q, b: a.add_patient(b)),
    ("GET", r"/api/patients/(\d+)$", lambda a, m, q, b: a.patient(int(m[0]))),
    ("POST", r"/api/patients/(\d+)/courses$", lambda a, m, q, b: a.add_course(int(m[0]), b)),
    ("GET", r"/api/courses/(\d+)$", lambda a, m, q, b: a.course(int(m[0]))),
    ("PATCH", r"/api/courses/(\d+)$", lambda a, m, q, b: a.update_course(int(m[0]), b)),
    ("POST", r"/api/preview$", lambda a, m, q, b: a.preview(b)),
    ("POST", r"/api/courses/(\d+)/sessions$", lambda a, m, q, b: a.add_session(int(m[0]), b)),
    ("PATCH", r"/api/sessions/(\d+)$", lambda a, m, q, b: a.update_session(int(m[0]), b)),
    ("GET", r"/api/sessions/(\d+)/emr$", lambda a, m, q, b: a.session_emr(int(m[0]))),
    ("DELETE", r"/api/sessions/(\d+)$", lambda a, m, q, b: a.delete_session(int(m[0]))),
    ("POST", r"/api/courses/(\d+)/scores$", lambda a, m, q, b: a.add_score(int(m[0]), b)),
    ("DELETE", r"/api/scores/(\d+)$", lambda a, m, q, b: a.delete_score(int(m[0]))),
    ("POST", r"/api/courses/(\d+)/oral$", lambda a, m, q, b: a.add_oral(int(m[0]), b)),
    ("DELETE", r"/api/oral/(\d+)$", lambda a, m, q, b: a.delete_oral(int(m[0]))),
]


def dispatch(app, method, path, query, body):
    for meth, pat, fn in ROUTES:
        if meth != method:
            continue
        m = re.match(pat, path)
        if m:
            return fn(app, m.groups(), query, body)
    raise LookupError("없는 주소")


def make_handler(app):
    class H(BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def _send(self, code, obj=None, raw=None, ctype="application/json; charset=utf-8"):
            data = raw if raw is not None else json.dumps(obj, ensure_ascii=False).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def _go(self, method):
            u = urlparse(self.path)
            if method == "GET" and not u.path.startswith("/api/"):
                if u.path in ("/", "/index.html"):
                    with open(os.path.join(HERE, "index.html"), "rb") as f:
                        return self._send(200, raw=f.read(), ctype="text/html; charset=utf-8")
                return self._send(404, {"error": "없음"})
            q = {k: v[0] for k, v in parse_qs(u.query).items()}
            body = {}
            n = int(self.headers.get("Content-Length") or 0)
            if n:
                try:
                    body = json.loads(self.rfile.read(n).decode("utf-8"))
                except ValueError:
                    return self._send(400, {"error": "잘못된 자료"})
            try:
                return self._send(200, dispatch(app, method, u.path, q, body))
            except LookupError as e:
                return self._send(404, {"error": str(e).strip("'")})
            except ValueError as e:
                return self._send(400, {"error": str(e)})
            except Exception as e:  # 화면에 원인을 보여 준다
                return self._send(500, {"error": "서버 오류: %s" % e})

        def do_GET(self):
            self._go("GET")

        def do_POST(self):
            self._go("POST")

        def do_PUT(self):
            self._go("PUT")

        def do_PATCH(self):
            self._go("PATCH")

        def do_DELETE(self):
            self._go("DELETE")
    return H


def main():
    db = DB(os.path.join(DATA_DIR, "iv.sqlite3"))
    app = App(db)
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), make_handler(app))
    print("웰빙내과 수액실: http://127.0.0.1:%d   (자료: %s)" % (PORT, db.path))
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
