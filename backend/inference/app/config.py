import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    project_id: str = os.environ.get("GOOGLE_CLOUD_PROJECT", "demo-signova")
    # Face crops are ~50 KB; anything bigger is refused before it is read (plan 03 Task 4.2).
    max_content_length: int = 64 * 1024
