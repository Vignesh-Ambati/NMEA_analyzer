"""
core/cache.py
─────────────
Temporary on-disk cache used to store split NMEA message streams
between the processing stage and the query/plot stage.
"""

import os
import tempfile
import shutil


class DataCache:
    def __init__(self):
        base_dir = os.getcwd()
        self.temp_directory = os.path.join(base_dir, ".logcache")
        os.makedirs(self.temp_directory, exist_ok=True)

        self.temp_dir = tempfile.mkdtemp(
            prefix=".logcache_",
            dir=self.temp_directory
        )

    def path(self, name):
        return os.path.join(self.temp_dir, name)

    def cleanup(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)