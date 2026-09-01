import sys
import os
from pathlib import Path
import shutil


def setup_pycache():
    # Skip if already configured in this process
    if os.environ.get('_PYCACHE_SETUP_DONE'):
        return
    
    # Mark as configured
    os.environ['_PYCACHE_SETUP_DONE'] = '1'
    
    project_root = Path(__file__).resolve().parent
    cache_dir = project_root / "cache"
    cache_dir.mkdir(exist_ok=True)
    sys.pycache_prefix = str(cache_dir)

    os.environ['PYTHONPYCACHEPREFIX'] = str(cache_dir)
    _cleanup_existing_pycache(project_root)
    print(f"Pycache configured: {cache_dir}")

def _cleanup_existing_pycache(root_dir: Path) -> None:
    pycache_dirs = list(root_dir.rglob("__pycache__"))
    if pycache_dirs:
        for pycache_dir in pycache_dirs:
            try:
                shutil.rmtree(pycache_dir)
                print(f"Removed: {pycache_dir.relative_to(root_dir)}")
            except Exception as e:
                print(f"Failed to remove {pycache_dir}: {e}")
    else:
        print("No existing __pycache__ directories found")

setup_pycache()