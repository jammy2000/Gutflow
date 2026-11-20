# -*- coding: utf-8 -*-
"""수액실 시험:  cd wellbeing-iv/tests && python -m unittest discover"""
import json
import os
import sys
import tempfile
import threading
import unittest
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

import catalog as C  # noqa: E402
import engine as E   # noqa: E402
import server as SV  # noqa: E402


class CatalogTest(unittest.TestCase):
    cat = C.default_catalog()

    def test_ten_programs(self):
        names = [self.cat["programs"][k]["name"] for k in self.cat["order"]]
        self.assertEqual(len(names), 10)
        for want in ["면역증강", "활력(기력증진)", "피로회복", "어지러움(혈류개선)", "갱년기",
                     "백옥(피부미백)", "숙취회복", "간기능개선", "장염", "감기몸살"]:
            self.assertIn(want, names)
        self.assertIn("gut", self.cat["later"])          # 장면역강화: 디펩티벤 입고 뒤
        self.assertNotIn("gut", self.cat["order"])

    def bags(self, pk, tk):
        return self.cat["programs"][pk]["tiers"][tk]["bags"]

    def test_base_rule(self):
        """기본 = N/S 100 + 삐콤 + 마그네슘, 프리미엄 = 써프라민 100 + 삐콤 + 마그네슘"""
        for pk in self.cat["order"]:
            for tk, t in self.cat["programs"][pk]["tiers"].items():
                first = t["bags"][0]
                keys = [k for k, _ in first["add"]]
                self.assertIn("bcx", keys, (pk, tk))
                self.assertIn("masi", keys, (pk, tk))
                self.assertEqual(first["base"], "SUP100" if tk == "premium" else "NS100", (pk, tk))

    def all_keys(self, pk, tk):
        return [k for b in self.bags(pk, tk) for k, _ in b["add"]]

    def test_additions(self):
        for pk in ["fatigue", "immune", "vitality", "cold", "meno", "hangover"]:
            for tk in ["basic", "premium"]:
                self.assertIn("meritc", self.all_keys(pk, tk), pk)
        for pk in ["white", "hangover", "liver", "vitality"]:
            for tk in ["basic", "premium"]:
                self.assertIn("vichi", self.all_keys(pk, tk), pk)
        self.assertIn("jinko", self.all_keys("dizzy", "basic"))

    def test_no_laennec_yet(self):
        for pk in self.cat["order"]:
            for tk in self.cat["programs"][pk]["tiers"]:
                self.assertNotIn("laennec", self.all_keys(pk, tk), (pk, tk))

    def test_only_clinic_stock(self):
        stock = {"NS100", "SUP100", "SHOT", "meritc", "masi", "bcx", "lanovin", "jinko", "vichi",
                 "dipeptiven", "laennec"}
        self.assertEqual(set(C.ING), stock)
        self.assertNotIn("hisi", C.ING)

    def test_requested_schedules(self):
        P = C.PROGRAMS
        self.assertEqual(P["gi"]["course_options"][0]["total"], 1)
        self.assertEqual(P["cold"]["course_options"][0]["total"], 1)
        self.assertEqual(P["white"]["course_options"][0]["per_week"], 2)
        self.assertEqual((P["immune"]["course_options"][0]["total"], P["immune"]["course_options"][0]["per_week"]), (6, 2))

    def test_gi_prices_fixed_by_director(self):
        t = C.PROGRAMS["gi"]["tiers"]
        self.assertEqual((t["basic"]["price"], t["plus"]["price"], t["premium"]["price"]), (35000, 60000, 90000))

    def test_every_recipe_uses_known_ingredients(self):
        for pk, p in C.PROGRAMS.items():
            for tk, t in p["tiers"].items():
                for bag in t["bags"]:
                    self.assertTrue(C.ING[bag["base"]].get("base"), (pk, tk, bag["base"]))
                    for k, q in bag["add"]:
                        self.assertIn(k, C.ING, (pk, tk, k))
                        self.assertFalse(C.ING[k].get("base"))
                        self.assertGreater(q, 0)

    def test_every_program_continues_orally(self):
        for pk, p in C.PROGRAMS.items():
            plan = E.oral_plan(pk, subtype="D" if pk == "gut" else None)
            self.assertTrue(plan["with"] or plan["after"], pk)
            for r in plan["with"] + plan["after"]:
                self.assertIn(r["sup"], C.SUPPLEMENTS, (pk, r["sup"]))

    def test_gut_uses_dipeptiven_every_tier(self):
        for tk in C.PROGRAMS["gut"]["tiers"]:
            self.assertIn("dipeptiven", self.all_keys("gut", tk))

    def test_dipeptiven_carrier_ratio_ok_in_defaults(self):
        for pk, p in C.PROGRAMS.items():
            for tk in p["tiers"]:
                r = E.build_recipe(pk, tk, {"sbp": 120})
                self.assertFalse([w for w in r["warns"] if "바탕액" in w], (pk, tk, r["warns"]))

    def test_package_price(self):
        self.assertEqual(C.package_price(50000, 4, 10), 180000)
        self.assertEqual(C.package_price(35000, 1, 10), 35000)

    def test_overrides(self):
        cat = C.apply_overrides(C.default_catalog(),
                                {"programs": {"fatigue": {"tiers": {"basic": {"price": 55000}}}},
                                 "supplements": {"vitd": {"price": 15000}}, "package_discount": 20})
        self.assertEqual(cat["programs"]["fatigue"]["tiers"]["basic"]["price"], 55000)
        self.assertEqual(cat["supplements"]["vitd"]["price"], 15000)
        self.assertEqual(cat["package_discount"], 20)
        self.assertEqual(C.PROGRAMS["fatigue"]["tiers"]["basic"]["price"], 50000)  # 원본은 그대로

    def test_custom_ingredient(self):
        cat = C.apply_overrides(C.default_catalog(), {"ingredients": {"x_1": {
            "name": "라에넥", "unit": "A", "generic": "태반", "groups": ["placenta"]}}})
        self.assertEqual(cat["ingredients"]["x_1"]["name"], "라에넥")


