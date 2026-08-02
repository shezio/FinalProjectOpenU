#!/usr/bin/env python3
"""
PT F11 — Viewer-write guard-coverage check.

Fails (exit 1) if any state-changing endpoint (@api_view with POST/PUT/PATCH/DELETE) is missing the
@block_viewer_writes guard. Pure Python standard library (ast) — NO Django, no venv, no pip, no DB.
Runs in seconds.

Wired as a GATING job in .github/workflows/azure-deploy.yml (the deploy job `needs:` it), so a missing
guard fails the build BEFORE publish — production is never touched. It deliberately does NOT run inside
the running app, so it can never cause a runtime outage.

If you add a genuinely PUBLIC / unauthenticated write endpoint (no session — a Viewer can't reach it as
a Viewer anyway), add its function name to ALLOWLIST below. Keep that list tight.
"""
import ast
import os
import sys

APP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "childsmile", "childsmile_app")

WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

# Public / unauthenticated / auth-flow / webhook writes that legitimately carry NO
# @block_viewer_writes (no session, so a Viewer role can't reach them as a Viewer).
ALLOWLIST = {
    "login_email",
    "verify_totp",
    "google_login_success",
    "logout_view",
    "register_send_totp",
    "register_verify_totp",
    "audit_action",
    "whatsapp_incoming",
    "submit_activity_request",
    "submit_voucher_questionnaire",
}


def _decorator_name(dec):
    """Simple name of a decorator node — handles @name, @name(...), and @module.name."""
    node = dec.func if isinstance(dec, ast.Call) else dec
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return node.attr
    return None


def _api_view_methods(dec):
    """HTTP methods (upper-case) declared by an @api_view(...) decorator.

    Recognises both the positional form `@api_view(["POST"])` and the keyword form
    `@api_view(http_method_names=["POST"])`. Returns an empty set for non-api_view decorators.
    """
    if not isinstance(dec, ast.Call) or _decorator_name(dec) != "api_view":
        return set()
    method_lists = list(dec.args)
    for kw in dec.keywords:
        if kw.arg in (None, "http_method_names"):
            method_lists.append(kw.value)
    methods = set()
    for arg in method_lists:
        if isinstance(arg, (ast.List, ast.Tuple)):
            for el in arg.elts:
                if isinstance(el, ast.Constant) and isinstance(el.value, str):
                    methods.add(el.value.upper())
    return methods


def scan_file(path):
    """Return [(function_name, [write_methods])] for write endpoints missing the guard."""
    with open(path, "r", encoding="utf-8") as fh:
        try:
            tree = ast.parse(fh.read(), filename=path)
        except SyntaxError as exc:
            print(f"   ! could not parse {path}: {exc}")
            return []
    violations = []
    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        dec_names, methods = set(), set()
        for dec in node.decorator_list:
            name = _decorator_name(dec)
            if name:
                dec_names.add(name)
            methods |= _api_view_methods(dec)
        writes = methods & WRITE_METHODS
        if not writes or node.name in ALLOWLIST:
            continue
        if "block_viewer_writes" not in dec_names:
            violations.append((node.name, sorted(writes)))
    return violations


def main():
    if not os.path.isdir(APP_DIR):
        print(f"ERROR: app dir not found: {APP_DIR}")
        return 2
    found = []
    for fname in sorted(os.listdir(APP_DIR)):
        if fname.endswith(".py"):
            for name, writes in scan_file(os.path.join(APP_DIR, fname)):
                found.append((fname, name, writes))
    if found:
        print("PT F11 guard-coverage FAILED - write endpoint(s) missing @block_viewer_writes:")
        for fname, name, writes in found:
            print(f"   - {fname}: {name}  ({'/'.join(writes)})")
        print()
        print("Fix: add @block_viewer_writes as the INNERMOST decorator (directly above `def`,")
        print("below @api_view). If the endpoint is genuinely public/unauthenticated, add its")
        print("function name to ALLOWLIST in check_viewer_guards.py.")
        return 1
    print("PT F11 guard-coverage OK - every authenticated write endpoint carries @block_viewer_writes.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
