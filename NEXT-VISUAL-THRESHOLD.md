# What 2.7 proves and what would come next

2.7 proves the architecture can stop treating an upload as one indivisible bitmap.

The next visual ceiling is not another CSS pass. It is stronger model-backed asset intelligence:
- SAM2 or Grounded-SAM for semantic masks
- pose-conditioned consistent character-sheet generation
- depth models for actual 2.5D geometry
- image-to-3D / mesh generation for selected PLX classes
- asynchronous GPU asset jobs
- automatic sprite atlas validation and edge QA
- per-asset regenerate / approve controls

The provider boundaries in 2.7 are intentionally designed so those systems can replace the local OpenCV implementations without replacing the PLX contract.