class RecipeTest(unittest.TestCase):
    def names(self, r, removed=False):
        return [it["key"] for b in r["bags"] for it in b["items"] if it["removed"] == removed]

    def test_low_sbp_removes_magnesium(self):
        r = E.build_recipe("fatigue", "basic", {"sbp": 100})
        self.assertIn("masi", self.names(r, removed=True))
        r = E.build_recipe("fatigue", "basic", {"sbp": 101})
        self.assertIn("masi", self.names(r))

    def test_very_low_bp_stops(self):
        self.assertTrue(E.build_recipe("cold", "basic", {"sbp": 85})["stops"])

    def test_pregnancy_stops_and_removes_ginkgo(self):
        r = E.build_recipe("dizzy", "basic", {"sbp": 120}, ["preg"])
        self.assertTrue(r["stops"])
        self.assertIn("jinko", self.names(r, removed=True))

    def test_g6pd_removes_vitamin_c(self):
        r = E.build_recipe("cold", "basic", {"sbp": 120}, ["g6pd"])
        self.assertIn("meritc", self.names(r, removed=True))

    def test_renal_removes_whole_amino_bag(self):
        r = E.build_recipe("fatigue", "premium", {"sbp": 120}, ["renal"])
        self.assertTrue(r["bags"][0]["removed"])
        self.assertTrue(any("모두 빠짐" in w for w in r["warns"]))
        self.assertEqual(r["volume_ml"], 0)

    def test_sulfite_removes_bcomplex_and_surpramin(self):
        r = E.build_recipe("fatigue", "premium", {"sbp": 120}, ["sulfite"])
        self.assertTrue(r["bags"][0]["removed"])
        r = E.build_recipe("fatigue", "basic", {"sbp": 120}, ["sulfite"])
        self.assertIn("bcx", self.names(r, removed=True))

    def test_anticoag_removes_ginkgo(self):
        r = E.build_recipe("dizzy", "premium", {"sbp": 120}, ["anticoag"])
        self.assertIn("jinko", self.names(r, removed=True))

    def test_dipeptiven_weight_limit(self):
        r = E.build_recipe("gut", "premium", {"sbp": 120, "weight": 15})
        self.assertTrue(any("한도" in w for w in r["warns"]))
        r = E.build_recipe("gut", "premium", {"sbp": 120, "weight": 60})
        self.assertFalse(any("한도" in w for w in r["warns"]))

    def test_donation_removes_laennec_when_added(self):
        cat = C.apply_overrides(C.default_catalog(), {"programs": {"meno": {"tiers": {"basic": {"bags": [
            {"base": "NS100", "add": [["bcx", 1], ["masi", 5]]}, {"base": "SHOT", "add": [["laennec", 2]]}]}}}}})
        r = E.build_recipe("meno", "basic", {"sbp": 120}, ["donate"], cat)
        self.assertIn("laennec", self.names(r, removed=True))

    def test_notices(self):
        r = E.build_recipe("fatigue", "basic", {"sbp": 120})
        self.assertTrue(any("비타민C" in n for n in r["notices"]))

    def test_slow_check(self):
        base = E.build_recipe("cold", "basic", {"sbp": 120})["minutes"]
        r = E.build_recipe("cold", "basic", {"sbp": 120}, ["first"])
        self.assertEqual(r["minutes"], int(round(base * 1.5)))

    def test_volume(self):
        r = E.build_recipe("white", "basic", {"sbp": 120})
        self.assertEqual(r["volume_ml"], 100 + 2 + 5 + 100)


