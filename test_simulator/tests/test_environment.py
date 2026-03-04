"""
Environment and structure tests: imports, file layout, syntax, HTML/JS structure.
No server required (except TestSimulatorBundleServed). Integrates checks from the former tests_archive test_all.py.
"""
import os
import sys
import pytest

try:
    import requests
except ImportError:
    requests = None

# Simulator root = parent of tests/
TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
SIMULATOR_ROOT = os.path.dirname(TESTS_DIR)


def _path(*parts):
    return os.path.join(SIMULATOR_ROOT, *parts)


class TestFileStructure:
    """Required files and directories exist."""

    def test_web_server_exists(self):
        assert os.path.isfile(_path("web_server.py"))

    def test_main_exists(self):
        assert os.path.isfile(_path("main.py"))

    def test_virtual_tv_exists(self):
        assert os.path.isfile(_path("virtual_tv.py"))

    def test_ipc_server_exists(self):
        assert os.path.isfile(_path("ipc_server.py"))

    def test_index_html_exists(self):
        assert os.path.isfile(_path("web_templates", "index.html"))

    def test_tv_simulator_js_exists(self):
        # Modular simulator: simulator/main.js and globals.js
        base = _path("web_static", "js", "simulator")
        assert os.path.isdir(base), "simulator/ directory missing"
        assert os.path.isfile(os.path.join(base, "main.js")), "simulator/main.js missing"


class TestPythonSyntax:
    """Python files compile without syntax errors."""

    @pytest.mark.parametrize("relpath", ["web_server.py", "main.py", "virtual_tv.py", "ipc_server.py"])
    def test_syntax(self, relpath):
        path = _path(relpath)
        if not os.path.exists(path):
            pytest.skip(f"File not found: {relpath}")
        with open(path, "r", encoding="utf-8") as f:
            compile(f.read(), path, "exec")


class TestImports:
    """Required Python modules can be imported."""

    def test_flask_import(self):
        import flask  # noqa: F401

    def test_flask_socketio_import(self):
        import flask_socketio  # noqa: F401

    def test_socketio_client_import(self):
        import socketio  # noqa: F401

    @pytest.mark.parametrize("module", ["pygame"])
    def test_optional_imports(self, module):
        try:
            __import__(module)
        except ImportError:
            pytest.skip(f"{module} not installed")


class TestWebServerModule:
    """Web server module has expected symbols."""

    def test_web_server_loadable(self):
        path = _path("web_server.py")
        if not os.path.isfile(path):
            pytest.skip("web_server.py not found")
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        for name in ["handle_button_press", "start_ipc_listener", "app"]:
            assert name in content, f"Expected '{name}' in web_server.py"


class TestHTMLStructure:
    """index.html contains required elements and script references."""

    def test_html_has_required_elements(self):
        path = _path("web_templates", "index.html")
        if not os.path.isfile(path):
            pytest.skip("index.html not found")
        with open(path, "r", encoding="utf-8") as f:
            content = f.read().lower()
        required = [
            "<!doctype html>",
            "<html",
            "<head>",
            "<body>",
            "canvas-container",
            "simulator/",
            "three.js",
            "socket.io",
        ]
        for element in required:
            assert element in content, f"Missing in index.html: {element}"


class TestJSStructure:
    """Simulator modules contain expected function names."""

    def test_js_has_expected_functions(self):
        base = _path("web_static", "js", "simulator")
        if not os.path.isdir(base):
            pytest.skip("simulator/ not found")
        content = ""
        for name in os.listdir(base):
            if name.endswith(".js"):
                with open(os.path.join(base, name), "r", encoding="utf-8") as f:
                    content += f.read()
        required = [
            "initSocket",
            "initScene",
            "createTV",
            "createRoom",
            "updateTVScreen",
            "animate",
        ]
        for fn in required:
            assert (
                f"function {fn}" in content or f"{fn}()" in content or f"{fn} (" in content
            ), f"Expected '{fn}' in simulator modules"


class TestSimulatorBundle:
    """Simulator JS bundle is complete and loadable (infra: ensures split modules work)."""

    REQUIRED_MODULES = [
        "globals.js",
        "socket-state.js",
        "utils.js",
        "animations.js",
        "ir.js",
        "preset.js",
        "scene.js",
        "ir-remote.js",
        "shows.js",
        "screen.js",
        "controls.js",
        "room-devices.js",
        "main.js",
    ]

    def test_simulator_module_files_exist(self):
        """All required simulator JS modules exist on disk."""
        base = _path("web_static", "js", "simulator")
        assert os.path.isdir(base), "simulator/ directory missing"
        for name in self.REQUIRED_MODULES:
            path = os.path.join(base, name)
            assert os.path.isfile(path), f"Missing simulator module: {name}"

    def test_index_loads_simulator_modules_in_order(self):
        """index.html references all simulator modules in dependency order."""
        path = _path("web_templates", "index.html")
        assert os.path.isfile(path), "index.html missing"
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        for name in self.REQUIRED_MODULES:
            assert name in content, f"index.html should load simulator/{name}"
        # main.js must load last (entry point)
        assert content.index("main.js") > content.index("room-devices.js"), (
            "main.js should load after room-devices.js"
        )

    def test_simulator_bundle_has_bootstrap_symbols(self):
        """Bundle defines symbols needed to bootstrap (initScene, initSocket, animate)."""
        base = _path("web_static", "js", "simulator")
        if not os.path.isdir(base):
            pytest.skip("simulator/ not found")
        combined = ""
        for name in self.REQUIRED_MODULES:
            p = os.path.join(base, name)
            if os.path.isfile(p):
                with open(p, "r", encoding="utf-8") as f:
                    combined += f.read()
        assert "function initScene" in combined or "initScene()" in combined
        assert "function initSocket" in combined or "initSocket()" in combined
        assert "function animate" in combined
        assert "DOMContentLoaded" in combined
        assert "updateTVScreen" in combined


class TestSimulatorBundleServed:
    """When server is running, main page and simulator JS are served and loadable (infra)."""

    BASE = "http://localhost:5000"

    def _get(self, path, timeout=3):
        if requests is None:
            pytest.skip("requests not installed")
        try:
            r = requests.get(self.BASE + path, timeout=timeout)
            return r
        except Exception:
            return None

    def test_main_page_returns_200(self):
        """GET / returns 200 and HTML with canvas-container."""
        r = self._get("/")
        if r is None or r.status_code != 200:
            pytest.skip("Server not running (start with: poetry run web-server)")
        assert "text/html" in (r.headers.get("content-type") or "").lower()
        assert b"canvas-container" in r.content or b"canvas" in r.content

    def test_simulator_js_modules_served(self):
        """Simulator JS modules are served with 200 and non-empty body."""
        r = self._get("/")
        if r is None or r.status_code != 200:
            pytest.skip("Server not running")
        for name in TestSimulatorBundle.REQUIRED_MODULES:
            path = f"/static/js/simulator/{name}"
            js = self._get(path)
            if js is None:
                pytest.skip("Server not running")
            assert js.status_code == 200, f"{path} should return 200, got {js.status_code}"
            assert len(js.content) > 0, f"{path} should be non-empty"
            # Stub files (e.g. shows.js) may be comment-only; any non-empty .js is valid
            assert (
                b"function" in js.content
                or b"var " in js.content
                or b"const " in js.content
                or b"/*" in js.content
                or b"//" in js.content
            ), f"{path} should look like JS (code or comment)"
