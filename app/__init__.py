import sys
import pathlib

# Determine repository root (two levels up from this file)
_repo_root = pathlib.Path(__file__).resolve().parent.parent
_backend_app_path = _repo_root / "backend" / "app"
# Ensure the backend/app directory is on sys.path for absolute imports
if str(_backend_app_path) not in sys.path:
    sys.path.insert(0, str(_backend_app_path))
# Extend this package's __path__ so submodules like app.services are discoverable
__path__.append(str(_backend_app_path))
