"""
Extract a trained sklearn DecisionTreeClassifier into a portable JSON
representation that the TypeScript runtime can traverse without needing
Python at all. One-shot conversion; the JSON ships in the repo.

Usage:
    python scripts/extract-tree.py \\
        --pkl  risk_tree.pkl \\
        --meta risk_tree_meta.json \\
        --out  lib/scoring/ml/risk-tree.json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import joblib


def export_tree(clf, feature_names: list[str], meta: dict) -> dict:
    """Walk the underlying tree_ struct and emit a flat node array.

    Each non-leaf node carries its split feature index, threshold, and the
    indices of its left/right children. Leaves carry per-class probabilities
    drawn from the training-set class fractions in that leaf.
    """
    t = clf.tree_

    nodes: list[dict[str, Any]] = []
    for i in range(t.node_count):
        is_leaf = t.children_left[i] == -1 and t.children_right[i] == -1
        # value[i] has shape (1, n_classes) — counts of training samples per class in this node
        counts = t.value[i][0].tolist()
        total = sum(counts) or 1.0
        probs = [c / total for c in counts]

        nodes.append(
            {
                "id": i,
                "is_leaf": bool(is_leaf),
                # -2 is sklearn's sentinel for leaves; we surface -1 for cleaner TS
                "feature": int(t.feature[i]) if not is_leaf else -1,
                "threshold": float(t.threshold[i]) if not is_leaf else 0.0,
                "left": int(t.children_left[i]) if not is_leaf else -1,
                "right": int(t.children_right[i]) if not is_leaf else -1,
                "samples": int(t.n_node_samples[i]),
                "class_probabilities": probs,
            }
        )

    classes = clf.classes_.tolist() if hasattr(clf, "classes_") else [0, 1]

    return {
        "model_type": clf.__class__.__name__,
        "criterion": clf.criterion,
        "max_depth_actual": int(t.max_depth),
        "n_classes": int(t.n_classes[0]) if hasattr(t, "n_classes") else len(classes),
        "classes": classes,
        "feature_names": feature_names,
        "n_features": len(feature_names),
        "n_nodes": int(t.node_count),
        "nodes": nodes,
        "training_metadata": {
            "n_train_rows": meta.get("n_train_rows"),
            "n_positive": meta.get("n_positive"),
            "n_negative": meta.get("n_negative"),
            "train_accuracy": meta.get("train_accuracy"),
            "max_depth": meta.get("max_depth"),
            "min_samples_leaf": meta.get("min_samples_leaf"),
            "class_weight": meta.get("class_weight"),
            "sklearn_version": meta.get("sklearn_version"),
        },
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--pkl", required=True, type=Path)
    ap.add_argument("--meta", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    args = ap.parse_args()

    if not args.pkl.exists():
        print(f"ERROR: pickle not found at {args.pkl}", file=sys.stderr)
        return 2
    if not args.meta.exists():
        print(f"ERROR: meta not found at {args.meta}", file=sys.stderr)
        return 2

    print(f"Loading model from {args.pkl} ...", file=sys.stderr)
    # Use joblib rather than vanilla pickle — sklearn artefacts include
    # numpy arrays and joblib handles version-shift edge cases better,
    # particularly across the numpy 1.x → 2.x dtype change.
    clf = joblib.load(args.pkl)

    with args.meta.open("r", encoding="utf-8") as f:
        meta = json.load(f)

    feature_names = meta.get("feature_names", [])
    if not feature_names:
        print("ERROR: meta is missing feature_names", file=sys.stderr)
        return 2

    if hasattr(clf, "n_features_in_") and clf.n_features_in_ != len(feature_names):
        print(
            f"ERROR: feature count mismatch — clf expects {clf.n_features_in_}, "
            f"meta says {len(feature_names)}",
            file=sys.stderr,
        )
        return 2

    payload = export_tree(clf, feature_names, meta)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    print(
        f"OK · {payload['n_nodes']} nodes · depth {payload['max_depth_actual']} · "
        f"{payload['n_features']} features · wrote {args.out}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