class MixTest(unittest.TestCase):
    """같이 섞으면 안 되는 조합"""
    cat = C.default_catalog()

    def conf(self, bags):
        return E.mix_conflicts(bags, self.cat)

    def test_defaults_have_no_forbidden_pairs(self):
        self.assertEqual(E.check_catalog(self.cat), [])

    def test_vitc_with_b12(self):
        c, _, ids = self.conf([{"base": "NS100", "add": [["meritc", 10], ["lanovin", 1]]}])
        self.assertEqual([x["rule"] for x in c], ["vitc_b12"])
        self.assertIn("vitc_b12", ids)

    def test_split_bags_ok_but_rule_listed(self):
        c, _, ids = self.conf([{"base": "NS100", "add": [["meritc", 10]]},
                               {"base": "NS100", "add": [["lanovin", 1]]}])
        self.assertEqual(c, [])
        self.assertIn("vitc_b12", ids)  # 옆 칸에서 강조

    def test_mg_with_bicarbonate_products(self):
        c, _, _ = self.conf([{"base": "NS100", "add": [["masi", 10], ["vichi", 1]]}])
        self.assertIn("mg_bicarb", [x["rule"] for x in c])
        c, notes, _ = self.conf([{"base": "NS100", "add": [["masi", 10], ["meritc", 10]]}])
        self.assertEqual(c, [])                                   # 11-20: 같은 백 가능(주의)
        self.assertIn("mg_vitc", [x["rule"] for x in notes])

    def test_gsh_with_b12(self):
        c, _, _ = self.conf([{"base": "NS100", "add": [["vichi", 1], ["lanovin", 1]]}])
        self.assertIn("gsh_b12", [x["rule"] for x in c])

    def test_surpramin_with_b12(self):
        c, _, _ = self.conf([{"base": "SUP100", "add": [["lanovin", 1]]}])
        self.assertIn("aa_b12", [x["rule"] for x in c])

    def test_dipeptiven_alone_in_amino_acid(self):
        c, _, _ = self.conf([{"base": "SUP100", "add": [["dipeptiven", 20], ["bcx", 1]]}])
        self.assertIn("dipep_any", [x["rule"] for x in c])
        c, _, _ = self.conf([{"base": "NS100", "add": [["dipeptiven", 20]]}])
        self.assertIn("carrier", [x["rule"] for x in c])
        c, _, _ = self.conf([{"base": "SUP100", "add": [["dipeptiven", 20]]}])
        self.assertEqual(c, [])

    def test_ginkgo_alone(self):
        c, _, _ = self.conf([{"base": "NS100", "add": [["jinko", 1], ["masi", 10]]}])
        self.assertIn("ginkgo_any", [x["rule"] for x in c])

    def test_care_rule_is_note_not_conflict(self):
        c, notes, _ = self.conf([{"base": "SUP100", "add": [["bcx", 1]]}])
        self.assertEqual(c, [])
        self.assertIn("aa_bcx", [x["rule"] for x in notes])

    def test_dipeptiven_ratio(self):
        cat = C.apply_overrides(C.default_catalog(),
                                {"programs": {"gut": {"tiers": {"basic": {"bags": [
                                    {"base": "SUP100", "add": [["dipeptiven", 30]]}]}}}}})
        r = E.build_recipe("gut", "basic", {"sbp": 120}, [], cat)
        self.assertTrue(any("바탕액" in w for w in r["warns"]))

    def test_recipe_reports_conflict_after_bad_edit(self):
        cat = C.apply_overrides(C.default_catalog(),
                                {"programs": {"cold": {"tiers": {"basic": {"bags": [
                                    {"base": "NS100", "add": [["meritc", 20], ["lanovin", 1]]}]}}}}})
        r = E.build_recipe("cold", "basic", {"sbp": 120}, [], cat)
        self.assertTrue(r["conflicts"])
        self.assertTrue(E.check_catalog(cat))


