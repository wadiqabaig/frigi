# Retrained RF-DETR Small (Run 1)

This folder holds the results for the retrained RF-DETR Small detector that replaces the submitted one. The notebooks are in `detection/notebooks`:

- `Final_ICT304_Assignment_RFDETR_Retrain_Run1_Colab.ipynb`: the executed training and validation run.
- `Final_ICT304_Assignment_RFDETR_FinalTest_Run1_Colab.ipynb`: the executed, single locked final test and the comparison with the submitted model.

## What changed from the submitted run

Same dataset, splits, 42 classes, input size (512 px) and evaluator. The training changes are:

- No 60-minute cap. The submitted run stopped after about ten epochs; this one trained up to 60 epochs and early stopping ended it at epoch 34 (47 minutes on an A100).
- EMA weights, multi-scale training and scale jitter turned back on (RF-DETR defaults that the submitted run had disabled).
- Batch 16 with no gradient accumulation (same effective batch of 16), patience 12.

I also trained RF-DETR Large at 704 px as a second run. It scored 63.1% validation mAP50-95 against 63.5% for this run, so by the rule set before testing, this run went to the final test.

## Final test results (same 97 test images)

| Metric | Submitted | Retrained (Run 1) |
|---|---|---|
| mAP50-95 | 62.18% | 63.84% |
| mAP50 | 94.02% | 93.44% |
| Box precision / recall | 89.43% / 93.21% | 90.37% / 93.99% |
| Ingredient F1 | 96.98% | 97.94% |
| Wrong ingredients listed | 26 | 19 |
| Missed ingredients | 21 | 13 |

Both models were scored with the same evaluator at their frozen 0.30 confidence threshold. Per-class results are in `final_test/per_class_comparison_with_submitted.csv`.

## Using the new weights in the backend

The weights are not in Git (they are too large and `.gitignore` excludes `*.pth`). They are on Google Drive at:

`ICT304/Group Assignment Submission/Code/retraining_runs/training_runs/rfdetr/20261104T152521Z_4d67d2/native/checkpoint_best_total.pth`

SHA-256: `87e480aee98e90e43f00e717d76e06cd50c168d2cd64682ffe1f37d5f0fa75e4`

It is a drop-in replacement: same 42 classes in the same order, same 512 px input and same 0.30 threshold, so no backend code changes are needed. Copy it to `backend/weights/checkpoint_best_total.pth` locally and on the server, then restart the API.

## Files

- `training/`: run configuration, final state, per-epoch metrics and the resolved RF-DETR training config.
- `validation/`: validation metrics, threshold table, frozen settings used for the test, and the confusion matrix.
- `final_test/`: test metrics, the frozen settings that were checked before testing, and the comparison tables with the submitted model.