class MathTest(unittest.TestCase):
    def test_drip(self):
        d = E.drip(250, 50, 20)
        self.assertEqual(d["gtt_per_min"], 100)
        self.assertEqual(d["ml_per_hr"], 300)
        self.assertEqual(E.drip(0, 10)["gtt_per_min"], 0)

    def test_plan_dates(self):
        self.assertEqual(E.plan_dates("2026-11-16", 4, 2), ["2026-11-16", "2026-11-19", "2026-11-23", "2026-11-26"])
        self.assertEqual(E.plan_dates("2026-11-16", 3, 1), ["2026-11-16", "2026-11-23", "2026-11-30"])
        self.assertEqual(E.plan_dates("2026-11-16", 1, 0), ["2026-11-16"])

    def test_next_due(self):
        self.assertEqual(E.next_due([], "2026-11-16", 4, 2), "2026-11-16")
        self.assertEqual(E.next_due(["2026-11-16"], "2026-11-16", 4, 2), "2026-11-19")
        self.assertIsNone(E.next_due(["2026-11-16"], "2026-11-16", 1, 0))

    def test_ibs(self):
        self.assertEqual(E.ibs_sss(50, 5, 50, 50, 50)["total"], 250)
        self.assertEqual(E.ibs_sss(50, 5, 50, 50, 50)["grade"], "중간")
        self.assertEqual(E.ibs_subtype(30, 10), "C")
        self.assertEqual(E.ibs_subtype(10, 40), "D")
        self.assertEqual(E.ibs_subtype(30, 40), "M")
        self.assertEqual(E.ibs_subtype(10, 10), "U")

    def test_gut_oral_by_subtype(self):
        c = [r["sup"] for r in E.oral_plan("gut", subtype="C")["with"]]
        d = [r["sup"] for r in E.oral_plan("gut", subtype="D")["with"]]
        self.assertIn("psyllium", c)
        self.assertIn("probiotic_d", d)
        self.assertNotIn("psyllium", d)
        self.assertIn("glutamine", c)
        self.assertIn("peppermint", [r["sup"] for r in E.oral_plan("gut", subtype="D", focus=["pain"])["after"]])

    def test_emr_width(self):
        r = E.build_recipe("vitality", "premium", {"sbp": 98})
        t = E.emr_text({"total": 4}, {"n": 1, "vitals": {"sbp": 98, "dbp": 60}, "start_time": "10:00",
                                      "end_time": "10:45", "reactions": ["혈관통"]}, r)
        for line in t.split("\n"):
            self.assertLessEqual(E._w(line), E.EMR_WIDTH, line)
        self.assertIn("45분", t)
        self.assertIn("제외: 마시주", t)
        self.assertIn("2) N/S 100mL + 비치라이트", t)


class AppTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.app = SV.App(SV.DB(os.path.join(self.tmp.name, "t.sqlite3")))
        self.pid = self.app.add_patient({"chart_no": "S0001", "name": "홍길동"})["id"]

    def tearDown(self):
        self.tmp.cleanup()

    def test_course_flow_to_oral(self):
        cid = self.app.add_course(self.pid, {"program": "fatigue", "tier": "basic", "start_date": "2026-11-16"})["id"]
        co = self.app.course(cid)
        self.assertEqual(co["total"], 4)
        self.assertEqual(co["price"], 180000)
        for i, d in enumerate(["2026-11-16", "2026-11-19", "2026-11-23", "2026-11-26"]):
            res = self.app.add_session(cid, {"vitals": {"sbp": 120}, "d": d})
            self.assertEqual(res["n"], i + 1)
        self.assertEqual(self.app.course(cid)["status"], "경구유지")
        with self.assertRaises(ValueError):
            self.app.add_session(cid, {"vitals": {"sbp": 120}})

    def test_stop_needs_doctor(self):
        cid = self.app.add_course(self.pid, {"program": "cold", "tier": "basic"})["id"]
        with self.assertRaises(ValueError):
            self.app.add_session(cid, {"vitals": {"sbp": 120}, "checks": ["preg"]})
        res = self.app.add_session(cid, {"vitals": {"sbp": 120}, "checks": ["preg"], "doctor_ok": True})
        self.assertEqual(res["n"], 1)

    def test_session_records_removed(self):
        cid = self.app.add_course(self.pid, {"program": "cold", "tier": "basic"})["id"]
        res = self.app.add_session(cid, {"vitals": {"sbp": 95}})
        self.assertIn("마시주", res["emr"])
        s = self.app.course(cid)["sessions"][0]
        self.assertTrue(s["recipe"]["removed"])

    def test_delete_session_renumbers(self):
        cid = self.app.add_course(self.pid, {"program": "immune", "tier": "premium", "start_date": "2026-11-16"})["id"]
        ids = [self.app.add_session(cid, {"vitals": {"sbp": 120}, "d": d})["id"]
               for d in ["2026-11-16", "2026-11-19", "2026-11-23"]]
        self.app.delete_session(ids[0])
        self.assertEqual([s["n"] for s in self.app.course(cid)["sessions"]], [1, 2])

    def test_gut_course_scores_and_refill_board(self):
        cid = self.app.add_course(self.pid, {"program": "gut", "tier": "basic", "subtype": "C",
                                             "focus": ["pain"], "start_date": "2026-11-16",
                                             "meds": "리나클로타이드"})["id"]
        co = self.app.course(cid)
        sups = [r["sup"] for r in co["oral_plan"]["with"]]
        self.assertIn("psyllium", sups)
        s = self.app.add_score(cid, {"d": "2026-11-16", "detail": {"pain": 60, "pain_days": 6, "bloat": 50,
                                                                   "bowel_unsat": 70, "life": 60}})
        self.assertEqual(s["value"], 300)
        self.assertEqual(s["grade"], "심함")
        self.app.add_oral(cid, {"sup": "glutamine", "packs": 1, "d": "2026-11-16"})
        b = self.app.board(days=7, on="2026-12-12")
        self.assertTrue(any(r["sup"] == "glutamine" for r in b["refill"]))
        self.assertTrue(any(r["course_id"] == cid for r in b["due"]))  # 4회 중 0회 → 지남
        self.assertTrue(any(r["week"] == 4 for r in b["followup"]))

    def test_change_subtype_rebuilds_plan(self):
        cid = self.app.add_course(self.pid, {"program": "gut", "tier": "basic", "subtype": "C"})["id"]
        self.app.update_course(cid, {"subtype": "D"})
        sups = [r["sup"] for r in self.app.course(cid)["oral_plan"]["with"]]
        self.assertIn("probiotic_d", sups)
        self.assertNotIn("psyllium", sups)

    def test_settings_override_price(self):
        self.app.set_catalog({"programs": {"dizzy": {"tiers": {"basic": {"price": 47000}}}}})
        cid = self.app.add_course(self.pid, {"program": "dizzy", "tier": "basic", "option": 0})["id"]
        self.assertEqual(self.app.course(cid)["price"], 47000)
        cat = self.app.set_catalog({"reset": True})
        self.assertEqual(cat["programs"]["dizzy"]["tiers"]["basic"]["price"], 50000)

    def test_tier_must_exist_for_program(self):
        with self.assertRaises(ValueError):
            self.app.add_course(self.pid, {"program": "fatigue", "tier": "plus"})
        self.assertTrue(self.app.add_course(self.pid, {"program": "gi", "tier": "plus"})["id"])

    def test_bad_input(self):
        with self.assertRaises(ValueError):
            self.app.add_patient({"name": "x"})
        with self.assertRaises(ValueError):
            self.app.add_course(self.pid, {"program": "nope"})
        with self.assertRaises(KeyError):
            self.app.add_course(9999, {"program": "gi"})


class HttpTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        app = SV.App(SV.DB(os.path.join(cls.tmp.name, "h.sqlite3")))
        cls.srv = SV.ThreadingHTTPServer(("127.0.0.1", 0), SV.make_handler(app))
        cls.port = cls.srv.server_address[1]
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()
        cls.srv.server_close()
        cls.tmp.cleanup()

    def req(self, method, path, body=None):
        data = json.dumps(body).encode() if body is not None else None
        r = urllib.request.Request("http://127.0.0.1:%d%s" % (self.port, path), data=data, method=method,
                                   headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(r) as f:
                return f.status, f.read()
        except urllib.error.HTTPError as e:
            return e.code, e.read()

    def test_index_and_api(self):
        code, body = self.req("GET", "/")
        self.assertEqual(code, 200)
        self.assertIn("웰빙내과 수액실".encode(), body)
        code, body = self.req("GET", "/api/catalog")
        self.assertEqual(json.loads(body)["programs"]["gi"]["name"], "장염")
        code, body = self.req("POST", "/api/preview", {"program": "gi", "tier": "plus", "vitals": {"sbp": 99}})
        j = json.loads(body)
        self.assertEqual(code, 200)
        self.assertGreater(j["drip"]["gtt_per_min"], 0)
        code, body = self.req("POST", "/api/patients", {"name": "x"})
        self.assertEqual(code, 400)
        code, _ = self.req("GET", "/api/nothing")
        self.assertEqual(code, 404)


if __name__ == "__main__":
    unittest.main()
